import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing: scrypt from node:crypto only — no external deps.
 * Parameters are encoded into the stored string so they can be raised later
 * without invalidating existing hashes.
 */
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 32;
const KEY_BYTES = 64;
// 128 * N * r bytes are needed; the node default (32 MiB) is exactly the
// requirement for N=2^15, r=8, so give it headroom.
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = await scryptAsync(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: SCRYPT_MAXMEM,
  });
  return timingSafeEqual(actual, expected);
}

/**
 * Hash verified for unknown emails so login cost is identical whether or not
 * the account exists (no user-enumeration timing oracle).
 */
export const DUMMY_HASH_PROMISE: Promise<string> = hashPassword(randomBytes(24).toString("base64url"));

/** Opaque session token: 32 random bytes; only its sha256 is ever stored. */
export function newSessionToken(): { token: string; sha256: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, sha256: sha256Hex(token) };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Constant-time equality for two hex digests of the same function (session
 * token sha256s). The values compared here are all derived from the caller's
 * own session, so there is no secret to guess — this exists so that NO secret
 * comparison anywhere in the services is a plain `===`, and nobody has to
 * re-derive that argument next time.
 */
export function sameDigestHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
