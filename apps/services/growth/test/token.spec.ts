import { describe, expect, it } from "vitest";
import { signStatusToken, verifyStatusToken } from "../src/common/token";

const KEY = "test-secret";

describe("status token", () => {
  it("round-trips a payload", () => {
    const token = signStatusToken({ e: "hero@example.com" }, KEY);
    expect(verifyStatusToken(token, KEY)).toEqual({ e: "hero@example.com" });
  });

  it("has the documented shape: base64url payload + '.' + hex hmac", () => {
    const token = signStatusToken({ e: "hero@example.com" }, KEY);
    const [b64, sig, rest] = token.split(".");
    expect(rest).toBeUndefined();
    expect(JSON.parse(Buffer.from(b64, "base64url").toString("utf8"))).toEqual({
      e: "hero@example.com",
    });
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a tampered payload", () => {
    const token = signStatusToken({ e: "hero@example.com" }, KEY);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ e: "villain@example.com" })).toString("base64url")}.${sig}`;
    expect(verifyStatusToken(forged, KEY)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signStatusToken({ e: "hero@example.com" }, KEY);
    const flipped = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(verifyStatusToken(flipped, KEY)).toBeNull();
  });

  it("rejects the wrong key", () => {
    const token = signStatusToken({ e: "hero@example.com" }, KEY);
    expect(verifyStatusToken(token, "other-secret")).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyStatusToken("", KEY)).toBeNull();
    expect(verifyStatusToken("no-dot", KEY)).toBeNull();
    expect(verifyStatusToken("a.", KEY)).toBeNull();
    expect(verifyStatusToken(".b", KEY)).toBeNull();
    expect(verifyStatusToken("!!!.???", KEY)).toBeNull();
  });
});
