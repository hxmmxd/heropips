import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signIpn, verifyIpn } from "../src/ipn/signature";

const SECRET = "test-ipn-secret";

describe("IPN signature", () => {
  it("matches a known vector computed independently (sorted-key HMAC-SHA512)", () => {
    const body = {
      payment_id: 4945313,
      order_id: "hp_ltd_a1b2c3d4e5f6",
      payment_status: "finished",
      price_amount: 499,
      price_currency: "usd",
    };
    // Expected value computed with the documented NOWPayments algorithm.
    const sorted = JSON.stringify(body, Object.keys(body).sort());
    const expected = createHmac("sha512", SECRET).update(sorted).digest("hex");

    expect(signIpn(body, SECRET)).toBe(expected);
    // sign is independent of source key order
    const reordered = {
      price_currency: "usd",
      price_amount: 499,
      payment_status: "finished",
      order_id: "hp_ltd_a1b2c3d4e5f6",
      payment_id: 4945313,
    };
    expect(signIpn(reordered, SECRET)).toBe(expected);
  });

  it("roundtrips: verify accepts the signature over the exact raw bytes", () => {
    const body = { payment_id: "77", payment_status: "waiting", order_id: "hp_ltd_0", b: 2, a: 1 };
    const raw = Buffer.from(JSON.stringify(body), "utf8");
    const sig = signIpn(body, SECRET);
    const res = verifyIpn(raw, sig, SECRET);
    expect(res.valid).toBe(true);
    expect(res.body).toEqual(body);
    // uppercase header is normalized
    expect(verifyIpn(raw, sig.toUpperCase(), SECRET).valid).toBe(true);
  });

  it("rejects tampered payloads and wrong secrets", () => {
    const body = { payment_id: "77", payment_status: "finished", order_id: "hp_ltd_0" };
    const sig = signIpn(body, SECRET);
    const tampered = Buffer.from(JSON.stringify({ ...body, order_id: "hp_ltd_1" }), "utf8");
    expect(verifyIpn(tampered, sig, SECRET).valid).toBe(false);
    const raw = Buffer.from(JSON.stringify(body), "utf8");
    expect(verifyIpn(raw, sig, "other-secret").valid).toBe(false);
    expect(verifyIpn(raw, undefined, SECRET).valid).toBe(false);
    expect(verifyIpn(raw, "deadbeef", SECRET).valid).toBe(false);
    expect(verifyIpn(Buffer.from("not-json"), sig, SECRET).valid).toBe(false);
  });
});
