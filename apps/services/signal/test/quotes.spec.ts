import { describe, expect, it } from "vitest";
import { quoteFromMid, spreadAbs, SPREAD_BPS } from "../src/market/quotes";

describe("quotes spread math", () => {
  it("uses per-market spread bps: fx 0.6, metal 1.2, crypto 2.0", () => {
    expect(SPREAD_BPS.fx).toBe(0.6);
    expect(SPREAD_BPS.metal).toBe(1.2);
    expect(SPREAD_BPS.crypto).toBe(2.0);
  });

  it("computes the absolute spread from mid and market bps", () => {
    expect(spreadAbs("EURUSD", 1.085)).toBeCloseTo(1.085 * 0.6e-4, 12);
    expect(spreadAbs("XAUUSD", 2400)).toBeCloseTo(0.288, 12);
    expect(spreadAbs("BTCUSDT", 118000)).toBeCloseTo(23.6, 12);
  });

  it("sets bid/ask = mid ∓ half-spread rounded to symbol precision", () => {
    const fx = quoteFromMid("EURUSD", 1.085, "2026-01-01T00:00:00.000Z");
    expect(fx).toEqual({
      symbol: "EURUSD",
      bid: 1.08497, // 1.085 − 0.00003255 → 5 dp
      ask: 1.08503,
      ts: "2026-01-01T00:00:00.000Z",
    });

    const gold = quoteFromMid("XAUUSD", 2400, "2026-01-01T00:00:00.000Z");
    expect(gold.bid).toBe(2399.86); // half-spread 0.144, 2 dp
    expect(gold.ask).toBe(2400.14);

    const btc = quoteFromMid("BTCUSDT", 118000, "2026-01-01T00:00:00.000Z");
    expect(btc.bid).toBe(117988.2); // half-spread 11.8, 1 dp
    expect(btc.ask).toBe(118011.8);
  });

  it("keeps bid < mid < ask", () => {
    const q = quoteFromMid("SOLUSDT", 210, "2026-01-01T00:00:00.000Z");
    expect(q.bid).toBeLessThan(210);
    expect(q.ask).toBeGreaterThan(210);
  });
});
