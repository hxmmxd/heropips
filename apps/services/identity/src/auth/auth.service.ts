import { randomUUID } from "node:crypto";
import {
  IDENTITY_EVENTS,
  LoginReq,
  RedeemAccessReq,
  type AuthSessionRes,
  type SessionUserRes,
  type SessionsRes,
} from "@heropips/contracts";
import { audit } from "../common/audit";
import type { IdentityConfig } from "../common/config";
import {
  DUMMY_HASH_PROMISE,
  hashPassword,
  newSessionToken,
  sameDigestHex,
  sha256Hex,
  verifyPassword,
} from "../common/crypto";
import { ApiException } from "../common/errors";
import type { RequestMeta } from "../common/http";
import { TokenBucket } from "../common/rate-limit";
import { identityEvent } from "../outbox/outbox.service";
import type { IdentityRepo, SessionRow, UserRow } from "../db/repo";

/** billing-svc POST /v1/founding/verify — tests inject a fake. */
export interface FoundingVerifier {
  verify(email: string, orderId: string): Promise<{ ok: boolean; sku?: string }>;
}

export type AuthContext = { user: UserRow; session: SessionRow; tokenSha256: string };

/** Sliding-expiry write is throttled: at most one UPDATE per session per minute. */
const TOUCH_INTERVAL_MS = 60_000;

export class AuthService {
  private readonly redeemByIp: TokenBucket;
  private readonly loginByIp: TokenBucket;
  private readonly loginByEmail: TokenBucket;
  /**
   * Admin-issued codes, folded once. The comparison has to be
   * case-insensitive — mobile keyboards auto-capitalise the first character of
   * a hand-typed code, which used to come back as "code not recognized".
   */
  private readonly compedCodes: readonly string[];

  constructor(
    private readonly repo: IdentityRepo,
    private readonly cfg: IdentityConfig,
    private readonly billing: FoundingVerifier,
    private readonly now: () => Date = () => new Date(),
  ) {
    const clock = (): number => this.now().getTime();
    this.redeemByIp = new TokenBucket(5, 60_000, clock);
    this.loginByIp = new TokenBucket(10, 60_000, clock);
    this.loginByEmail = new TokenBucket(5, 60_000, clock);
    this.compedCodes = cfg.earlyAccessCodes.map((c) => c.toLowerCase());
  }

  /* ---------- redeem / login ---------- */

