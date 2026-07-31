export type IdentityConfig = {
  port: number;
  databaseUrl: string;
  kafkaBrokers: string[];
  /** billing-svc base URL for POST /v1/founding/verify during redeem. */
  billingUrl: string;
  /** Admin-issued early-access codes (CSV) — fallback when billing can't verify. */
  earlyAccessCodes: string[];
  sessionTtlMs: number;
};

export const SESSION_TTL_DAYS = 30;

/**
 * M3: hard cap on any request body this service will buffer. The largest legal
 * request is a 2000-character chat message, so 32 KiB is ~15× headroom while
 * still refusing a multi-megabyte POST before zod (or scrypt) is reached.
 */
export const BODY_LIMIT_BYTES = 32 * 1024;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): IdentityConfig {
  return {
    port: Number(env.IDENTITY_PORT ?? env.PORT ?? 4003),
    databaseUrl:
      env.DATABASE_URL_IDENTITY ??
      env.DATABASE_URL ??
      "postgres://hp:hp@localhost:5432/hp_identity",
    kafkaBrokers: (env.KAFKA_BROKERS ?? "localhost:9092")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean),
    billingUrl: (env.BILLING_URL ?? "http://localhost:4002").replace(/\/+$/, ""),
    earlyAccessCodes: (env.EARLY_ACCESS_CODES ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    sessionTtlMs: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export const TENANT_ID = "heropips";
