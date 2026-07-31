import { createHmac, timingSafeEqual } from "node:crypto";
import { statusTokenSecret } from "./token";

/**
 * Email verification codes are never stored in plaintext. The database keeps
 * HMAC-SHA256(lower(email) + ":" + code) so a leaked table cannot be replayed
 * against a different address, and comparison is constant-time.
 */

export function hashVerificationCode(
  email: string,
  code: string,
  key: string = statusTokenSecret(),
): string {
  return createHmac("sha256", key).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function verificationCodeMatches(
  email: string,
  code: string,
  hash: string,
  key?: string,
): boolean {
  const expected = hashVerificationCode(email, code, key);
  if (hash.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
