/* =========================================================================
 * Client IP derivation for the BFF tier — the ONLY place in apps/web that
 * parses forwarded-for headers.
 *
 * Every hop header is attacker-supplied unless a trusted proxy overwrote it,
 * so the parse is hop-COUNTED rather than "take the first entry":
 *
 *   TRUSTED_PROXY_HOPS = how many trusted proxies sit in front of this
 *   process and append to `x-forwarded-for`. The right-most XFF entry was
 *   written by the closest proxy and holds the address of whoever connected
 *   to it, so the real client sits `hops` entries from the RIGHT.
 *
 * The shipped topology is a single Caddy (`trusted_proxies static
 * private_ranges`, infra/compose/caddy/Caddyfile.production) which discards
 * an untrusted inbound XFF and emits exactly one entry ⇒ default hops = 1
 * ⇒ right-most entry ⇒ the real client. Put another proxy (Cloudflare, an
 * ELB) in front and bump TRUSTED_PROXY_HOPS to match, or the limiter starts
 * bucketing every request onto that proxy's address.
 *
 * `cf-connecting-ip` / `x-real-ip` are single-value headers that only a
 * trusted edge should set — but Caddy passes them through verbatim, so they
 * are deliberately consulted ONLY when no XFF is present (a direct hit on
 * the container). XFF-first keeps the spoofable single-value headers out of
 * the production path entirely.
 *
 * There is no shared fallback bucket: an underivable IP throws BadClientIp
 * and the caller fails closed. Collapsing unknown clients onto one literal
 * key (the old `|| "local"`) turns the limiter off for everyone at once.
 * ======================================================================= */

/** Header the BFF uses to hand the resolved client IP to internal services. */
export const CLIENT_IP_HEADER = "x-hp-client-ip";

export class BadClientIp extends Error {
  constructor(message = "No trusted client IP in the request headers.") {
    super(message);
    this.name = "BadClientIp";
  }
}

/** Trusted proxies in front of this process; >= 1. */
const TRUSTED_PROXY_HOPS = Math.max(1, Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10) || 1);

/**
 * `next dev` has no proxy in front, so there is no header to read and every
 * request would 400. A deployed build always fails closed.
 */
const DEV_FALLBACK = process.env.NODE_ENV === "development" ? "127.0.0.1" : null;

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

function isIpv6(value: string): boolean {
  if (value.length > 45 || !value.includes(":")) return false;
  const halves = value.split("::");
  if (halves.length > 2) return false;
  let groups = 0;
  for (const half of halves) {
    if (half === "") continue;
    for (const group of half.split(":")) {
      // A trailing dotted-quad (::ffff:1.2.3.4) occupies two groups.
      if (group.includes(".")) {
        if (!IPV4.test(group)) return false;
        groups += 2;
      } else {
        if (!HEX_GROUP.test(group)) return false;
        groups += 1;
      }
    }
  }
  return halves.length === 2 ? groups <= 7 : groups === 8;
}

/** Strip brackets / port / zone id, then validate. Returns null for junk. */
function normalize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end < 0) return null;
    value = value.slice(1, end);
  } else if (value.includes(".") && value.includes(":")) {
    value = value.slice(0, value.indexOf(":")); // 1.2.3.4:5678
  }
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);
  if (IPV4.test(value)) return value;
  return isIpv6(value) ? value.toLowerCase() : null;
}

/** Resolved from the right-most untrusted hop. Throws BadClientIp when it cannot be derived. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    const candidate = normalize(hops[hops.length - TRUSTED_PROXY_HOPS]);
    if (candidate) return candidate;
  }
  const direct = normalize(req.headers.get("cf-connecting-ip")) ?? normalize(req.headers.get("x-real-ip"));
  if (direct) return direct;
  if (DEV_FALLBACK) return DEV_FALLBACK;
  throw new BadClientIp();
}

/**
 * Header pair that propagates the resolved IP to internal services, which
 * cannot see it themselves (Fastify runs without `trustProxy` by design).
 * Empty when the IP is underivable or there is no request in scope (server
 * components) — the limiter, not the proxy layer, owns failing closed.
 */
export function clientIpHeader(req?: Request): Record<string, string> {
  if (!req) return {};
  try {
    return { [CLIENT_IP_HEADER]: clientIp(req) };
  } catch {
    return {};
  }
}
