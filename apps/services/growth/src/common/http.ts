/** Fastify request, typed structurally to avoid a direct fastify dependency. */
export type HttpRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  /** Parsed body — populated by fastify before guards run. */
  body?: unknown;
};

/**
 * Header the web BFF uses to forward the resolved client IP. `trustProxy` is
 * deliberately NOT enabled on the fastify adapter: `req.ip` is the peer (the
 * web container for every proxied call), so every per-IP control in this
 * service reads this header first.
 */
export const CLIENT_IP_HEADER = "x-hp-client-ip";

/** Cheap shape guard: IPv4/IPv6 text only, so a hostile header cannot mint unbounded bucket keys. */
const IP_TEXT = /^[0-9a-fA-F.:]{3,45}$/;

/**
 * Client IP for rate limiting. The forwarded header wins when present and
 * well-formed; otherwise the direct peer. Callers with neither get `unknown`,
 * which is a *shared* bucket — restrictive, never fail-open.
 */
export function clientIp(req: HttpRequest): string {
  const forwarded = req.headers[CLIENT_IP_HEADER];
  const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.trim();
  if (raw !== undefined && IP_TEXT.test(raw)) return raw;
  return req.ip ?? "unknown";
}

export function bearerHeader(req: HttpRequest): string | undefined {
  const auth = req.headers.authorization;
  return Array.isArray(auth) ? auth[0] : auth;
}
