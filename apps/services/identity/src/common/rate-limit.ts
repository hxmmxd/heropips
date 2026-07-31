import { createHash } from "node:crypto";
import { SetMetadata, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { ApiException } from "./errors";
import { bearerHeader, clientIp, type HttpRequest } from "./http";

/**
 * In-memory token bucket keyed by ip / email / user id.
 * capacity tokens per window, refilled continuously; no timers — refill is
 * computed lazily on each check from an injectable clock (tests pass a fake).
 */
export class TokenBucket {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Consume one token for `key`. false = rate limited. */
  allow(key: string): boolean {
    const at = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= 100_000) this.sweep(at);
      bucket = { tokens: this.capacity, updatedAt: at };
      this.buckets.set(key, bucket);
    } else {
      const refill = ((at - bucket.updatedAt) / this.windowMs) * this.capacity;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refill);
      bucket.updatedAt = at;
    }
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  /**
   * Would `allow` succeed? Consumes nothing and — unlike `allow` — never
   * creates an entry, so probing an unseen key costs no memory. Used to check
   * several rules before spending a token on any of them.
   */
  peek(key: string): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) return true;
    const refill = ((this.now() - bucket.updatedAt) / this.windowMs) * this.capacity;
    return Math.min(this.capacity, bucket.tokens + refill) >= 1;
  }

  /** Whole seconds until one token is available (0 when allowed now). */
  retryAfterSec(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    const refill = ((this.now() - bucket.updatedAt) / this.windowMs) * this.capacity;
    const tokens = Math.min(this.capacity, bucket.tokens + refill);
    if (tokens >= 1) return 0;
    return Math.ceil(((1 - tokens) * this.windowMs) / this.capacity / 1000);
  }

  /** Drop buckets that have fully refilled — they carry no state. */
  private sweep(at: number): void {
    for (const [key, bucket] of this.buckets) {
      if (at - bucket.updatedAt >= this.windowMs) this.buckets.delete(key);
    }
  }
}

/**
 * `ip`        — the resolved client IP (see common/http.ts `clientIp`).
 * `principal` — the acting identity, best available: `user_id` from the body
 *               (server-injected by the BFF), else the bearer session, else IP.
 */
export type RateLimitScope = "ip" | "principal";

export type RateLimitRule = { scope: RateLimitScope; limit: number; windowMs: number };

export const RATE_LIMIT_METADATA = "hp:rate-limit";

/** Declare the limits for one route handler. Rules compose: all must pass. */
export const RateLimit = (...rules: readonly RateLimitRule[]): MethodDecorator =>
  SetMetadata(RATE_LIMIT_METADATA, rules);

/** Convenience builders so route declarations read as the policy table. */
export const perMinute = (limit: number, scope: RateLimitScope): RateLimitRule => ({
  scope,
  limit,
  windowMs: 60_000,
});
export const perHour = (limit: number, scope: RateLimitScope): RateLimitRule => ({
  scope,
  limit,
  windowMs: 3_600_000,
});

function principalKey(req: HttpRequest): string {
  const body = req.body;
  if (typeof body === "object" && body !== null && "user_id" in body) {
    const id: unknown = body.user_id;
    if (typeof id === "string" && id.length > 0 && id.length <= 120) return `u:${id}`;
  }
  const bearer = bearerHeader(req);
  if (bearer !== undefined && bearer.startsWith("Bearer ") && bearer.length > 7) {
    // Hash: bucket keys end up in memory and in nothing else, but a raw
    // 30-day bearer as a map key is one heap dump away from being a credential.
    return `s:${createHash("sha256").update(bearer.slice(7)).digest("hex").slice(0, 32)}`;
  }
  return `ip:${clientIp(req)}`;
}

/**
 * Route-level limiter. One bucket per (route, rule index, scope key); a route
 * with no @RateLimit is unlimited (only /healthz should be). Registered once
 * per service as an APP_GUARD.
 */
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly reflector: Reflector,
    private readonly now: () => number = Date.now,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const rules = this.reflector.get<readonly RateLimitRule[] | undefined>(
      RATE_LIMIT_METADATA,
      handler,
    );
    if (rules === undefined || rules.length === 0) return true;

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const route = `${context.getClass().name}.${handler.name}`;
    const ip = clientIp(req);
    const principal = rules.some((r) => r.scope === "principal") ? principalKey(req) : "";

    const checks = rules.map((rule, index) => {
      const id = `${route}#${index}`;
      let bucket = this.buckets.get(id);
      if (!bucket) {
        bucket = new TokenBucket(rule.limit, rule.windowMs, this.now);
        this.buckets.set(id, bucket);
      }
      return { bucket, key: rule.scope === "ip" ? ip : principal };
    });

    // Two-phase so a denial on the last rule does not silently burn tokens
    // (and quietly halve the effective limit) on the earlier ones.
    const denied = checks.find((c) => !c.bucket.peek(c.key));
    if (denied) {
      throw new ApiException(
        429,
        "rate_limited",
        "Too many requests.",
        `Retry in ${Math.max(1, denied.bucket.retryAfterSec(denied.key))}s.`,
      );
    }
    for (const check of checks) check.bucket.allow(check.key);
    return true;
  }
}
