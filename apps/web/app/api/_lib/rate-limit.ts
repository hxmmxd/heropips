import { BadClientIp, clientIp } from "./client-ip";

/* =========================================================================
 * The only rate limiter in apps/web.
 *
 * Fixed window counters. A rule is a (key, limit, window) triple; a handler
 * composes as many as it needs — typically one keyed by client IP and one
 * keyed by the caller's identity — and `enforce` denies on the first rule
 * that trips.
 *
 * STORE: single-process, in-memory. Every limit is therefore multiplied by
 * the number of web instances (`--scale web=N`) and resets on deploy. That
 * is honest for the shipped one-container topology; to make the limits real
 * across a fleet, implement `RateLimitStore` against Redis —
 *   hit(key, windowMs) => INCR `rl:{key}` ; on first hit PEXPIRE windowMs
 * — and swap the `store` binding below. Nothing else changes: `enforce`
 * only ever calls `hit`. No redis client is a dependency of this app today,
 * so the interface is the seam rather than a half-wired second path.
 * ======================================================================= */

export type RateLimitRule = { key: string; limit: number; windowMs: number };

/** Limit + window without a subject; the shared table below is built from these. */
export type RateLimitPolicy = { limit: number; windowMs: number };

const MINUTE = 60_000;

/**
 * Every limit in the BFF, in one table. Numbers are per key per window and
 * are sized to be invisible to a human and expensive for a script.
 */