  async redeem(input: unknown, meta: RequestMeta): Promise<AuthSessionRes> {
    if (!this.redeemByIp.allow(meta.ip ?? "unknown")) {
      throw new ApiException(429, "rate_limited", "Too many attempts. Try again in a minute.");
    }
    const parsed = RedeemAccessReq.safeParse(input);
    if (!parsed.success) {
      throw new ApiException(422, "validation_failed", parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    const req = parsed.data;

    // Founding purchase first; admin-issued env codes as fallback.
    let verified: { ok: boolean; sku?: string };
    try {
      verified = await this.billing.verify(req.email, req.access_code);
    } catch {
      verified = { ok: false };
    }
    if (!verified.ok && !this.compedCodes.includes(req.access_code.toLowerCase())) {
      // billing answers one opaque {ok:false} for "no such order", "wrong
      // email" and "not paid yet" alike, so the remediation has to name both
      // inputs — a mismatched email is the common case and it is NOT the field
      // this error points at.
      throw new ApiException(
        401,
        "access_code_invalid",
        "That code and email don't match a Founding order.",
        "Use the order id from your order status page together with the email you paid with.",
      );
    }

    const at = this.now();
    // Past the guard, both paths are entitled: a verified founding purchase or an
    // admin-issued env code (a comped founding grant). Audit keeps the `via` split.
    const user: UserRow = {
      id: randomUUID(),
      email: req.email,
      passwordHash: await hashPassword(req.password),
      displayName: req.display_name,
      role: "member",
      founding: true,
      packageSku: verified.sku ?? "ltd_founding",
      createdAt: at,
    };
    const created = await this.repo.createUser(user);
    if (created === "duplicate_email") {
      throw new ApiException(
        409,
        "forbidden",
        "An account with this email already exists.",
        "Sign in with that email instead.",
      );
    }

    const session = await this.issueSession(user, meta);
    await audit(
      this.repo,
      this.now(),
      user.id,
      "auth.redeemed",
      user.id,
      {
        via: verified.ok ? "billing" : "access_code",
        founding: verified.ok,
      },
      [
        identityEvent(IDENTITY_EVENTS.userRegistered, {
          user_id: user.id,
          email: user.email,
          display_name: user.displayName,
          founding: user.founding,
          package_sku: user.packageSku,
        }),
      ],
    );
    return session;
  }

  async login(input: unknown, meta: RequestMeta): Promise<AuthSessionRes> {
    const parsed = LoginReq.safeParse(input);
    if (!parsed.success) {
      throw new ApiException(422, "validation_failed", "Invalid input.");
    }
    const req = parsed.data;
    if (!this.loginByIp.allow(meta.ip ?? "unknown") || !this.loginByEmail.allow(req.email)) {
      throw new ApiException(429, "rate_limited", "Too many attempts. Try again in a minute.");
    }

    const user = await this.repo.getUserByEmail(req.email);
    // Unknown email verifies against a dummy hash: same scrypt cost, and the
    // 401 body below is byte-identical for unknown-email vs wrong-password.
    const ok = await verifyPassword(req.password, user?.passwordHash ?? (await DUMMY_HASH_PROMISE));
    if (!user || !ok) {
      throw new ApiException(401, "auth_invalid_credentials", "Invalid email or password.");
    }

    const session = await this.issueSession(user, meta);
    await audit(this.repo, this.now(), user.id, "auth.login", user.id, { ip: meta.ip });
    return session;
  }

  /* ---------- session lifecycle ---------- */

  private async issueSession(user: UserRow, meta: RequestMeta): Promise<AuthSessionRes> {
    const { token, sha256 } = newSessionToken();
    const at = this.now();
    const expiresAt = new Date(at.getTime() + this.cfg.sessionTtlMs);
    await this.repo.createSession({
      id: randomUUID(),
      userId: user.id,
      tokenSha256: sha256,
      createdAt: at,
      lastSeenAt: at,
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { token, expires_at: expiresAt.toISOString(), user: toSessionUser(user) };
  }

  /**
   * Hot path (every authed request across the platform introspects here):
   * one indexed lookup by token_sha256; the sliding-expiry write is throttled.
   */
  async resolveToken(token: string): Promise<AuthContext | null> {
    const tokenSha256 = sha256Hex(token);
    const found = await this.repo.getSessionWithUser(tokenSha256);
    if (!found) return null;
    const { session, user } = found;
    const at = this.now();
    if (session.revokedAt !== null || session.expiresAt.getTime() <= at.getTime()) return null;
    if (at.getTime() - session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS) {
      const expiresAt = new Date(at.getTime() + this.cfg.sessionTtlMs);
      await this.repo.touchSession(session.id, at, expiresAt);
      session.lastSeenAt = at;
      session.expiresAt = expiresAt;
    }
    return { user, session, tokenSha256 };
  }

  async requireSession(authorization: string | undefined): Promise<AuthContext> {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    const ctx = token ? await this.resolveToken(token) : null;
    if (!ctx) {
      throw new ApiException(401, "session_expired", "Session is invalid or expired.", "Log in again.");
    }
    return ctx;
  }

  async introspect(authorization: string | undefined): Promise<SessionUserRes> {
    const ctx = await this.requireSession(authorization);
    return toSessionUser(ctx.user);
  }

  async logout(authorization: string | undefined): Promise<{ ok: true }> {
    const ctx = await this.requireSession(authorization);
    await this.repo.revokeSession(ctx.session.id, ctx.user.id, this.now());
    await audit(this.repo, this.now(), ctx.user.id, "auth.logout", ctx.session.id, null);
    return { ok: true };
  }

  async sessions(authorization: string | undefined): Promise<SessionsRes> {
    const ctx = await this.requireSession(authorization);
    const rows = await this.repo.listSessions(ctx.user.id, this.now());
    return {
      sessions: rows.map((s) => ({
        id: s.id,
        created_at: s.createdAt.toISOString(),
        last_seen_at: s.lastSeenAt.toISOString(),
        ip: s.ip,
        user_agent: s.userAgent,
        current: sameDigestHex(s.tokenSha256, ctx.tokenSha256),
      })),
    };
  }

  async revokeSessionById(authorization: string | undefined, id: string): Promise<{ ok: true }> {
    const ctx = await this.requireSession(authorization);
    const revoked = await this.repo.revokeSession(id, ctx.user.id, this.now());
    if (!revoked) {
      throw new ApiException(404, "forbidden", "Session not found.");
    }
    await audit(this.repo, this.now(), ctx.user.id, "auth.session.revoked", id, null);
    return { ok: true };
  }
}

export function toSessionUser(user: UserRow): SessionUserRes {
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    role: user.role,
    founding: user.founding,
    created_at: user.createdAt.toISOString(),
  };
}
