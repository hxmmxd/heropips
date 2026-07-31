import { describe, expect, it, vi } from "vitest";
import { BINANCE_DATA_SOURCE, BinancePublicSource } from "../src/market/binance.source";
import { SIM_DATA_SOURCE, SimQuantSource } from "../src/market/sim.source";

const T0 = Date.UTC(2026, 0, 1);

describe("BinancePublicSource (no network in tests — fetch is injected)", () => {
  it("parses klines rows and labels live crypto data", async () => {
    const rows = [
      [T0, "118000.0", "118050.0", "117950.0", "118020.0", "12.5"],
      [T0 + 60_000, "118020.0", "118100.0", "118000.0", "118080.0", "8.1"],
    ];
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toContain("/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=2");
      return { ok: true, status: 200, json: async () => rows };
    });
    const src = new BinancePublicSource(new SimQuantSource(42, () => T0), fetchFn);

    const candles = await src.getCandles("BTCUSDT", 2);
    expect(candles).toEqual([
      { ts: new Date(T0).toISOString(), o: 118000, h: 118050, l: 117950, c: 118020, v: 12.5 },
      { ts: new Date(T0 + 60_000).toISOString(), o: 118020, h: 118100, l: 118000, c: 118080, v: 8.1 },
    ]);
    expect(src.dataSource("BTCUSDT")).toBe(BINANCE_DATA_SOURCE);
  });

  it("falls back to sim on network error, labels it sim, and logs once", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const sim = new SimQuantSource(42, () => T0);
    const src = new BinancePublicSource(sim, fetchFn);

    const candles = await src.getCandles("BTCUSDT", 30);
    expect(candles).toEqual(await sim.getCandles("BTCUSDT", 30));
    expect(src.dataSource("BTCUSDT")).toBe(SIM_DATA_SOURCE); // never claims live provenance

    await src.getCandles("BTCUSDT", 30); // second failure: no duplicate warn
    expect(fetchFn).toHaveBeenCalledTimes(2); // it keeps retrying the feed itself
  });

  it("never queries binance for non-crypto symbols", async () => {
    const fetchFn = vi.fn();
    const sim = new SimQuantSource(42, () => T0);
    const src = new BinancePublicSource(sim, fetchFn as never);

    expect(await src.getCandles("EURUSD", 10)).toEqual(await sim.getCandles("EURUSD", 10));
    expect(src.dataSource("EURUSD")).toBe(SIM_DATA_SOURCE);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