export const POLICY = {
  /** Login / redeem. A person retries a typo a handful of times; each attempt costs a scrypt N=2^15 upstream. */
  credential: { limit: 8, windowMs: MINUTE },
  /** Password change runs scrypt TWICE (verify + rehash) — the single most expensive call in the platform. */
  passwordChange: { limit: 5, windowMs: MINUTE },
  /** Sends real email. Upstream also enforces a per-address resend cooldown. */
  emailSend: { limit: 6, windowMs: MINUTE },
  /** 6-digit code entry: a person mistypes twice, a script needs 10^6 tries. */
  codeVerify: { limit: 12, windowMs: MINUTE },
  /** HMAC status/unsubscribe token lookups — pure guessing oracles, no legitimate repetition. */
  tokenLookup: { limit: 20, windowMs: MINUTE },
  /** Unauthenticated public reads (seat counter, leaderboard). */
  publicRead: { limit: 60, windowMs: MINUTE },
  /** Unauthenticated writes: affiliate applications, seat holds. One per human per session. */
  unauthWrite: { limit: 20, windowMs: MINUTE },
  /** Mail pixel / click redirect: one hit per delivered mail, but whole offices share an IP. */
  mailTracking: { limit: 120, windowMs: MINUTE },
  /** Authenticated GETs. The dashboard fans out ~10 calls per navigation. */
  authedRead: { limit: 300, windowMs: MINUTE },
  /** Quote / signal polling — the dashboard refreshes these on a timer. */
  marketData: { limit: 240, windowMs: MINUTE },
  /** Authenticated non-money writes: profile, session revoke, academy progress. */
  authedWrite: { limit: 60, windowMs: MINUTE },
  /** Chat posts. Upstream additionally enforces 1/2s + 20/min per user. */
  chatPost: { limit: 30, windowMs: MINUTE },
  /** Money moves: order placement, position close, broker connection create. */
  trade: { limit: 30, windowMs: MINUTE },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * How much slack an IP rule gets over its identity rule when both apply.
 * Carrier-grade NAT and office networks put many real members behind one
 * address, so the IP rule is the blast-radius cap, not the per-user cap.
 */
const NAT_FANOUT = 8;

/** Sentinel inside a rule key, replaced by the resolved client IP in `enforce`. */
const IP_SUBJECT = "\u0000ip";

/** Rule keyed by the resolved client IP. */
export function byIp(scope: string, policy: RateLimitPolicy): RateLimitRule {
  return { key: `${scope}|${IP_SUBJECT}`, limit: policy.limit, windowMs: policy.windowMs };
}

/** Rule keyed by an opaque identity (session digest, email, user id). */
export function bySubject(scope: string, policy: RateLimitPolicy, subject: string): RateLimitRule {
  return { key: `${scope}|s:${subject}`, limit: policy.limit, windowMs: policy.windowMs };
}

/**
 * The pair a handler with a logged-in caller wants: the policy applied to
 * the identity, and the same policy widened by NAT_FANOUT applied to the IP.
 * With no identity (anonymous caller) the IP rule carries the policy alone.
 */
export function scoped(scope: string, policy: RateLimitPolicy, subject: string | null): RateLimitRule[] {
  if (!subject) return [byIp(scope, policy)];
  return [
    bySubject(scope, policy, subject),
    { key: `${scope}|${IP_SUBJECT}`, limit: policy.limit * NAT_FANOUT, windowMs: policy.windowMs },
  ];
}

/* ---------- store ---------- */

export interface RateLimitStore {
  /** Count one request against `key` in the current fixed window. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

/** Beyond this the process sheds counters rather than growing without bound. */
const MAX_KEYS = 50_000;
const SWEEP_MS = 60_000;

export class MemoryStore implements RateLimitStore {
  private readonly counters = new Map<string, { count: number; resetAt: number }>();

  constructor(sweepMs: number = SWEEP_MS) {
    const timer = setInterval(() => this.sweep(Date.now()), sweepMs);
    // Never hold the event loop open for a limiter.
    timer.unref?.();
  }

  async hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const slot = `${key}|${windowMs}|${window}`;
    let entry = this.counters.get(slot);
    if (!entry) {
      if (this.counters.size >= MAX_KEYS) this.evict(now);
      entry = { count: 0, resetAt: (window + 1) * windowMs };
      this.counters.set(slot, entry);
    }
    entry.count += 1;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  /** Live counters; diagnostics and tests only. */
  get size(): number {
    return this.counters.size;
  }

  /** Drop counters whose window has closed — they carry no state. */
  sweep(now: number = Date.now()): void {
    for (const [slot, entry] of this.counters) {
      if (entry.resetAt <= now) this.counters.delete(slot);
    }
  }

  /**
   * Sweep first; if a flood of live keys still fills the map, drop the
   * oldest-inserted tenth. Those keys reset early (fail-open for them),
   * which is the correct trade against an OOM that fails open for everyone.
   */
  private evict(now: number): void {
    this.sweep(now);
    if (this.counters.size < MAX_KEYS) return;
    let drop = Math.ceil(MAX_KEYS / 10);
    for (const slot of this.counters.keys()) {
      this.counters.delete(slot);
      if (--drop <= 0) break;
    }
  }
}

const store: RateLimitStore = new MemoryStore();

/* ---------- enforcement ---------- */

const JSON_HEADERS: Record<string, string> = { "content-type": "application/json", "cache-control": "no-store" };

/**
 * Set `RATE_LIMIT_DISABLED=true` ONLY where there is no edge proxy and every
 * request therefore arrives from one address — the local compose stack (which
 * publishes `web:3000` directly) and CI.
 *
 * This is not a convenience toggle. With a single client address the limiter
 * has no per-client identity to key on, so it degrades into ONE global bucket
 * shared by every caller. A global bucket is strictly worse than no limiter:
 * it is the defect that turned identity's `loginByIp` into a platform-wide
 * 10-per-minute cap, i.e. a trivial self-inflicted outage. Standing down is
 * the honest behaviour; pretending to enforce is not.
 *
 * The limiter's own semantics are covered by rate-limit.test.ts rather than by
 * the e2e suite, which shares one loopback address across every spec and would
 * otherwise fail on its own traffic. scripts/preflight.mjs refuses this flag
 * for staging and production.
 */
const DISABLED = process.env.RATE_LIMIT_DISABLED === "true";

/**
 * Returns null when allowed, or a 429 Response (with Retry-After +
 * RateLimit-* headers) when denied. A request whose client IP cannot be
 * derived is rejected with 400 — an unkeyable request is an unlimitable
 * request, so the limiter fails closed rather than into a shared bucket.
 */
export async function enforce(req: Request, ...rules: RateLimitRule[]): Promise<Response | null> {
  if (DISABLED) return null;
  let ip: string;
  try {
    ip = clientIp(req);
  } catch (err) {
    if (!(err instanceof BadClientIp)) throw err;
    return new Response(
      JSON.stringify({
        error_code: "validation_failed",
        message: "Could not determine the client address.",
        remediation: "Retry through the public endpoint.",
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }
  for (const rule of rules) {
    const { count, resetAt } = await store.hit(rule.key.replace(IP_SUBJECT, ip), rule.windowMs);
    if (count <= rule.limit) continue;
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return new Response(
      JSON.stringify({
        error_code: "rate_limited",
        message: "Too many requests.",
        remediation: `Try again in ${retryAfter}s.`,
      }),
      {
        status: 429,
        headers: {
          ...JSON_HEADERS,
          "retry-after": String(retryAfter),
          "ratelimit-limit": String(rule.limit),
          "ratelimit-remaining": "0",
          "ratelimit-reset": String(retryAfter),
        },
      },
    );
  }
  return null;
}
