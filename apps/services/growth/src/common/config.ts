/**
 * growth-svc env config, mirroring billing's common/config.ts style.
 * DATABASE_URL / DATABASE_URL_GROWTH are consumed directly by db/client.ts.
 */
export type GrowthConfig = {
  /**
   * Shared secret for guarded internal admin endpoints
   * (PATCH /v1/referrals/config sends it as the x-admin-token header).
   * Optional: unset ⇒ admin mutations are disabled and return 503.
   */
  adminToken: string | null;
  /**
   * Shared bearer every internal caller must present on /v1/academy/** and
   * /v1/referrals/** (header `x-hp-internal-token`, constant-time compared).
   * These surfaces take the acting identity from the request body, so without
   * it any party who can reach the container reads and writes any member's
   * academy row (H4). Required in production; unset outside production leaves
   * the routes open so a bare `pnpm dev` works.
   */
  internalToken: string | null;
  /**
   * Where operational signup notifications land. Unset ⇒ no admin mail is
   * sent; the signup itself is never blocked on it.
   */
  adminNotifyEmail: string | null;
  /**
   * Fixed early-access verification code for dev/staging. When set, every
   * issued code IS this value and it is echoed back to the client, so QA never
   * needs an inbox. Opt-in only: a real deployment simply never sets
   * EARLY_ACCESS_DEV_CODE. Local containers do run NODE_ENV=production, so the
   * env var — not NODE_ENV — is the switch; setting both logs a loud warning.
   */
  devVerificationCode: string | null;
};

/**
 * M3: hard cap on any request body this service will buffer. The largest legal
 * request is an academy sync carrying one entry per lesson, which is a few KiB,
 * so 32 KiB is generous while still refusing a multi-megabyte POST before zod
 * parses it or a FOR UPDATE transaction opens.
 */
export const BODY_LIMIT_BYTES = 32 * 1024;

function optional(v: string | undefined): string | null {
  const t = v?.trim();
  return t !== undefined && t.length > 0 ? t : null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GrowthConfig {
  const explicitDevCode = optional(env.EARLY_ACCESS_DEV_CODE);
  const production = env.NODE_ENV === "production";
  if (explicitDevCode !== null && production) {
    console.warn(
      "[growth] EARLY_ACCESS_DEV_CODE is set with NODE_ENV=production — every early-access " +
        "verification code is fixed and echoed to callers. Unset it outside dev/staging.",
    );
  }
  const internalToken = optional(env.INTERNAL_SVC_TOKEN);
  // Fail closed at boot rather than serving an unauthenticated cross-user
  // academy/referrals surface: a missing env var must not silently downgrade
  // authentication (M1's rule, applied to H4's control).
  if (
    production &&
    internalToken === null &&
    !/^(1|true|yes|on)$/i.test(String(env.ALLOW_DEV_SECRETS ?? "").trim())
  ) {
    throw new Error(
      "INTERNAL_SVC_TOKEN is required in production: /v1/academy/** and /v1/referrals/** " +
        "take the acting user from the request body and are otherwise unauthenticated.",
    );
  }
  return {
    adminToken: optional(env.ADMIN_TOKEN),
    internalToken,
    adminNotifyEmail: optional(env.ADMIN_NOTIFY_EMAIL),
    // No env var ⇒ fixed codes only outside production, so a bare `pnpm dev`
    // still works without configuring anything.
    devVerificationCode: explicitDevCode ?? (production ? null : "123456"),
  };
}

export const GROWTH_CONFIG = Symbol("GROWTH_CONFIG");
