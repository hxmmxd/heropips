import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * STATUS TOKEN (shared web<->services contract):
 *   base64url(JSON.stringify(payload)) + "." + hex(HMAC-SHA256(base64urlPayload, STATUS_TOKEN_SECRET))
 * Growth payload shape: {"e":"<email>"}.
 */

/** Published in this repo, so it is worth exactly nothing as a secret. */
const DEV_SECRET = "dev-status-secret-change-me";

/**
 * M1: the HMAC key for status tokens, unsubscribe tokens, verification-code
 * hashes and mail-tracking ids. Production must inject a real one — falling
 * back to the placeholder would let anyone mint a valid token from a value
 * published in this repository. Outside production the placeholder keeps
 * `pnpm dev` zero-config.
 */
export function statusTokenSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.STATUS_TOKEN_SECRET?.trim();
  if (configured !== undefined && configured.length > 0 && configured !== DEV_SECRET) {
    return configured;
  }
  if (
    env.NODE_ENV === "production" &&
    !/^(1|true|yes|on)$/i.test(String(env.ALLOW_DEV_SECRETS ?? "").trim())
  ) {
    throw new Error(
      "STATUS_TOKEN_SECRET must be set to a non-placeholder value in production: it signs " +
        "status tokens, unsubscribe links, verification-code hashes and mail-tracking ids.",
    );
  }
  return DEV_SECRET;
}

export function signStatusToken(
  payload: Record<string, string>,
  key: string = statusTokenSecret(),
): string {
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", key).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

export function verifyStatusToken(
  token: string,
  key: string = statusTokenSecret(),
): Record<string, string> | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", key).update(b64).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
    const parsed: unknown = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    for (const v of Object.values(parsed)) if (typeof v !== "string") return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * M7: mail-tracking ids are HMAC-tagged (`<sendId>.<sig>`), so an open/click
 * URL cannot be forged or enumerated — a hit with a bad tag is rejected before
 * any DB write. Truncated to 16 bytes: this authenticates a pixel hit, not a
 * payment, and it has to fit in a URL people paste around.
 */
export function signTrackingId(sendId: string, key: string = statusTokenSecret()): string {
  return `${sendId}.${trackingSig(sendId, key)}`;
}

/** Returns the send id when the tag verifies, else null. */
export function verifyTrackingId(tagged: string, key: string = statusTokenSecret()): string | null {
  const dot = tagged.lastIndexOf(".");
  if (dot <= 0 || dot === tagged.length - 1) return null;
  const sendId = tagged.slice(0, dot);
  const sig = Buffer.from(tagged.slice(dot + 1), "base64url");
  const expected = Buffer.from(trackingSig(sendId, key), "base64url");
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(sig, expected) ? sendId : null;
}

function trackingSig(sendId: string, key: string): string {
  return createHmac("sha256", key).update(`track:${sendId}`).digest().subarray(0, 16).toString("base64url");
}
