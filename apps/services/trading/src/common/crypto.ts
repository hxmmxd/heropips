import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/* AES-256-GCM credential storage. Per-row 12-byte IV; the stored blob is
 * base64(iv || auth_tag || ciphertext). Plaintext credentials exist only in
 * the request lifetime — they are never logged and never serialized back. */

const IV_BYTES = 12;
const TAG_BYTES = 16;

export function encryptJson(value: unknown, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptJson<T = unknown>(blob: string, keyHex: string): T {
  const key = Buffer.from(keyHex, "hex");
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}
