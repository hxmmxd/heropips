import { randomInt } from "node:crypto";

/** A–Z + 2–9 with ambiguous glyphs removed (I, O, 0, 1). */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

/** Generate an 8-char referral code from the unambiguous alphabet. */
export function generateReferralCode(length: number = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Generate an n-digit email verification code. Uniform over the full range
 * including leading zeros, so "000123" is as likely as any other value.
 */
export function generateNumericCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += String(randomInt(10));
  return out;
}
