import { SessionUserRes } from "@heropips/contracts";
import { apiError } from "../common/errors";

/** DI seam: controllers depend on this; tests inject a fake. */
export interface Introspector {
  /** Resolve a bearer token to a session user, or null when invalid/expired. */
  introspect(token: string): Promise<SessionUserRes | null>;
}

export const INTROSPECTOR = Symbol("INTROSPECTOR");

const CACHE_TTL_MS = 30_000;

/** Calls identity-svc GET /v1/auth/introspect with a 30s in-memory cache. */
export class HttpIntrospector implements Introspector {
  private readonly cache = new Map<string, { user: SessionUserRes; expiresAt: number }>();

  constructor(
    private readonly identityUrl: string,
    private readonly now: () => number = Date.now,
  ) {}

  async introspect(token: string): Promise<SessionUserRes | null> {
    const hit = this.cache.get(token);
    if (hit && hit.expiresAt > this.now()) return hit.user;
    this.cache.delete(token);

    let res: Response;
    try {
      res = await fetch(`${this.identityUrl}/v1/auth/introspect`, {
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      throw apiError(503, "internal", "Auth service unavailable.", "Retry shortly.");
    }
    if (!res.ok) return null;

    const parsed = SessionUserRes.safeParse(await res.json().catch(() => null));
    if (!parsed.success) return null;

    this.cache.set(token, { user: parsed.data, expiresAt: this.now() + CACHE_TTL_MS });
    return parsed.data;
  }
}

/** Minimal request surface (avoid importing fastify types directly). */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

/** Every trading route requires a valid bearer session. */
export async function requireUser(req: RequestLike, introspector: Introspector): Promise<SessionUserRes> {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !value.startsWith("Bearer ") || value.length <= 7) {
    throw apiError(401, "unauthorized", "Missing bearer token.", "Sign in and retry.");
  }
  const user = await introspector.introspect(value.slice(7));
  if (!user) {
    throw apiError(401, "session_expired", "Session is invalid or expired.", "Sign in again.");
  }
  return user;
}
