import { LTD } from "@heropips/contracts";

export type BillingConfig = {
  port: number;
  databaseUrl: string;
  kafkaBrokers: string[];
  npApiUrl: string;
  npApiKey: string;
  npIpnSecret: string;
  statusTokenSecret: string;
  publicOrigin: string;
  ipnCallbackUrl: string;
  ltdPriceUsd: number;
  ltdSeatCap: number;
  /** Minutes a seat stays held for an unpaid order (M6). */
  holdTtlMinutes: number;
  /** Concurrent held orders allowed per email address (M6). */
  maxHoldsPerEmail: number;
  /** Concurrent held orders allowed per client IP (M6). */
  maxHoldsPerIp: number;
  /**
   * When true, checkout requires a growth-issued verified-email token
   * (`x-hp-verify-token` header or `verify_token` in the body). Off by default:
   * adding a verification step to a live paid funnel is a conversion decision,
   * not a security one. The seat-hold caps above are the security control.
   */
  requireVerifiedCheckout: boolean;
};

/**
 * M3: hard cap on any request body this service will buffer. The largest legal
 * body is a NOWPayments IPN callback (a small flat JSON object), so 32 KiB is
 * ample and keeps a multi-megabyte POST from reaching the pre-auth HMAC-SHA512
 * over the whole raw body.
 */
export const BODY_LIMIT_BYTES = 32 * 1024;

/**
 * The hold TTL lives in @heropips/contracts (LTD.HOLD_TTL_MINUTES, now 20) so
 * public copy that quotes it can never disagree with what billing does.
 * Concurrency caps: 2 holds per email covers a buyer who switches coin or
 * retries after a failed invoice; 5 per IP still lets an office, campus or
 * mobile-carrier NAT buy while making seat exhaustion need hundreds of
 * addresses, refreshed every TTL window (M6).
 */
const DEFAULT_MAX_HOLDS_PER_EMAIL = 2;
const DEFAULT_MAX_HOLDS_PER_IP = 5;

/** Placeholders published in this repo — worth nothing as secrets. */
const DEV_PLACEHOLDERS: readonly string[] = [
  "sandbox-key",
  "dev-ipn-secret",
  "dev-status-secret-change-me",
];

/**
 * M1: cryptographic material must never fall back to a value shipped in source.
 * If NOWPAYMENTS_IPN_SECRET were unset, `verifyIpn` would validate against a
 * published string and anyone could forge `payment_status: finished` and mint
 * free lifetime seats.
 *
 * The escape hatch is ALLOW_DEV_SECRETS, not NODE_ENV: the local compose stack
 * runs NODE_ENV=production too (it boots the same prod images), so keying off
 * NODE_ENV made a documented `pnpm stack:up` crash-loop billing — the one
 * service that mints Founding order ids, i.e. access codes. Same shape as
 * RATE_LIMIT_DISABLED: expected locally, and preflight FAILS on it beyond local.
 */
function requireSecret(
  env: NodeJS.ProcessEnv,
  name: string,
  devDefault: string,
  purpose: string,
): string {
  const value = env[name]?.trim();
  if (value !== undefined && value.length > 0 && !DEV_PLACEHOLDERS.includes(value)) return value;
  if (!/^(1|true|yes|on)$/i.test(String(env.ALLOW_DEV_SECRETS ?? "").trim())) {
    throw new Error(
      `${name} must be set to a non-placeholder value: it ${purpose}. ` +
        "Set ALLOW_DEV_SECRETS=true only on a local stack.",
    );
  }
  return devDefault;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig {
  return {
    port: Number(env.BILLING_PORT ?? env.PORT ?? 4002),
    databaseUrl:
      env.DATABASE_URL_BILLING ??
      env.DATABASE_URL ??
      "postgres://hp:hp@localhost:5432/hp_billing",
    kafkaBrokers: (env.KAFKA_BROKERS ?? "localhost:9092")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean),
    npApiUrl: (env.NOWPAYMENTS_API_URL ?? "http://localhost:4090").replace(/\/+$/, ""),
    npApiKey: requireSecret(env, "NOWPAYMENTS_API_KEY", "sandbox-key", "authenticates invoice creation"),
    npIpnSecret: requireSecret(
      env,
      "NOWPAYMENTS_IPN_SECRET",
      "dev-ipn-secret",
      "is the only thing proving a payment callback is genuine",
    ),
    statusTokenSecret: requireSecret(
      env,
      "STATUS_TOKEN_SECRET",
      "dev-status-secret-change-me",
      "signs order status tokens",
    ),
    publicOrigin: (env.PUBLIC_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, ""),
    ipnCallbackUrl: env.IPN_CALLBACK_URL ?? "http://billing:4002/v1/billing/ipn",
    ltdPriceUsd: Number(env.LTD_PRICE_USD ?? LTD.PRICE_USD_DEFAULT),
    ltdSeatCap: Number(env.LTD_SEAT_CAP ?? LTD.SEAT_CAP),
    holdTtlMinutes: positiveInt(env.LTD_HOLD_TTL_MINUTES, LTD.HOLD_TTL_MINUTES),
    maxHoldsPerEmail: positiveInt(env.LTD_MAX_HOLDS_PER_EMAIL, DEFAULT_MAX_HOLDS_PER_EMAIL),
    maxHoldsPerIp: positiveInt(env.LTD_MAX_HOLDS_PER_IP, DEFAULT_MAX_HOLDS_PER_IP),
    requireVerifiedCheckout: env.LTD_REQUIRE_VERIFIED_CHECKOUT === "true",
  };
}

export const TENANT_ID = "heropips";
