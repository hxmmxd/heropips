import { z } from "zod";
import {
  PACKAGES,
  type AuditListRes,
  type PackageRes,
  type SessionUserRes,
} from "@heropips/contracts";
import { audit } from "../common/audit";
import { decodeCursor, encodeCursor } from "../common/cursor";
import { hashPassword, verifyPassword } from "../common/crypto";
import { ApiException } from "../common/errors";
import type { IdentityRepo } from "../db/repo";
import { AuthService, toSessionUser } from "../auth/auth.service";

const UpdateMeReq = z.object({ display_name: z.string().trim().min(2).max(40) });
const ChangePasswordReq = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(10).max(200),
});

const AUDIT_PAGE_SIZE = 50;

export class MeService {
  constructor(
    private readonly repo: IdentityRepo,
    private readonly auth: AuthService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async me(authorization: string | undefined): Promise<SessionUserRes> {
    return this.auth.introspect(authorization);
  }

  async updateProfile(authorization: string | undefined, input: unknown): Promise<SessionUserRes> {
    const ctx = await this.auth.requireSession(authorization);
    const parsed = UpdateMeReq.safeParse(input);
    if (!parsed.success) {
      throw new ApiException(422, "validation_failed", "display_name must be 2-40 characters.");
    }
    await this.repo.setDisplayName(ctx.user.id, parsed.data.display_name);
    await audit(this.repo, this.now(), ctx.user.id, "me.updated", ctx.user.id, {
      display_name: parsed.data.display_name,
    });
    return toSessionUser({ ...ctx.user, displayName: parsed.data.display_name });
  }

  async changePassword(authorization: string | undefined, input: unknown): Promise<{ ok: true }> {
    const ctx = await this.auth.requireSession(authorization);
    const parsed = ChangePasswordReq.safeParse(input);
    if (!parsed.success) {
      throw new ApiException(422, "validation_failed", "New password must be at least 10 characters.");
    }
    const ok = await verifyPassword(parsed.data.current_password, ctx.user.passwordHash);
    if (!ok) {
      throw new ApiException(401, "auth_invalid_credentials", "Current password is incorrect.");
    }
    await this.repo.setPasswordHash(ctx.user.id, await hashPassword(parsed.data.new_password));
    const revoked = await this.repo.revokeOtherSessions(ctx.user.id, ctx.session.id, this.now());
    await audit(this.repo, this.now(), ctx.user.id, "auth.password.changed", ctx.user.id, {
      revoked_sessions: revoked,
    });
    return { ok: true };
  }

  async auditList(authorization: string | undefined, cursor: string | undefined): Promise<AuditListRes> {
    const ctx = await this.auth.requireSession(authorization);
    const rows = await this.repo.listAudit(ctx.user.id, AUDIT_PAGE_SIZE + 1, decodeCursor(cursor));
    const hasMore = rows.length > AUDIT_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, AUDIT_PAGE_SIZE) : rows;
    const last = page[page.length - 1];
    return {
      entries: page.map((r) => ({
        id: r.id,
        actor_id: r.actorId,
        action: r.action,
        target: r.target,
        meta: r.meta,
        created_at: r.createdAt.toISOString(),
      })),
      next_cursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  }

  async packageInfo(authorization: string | undefined): Promise<PackageRes> {
    const ctx = await this.auth.requireSession(authorization);
    return PACKAGES[ctx.user.packageSku] ?? PACKAGES.ltd_founding;
  }
}
