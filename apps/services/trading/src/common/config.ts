/** trading-svc env config, mirroring billing/growth common/config.ts style. */

/**
 * Dev-only default AES-256-GCM key (32 bytes hex). Override with CRED_KEY.
 * The hex decodes to the literal string "dev-only-key-do-not-use-in-prod!";
 * production must inject a real key from a secret store.
 */
export const DEV_CRED_KEY_HEX =
  // secret-scan:allow — dev-only placeholder, self-documenting above
  "6465762d6f6e6c792d6b65792d646f2d6e6f742d7573652d696e2d70726f6421";

export type TradingConfig = {
  port: number;
  identityUrl: string;
  signalUrl: string;
  /** 32-byte hex key for AES-256-GCM credential encryption at rest. */
  credKeyHex: string;
  /** Mark-to-market sweep interval in seconds; 0 disables (tests). */
  markIntervalSec: number;
};

/**
 * M3: hard cap on any request body this service will buffer. The largest legal
 * body is a broker connection with credentials — a few hundred bytes — so
 * 32 KiB is generous and refuses a multi-megabyte POST before AES-GCM
 * encryption or an outbound broker call is reached.
 */
export const BODY_LIMIT_BYTES = 32 * 1024;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): TradingConfig {
  const configured = env.CRED_KEY?.trim().toLowerCase();
  // M1: fail closed. With the dev key in place, every stored broker credential
  // is decryptable from this repository alone — that must never be a silent
  // fallback in production.
  if (env.NODE_ENV === "production" && (configured === undefined || configured === DEV_CRED_KEY_HEX)) {
    throw new Error(
      "CRED_KEY must be set in production to a real 32-byte hex key: it encrypts broker " +
        "credentials at rest, and the dev default is published in this repository.",
    );
  }
  const credKeyHex = configured ?? DEV_CRED_KEY_HEX;
  if (!/^[0-9a-f]{64}$/.test(credKeyHex)) {
    throw new Error("CRED_KEY must be 32 bytes of hex (64 hex chars)");
  }
  return {
    port: Number(env.TRADING_PORT ?? env.PORT ?? 4005),
    identityUrl: (env.IDENTITY_URL ?? "http://localhost:4003").replace(/\/+$/, ""),
    signalUrl: (env.SIGNAL_URL ?? "http://localhost:4004").replace(/\/+$/, ""),
    credKeyHex,
    markIntervalSec: Number(env.MARK_INTERVAL_SEC ?? 30),
  };
}

export const TRADING_CONFIG = Symbol("TRADING_CONFIG");
