import { describe, expect, it } from "vitest";
import { DEV_CRED_KEY_HEX, loadConfig } from "../src/common/config";

/**
 * M1: `CRED_KEY` is the AES-256-GCM key for broker credentials at rest. Falling
 * back to `DEV_CRED_KEY_HEX` in production would make every stored live API key
 * decryptable from this repository alone, so a missing env var must stop the
 * boot rather than quietly downgrade the encryption.
 */
describe("loadConfig CRED_KEY", () => {
  const REAL_KEY = "a".repeat(64);

  it("refuses to boot in production without CRED_KEY", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/CRED_KEY/);
  });

  it("refuses the published dev key in production, in any casing or padding", () => {
    for (const value of [DEV_CRED_KEY_HEX, DEV_CRED_KEY_HEX.toUpperCase(), ` ${DEV_CRED_KEY_HEX} `]) {
      expect(() => loadConfig({ NODE_ENV: "production", CRED_KEY: value })).toThrow(/CRED_KEY/);
    }
  });

  it("accepts a real key in production", () => {
    expect(loadConfig({ NODE_ENV: "production", CRED_KEY: REAL_KEY }).credKeyHex).toBe(REAL_KEY);
  });

  it("still rejects a malformed key regardless of environment", () => {
    expect(() => loadConfig({ CRED_KEY: "too-short" })).toThrow(/32 bytes of hex/);
    expect(() => loadConfig({ NODE_ENV: "production", CRED_KEY: "z".repeat(64) })).toThrow(
      /32 bytes of hex/,
    );
  });

  it("keeps the dev fallback outside production so `pnpm dev` needs no setup", () => {
    expect(loadConfig({}).credKeyHex).toBe(DEV_CRED_KEY_HEX);
    expect(loadConfig({ NODE_ENV: "test" }).credKeyHex).toBe(DEV_CRED_KEY_HEX);
  });
});
