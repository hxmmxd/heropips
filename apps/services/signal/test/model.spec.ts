import { describe, expect, it } from "vitest";
import { spreadAbs } from "../src/market/quotes";
import { SimQuantSource } from "../src/market/sim.source";
import type { Candle } from "../src/market/source";
import { evaluate, MODEL_VERSION } from "../src/quant/model";

const T0 = Date.UTC(2026, 0, 1);

async function seededCandles(seed: number, symbol: "USDJPY" | "SOLUSDT" | "GBPUSD"): Promise<Candle[]> {
  return new SimQuantSource(seed, () => T0).getCandles(symbol, 120);
}

describe("quant-ml-v1 model", () => {
  it("emits the exact expected signal for seeded candles (SIM_SEED=42, USDJPY)", async () => {
    const candles = await seededCandles(42, "USDJPY");
    const mid = candles[candles.length - 1].c;
    const proposal = evaluate("USDJPY", candles, spreadAbs("USDJPY", mid));

    // Snapshot of the full deterministic output — any drift in the feature
    // pipeline, weights, or PRNG changes these numbers and must be deliberate.
    expect(proposal).toEqual({
      side: "sell",
      confidence: 0.7967,
      entry: 151.372,
      stop: 151.408, // entry + 1.2×ATR14 (sell)
      target: 151.318, // entry − 1.8×ATR14 (R = 1.5)
      horizon_min: 101, // round(90 × regime) clamped to [30, 240]
      rationale: "momentum -2.56 below trend; z-score -1.23 vs EWMA mean",
      model_version: MODEL_VERSION,
    });
  });

  it("is deterministic: two same-seed sources yield identical proposals", async () => {
    const a = await seededCandles(42, "USDJPY");
    const b = await seededCandles(42, "USDJPY");
    const spread = spreadAbs("USDJPY", a[a.length - 1].c);
    expect(evaluate("USDJPY", a, spread)).toEqual(evaluate("USDJPY", b, spread));
  });

  it("respects side geometry: stop below and target above entry for buys", async () => {
    // Seed 1234 ETHUSDT emits a buy (probed fixture).
    const candles = await new SimQuantSource(1234, () => T0).getCandles("ETHUSDT", 120);
    const p = evaluate("ETHUSDT", candles, spreadAbs("ETHUSDT", candles[candles.length - 1].c));
    expect(p).not.toBeNull();
    expect(p!.side).toBe("buy");
    expect(p!.stop).toBeLessThan(p!.entry);
    expect(p!.target).toBeGreaterThan(p!.entry);
    // R = 1.8 / 1.2 = 1.5
    expect((p!.target - p!.entry) / (p!.entry - p!.stop)).toBeCloseTo(1.5, 2);
    expect(p!.horizon_min).toBeGreaterThanOrEqual(30);
    expect(p!.horizon_min).toBeLessThanOrEqual(240);
  });

  it("suppresses low-conviction setups (confidence < 0.10)", async () => {
    // Seed 42 SOLUSDT: |score| ≈ 0.17 ⇒ confidence ≈ 0.08 — below the gate.
    const candles = await seededCandles(42, "SOLUSDT");
    expect(evaluate("SOLUSDT", candles, 0)).toBeNull();
  });

  it("suppresses setups whose edge does not clear 2× spread", async () => {
    // Seed 7 GBPUSD: confident enough, but 1-minute ATR edge < 2× fx spread.
    const candles = await seededCandles(7, "GBPUSD");
    const mid = candles[candles.length - 1].c;
    expect(evaluate("GBPUSD", candles, spreadAbs("GBPUSD", mid))).toBeNull();
    // Same candles with zero spread would pass — proves the spread gate did it.
    expect(evaluate("GBPUSD", candles, 0)).not.toBeNull();
  });

  it("returns null on flat markets (ATR = 0) and short history", async () => {
    const flat: Candle[] = Array.from({ length: 120 }, (_, i) => ({
      ts: new Date(T0 + i * 60_000).toISOString(),
      o: 100,
      h: 100,
      l: 100,
      c: 100,
      v: 1000,
    }));
    expect(evaluate("EURUSD", flat, 0)).toBeNull();

    const candles = await seededCandles(42, "USDJPY");
    expect(evaluate("USDJPY", candles.slice(0, 60), 0)).toBeNull();
  });
});
