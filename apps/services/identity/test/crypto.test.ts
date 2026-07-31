import { describe, expect, it } from "vitest";
import {
  DUMMY_HASH_PROMISE,
  hashPassword,
  newSessionToken,
  sha256Hex,
  verifyPassword,
} from "../src/common/crypto";

describe("scrypt password hashing", () => {
  it("roundtrip: hash then verify", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
  });

  it("wrong password fails; hash is scrypt-parameterized, never plaintext", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
    expect(stored.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(stored).not.toContain("correct horse battery");
  });

  it("two hashes of the same password differ (random 32B salt)", async () => {
    const a = await hashPassword("same-password-here");
    const b = await hashPassword("same-password-here");
    expect(a).not.toBe(b);
    const salt = Buffer.from(a.split("$")[4], "base64");
    expect(salt.length).toBe(32);
  });

  it("malformed stored strings verify false, never throw", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$whatever")).toBe(false);
    expect(await verifyPassword("x", "scrypt$a$b$c$d$e")).toBe(false);
  });

  it("dummy hash (unknown-email path) verifies false for any input", async () => {
    expect(await verifyPassword("anything", await DUMMY_HASH_PROMISE)).toBe(false);
  });
});

describe("session tokens", () => {
  it("32B base64url token; only its sha256 is meant to be stored", () => {
    const { token, sha256 } = newSessionToken();
    expect(Buffer.from(token, "base64url").length).toBe(32);
    expect(sha256).toBe(sha256Hex(token));
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(newSessionToken().token).not.toBe(token);
  });
});
