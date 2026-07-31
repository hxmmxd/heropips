import { describe, expect, it } from "vitest";
import { ANCHOR_PRICES, fnv1a, mulberry32, SIM_DATA_SOURCE, SimQuantSource } from "../src/market/sim.source";

const T0 = Date.UTC(2026, 0, 1);

describe("mulberry32 / fnv1a", () => {
  it("is deterministic and uniform in [0,1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(b()).toBe(x);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
  });

  it("hashes symbols to distinct 32-bit values", () => {
    expect(fnv1a("EURUSD")).not.toBe(fnv1a("GBPUSD"));
    expect(fnv1a("BTCUSDT")).toBe(fnv1a("BTCUSDT"));
  });
});

describe("SimQuantSource", () => {
  it("labels data honestly", () => {
    const src = new SimQuantSource(42, () => T0);
    expect(src.dataSource("EURUSD")).toBe(SIM_DATA_SOURCE);
    expect(SIM_DATA_SOURCE).toBe("institutional-composite-sim");
  });

  it("is fully deterministic: same seed ⇒ identical candles", async () => {
    const a = new SimQuantSource(42, () => T0);
    const b = new SimQuantSource(42, () => T0);
    expect(await a.getCandles("BTCUSDT", 120)).toEqual(await b.getCandles("BTCUSDT", 120));
    expect(await a.getCandles("EURUSD", 50)).toEqual(await b.getCandles("EURUSD", 50));
  });

  it("diverges for different seeds and per symbol", async () => {
    const a = new SimQuantSource(42, () => T0);
    const b = new SimQuantSource(43, () => T0);
    expect(await a.getCandles("BTCUSDT", 10)).not.toEqual(await b.getCandles("BTCUSDT", 10));
    const [eur, gbp] = [await a.getCandles("EURUSD", 10), await a.getCandles("GBPUSD", 10)];
    expect(eur.map((c) => c.c)).not.toEqual(gbp.map((c) => c.c));
  });

  it("walks from realistic anchor prices with sane OHLC bars", async () => {
    const src = new SimQuantSource(42, () => T0);
    const candles = await src.getCandles("XAUUSD", 512);
    // First bar opens exactly at the anchor.
    expect(candles[0].o).toBeCloseTo(ANCHOR_PRICES.XAUUSD, 2);
    for (const c of candles) {
      expect(c.h).toBeGreaterThanOrEqual(Math.max(c.o, c.c));
      expect(c.l).toBeLessThanOrEqual(Math.min(c.o, c.c));
      expect(c.v).toBeGreaterThan(0);
    }
  });

  it("appends exactly one new bar per elapsed minute; history is stable", async () => {
    let t = T0;
    const src = new SimQuantSource(42, () => t);
    const before = await src.getCandles("ETHUSDT", 10_000);
    t += 5 * 60_000;
    const after = await src.getCandles("ETHUSDT", 10_000);
    expect(after.length).toBe(before.length + 5);
    expect(after.slice(0, before.length)).toEqual(before); // past bars never rewritten
    const latest = await src.getLatest("ETHUSDT");
    expect(latest.price).toBe(after[after.length - 1].c);
  });
});
