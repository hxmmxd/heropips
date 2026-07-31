import { statusTokenSecret } from "../common/token";

/**
 * Messaging env config. Everything degrades gracefully: no SMTP_URL ⇒ emails
 * are logged instead of sent (dev default), no GA4 keys ⇒ analytics no-op.
 */
export type MessagingConfig = {
  /** Public site origin used for every link in every email. */
  publicOrigin: string;
  /** smtp[s]://[user:pass@]host:port — null ⇒ log transport. */
  smtpUrl: string | null;
  /** RFC 5322 From, e.g. `HeroPips <hello@heropips.com>`. */
  emailFrom: string;
  replyTo: string | null;
  /** Journey/digest sweeper interval. */
  sweepIntervalSec: number;
  /** Master switch — false disables consumer + scheduler (tests, one-off jobs). */
  enabled: boolean;
  /** GA4 Measurement Protocol (free): both required to emit server events. */
  ga4MeasurementId: string | null;
  ga4ApiSecret: string | null;
  /** Secret for unsubscribe tokens + billing-compatible status tokens. */
  statusTokenSecret: string;
};

const DEFAULT_SWEEP_SEC = 60;
const MIN_SWEEP_SEC = 1;

function optional(v: string | undefined): string | null {
  const t = v?.trim();
  return t && t.length > 0 ? t : null;
}

export function loadMessagingConfig(env: NodeJS.ProcessEnv = process.env): MessagingConfig {
  const raw = Number(env.MESSAGING_SWEEP_INTERVAL_SEC);
  const smtpUrl = optional(env.SMTP_URL);
  // L1/M1: without SMTP the service silently switches to a transport that only
  // logs, so production would send zero mail (and used to log every recipient
  // address). Refuse to boot instead of degrading invisibly.
  if (smtpUrl === null && env.NODE_ENV === "production") {
    throw new Error("SMTP_URL is required in production: without it no email is ever sent.");
  }
  return {
    publicOrigin: (optional(env.PUBLIC_ORIGIN) ?? "http://localhost:3000").replace(/\/+$/, ""),
    smtpUrl,
    emailFrom: optional(env.EMAIL_FROM) ?? "HeroPips <hello@heropips.com>",
    replyTo: optional(env.EMAIL_REPLY_TO),
    sweepIntervalSec:
      Number.isFinite(raw) && raw > 0 ? Math.max(MIN_SWEEP_SEC, raw) : DEFAULT_SWEEP_SEC,
    enabled: env.MESSAGING_ENABLED !== "false",
    ga4MeasurementId: optional(env.GA4_MEASUREMENT_ID),
    ga4ApiSecret: optional(env.GA4_API_SECRET),
    statusTokenSecret: statusTokenSecret(env),
  };
}

export const MESSAGING_CONFIG = Symbol("MESSAGING_CONFIG");
