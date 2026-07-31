import { describe, expect, it } from "vitest";
import {
  atr14,
  clamp,
  ema,
  ewmaVol,
  logReturns,
  momentum,
  regimeRatio,
  roundTo,
  rsi14,
  zScore,
} from "../src/quant/features";
import type { Candle } from "../src/market/source";

const bar = (o: number, h: number, l: number, c: number): Candle => ({
  ts: "2026-01-01T00:00:00.000Z",
  o,
  h,
  l,
  c,
  v: 1000,
});

describe("logReturns", () => {
  it("computes ln(c_i / c_{i-1})", () => {
    const rs = logReturns([1, Math.E, Math.E * Math.E]);
    expect(rs).toHaveLength(2);
    expect(rs[0]).toBeCloseTo(1, 12);
    expect(rs[1]).toBeCloseTo(1, 12);
  });

  it("is empty for a single close", () => {
    expect(logReturns([100])).toEqual([]);
  });
});

describe("ewmaVol (RiskMetrics λ=0.94)", () => {
  it("matches the hand-computed recursion", () => {
    // v0 = 0.01² ; v1 = .94·v0 + .06·0.02² ; v2 = .94·v1 + .06·0.015² ; σ = √v2
    expect(ewmaVol([0.01, -0.02, 0.015])).toBeCloseTo(0.01115437134042076, 12);
  });

  it("is |r| for one return and 0 for none", () => {
    expect(ewmaVol([-0.03])).toBeCloseTo(0.03, 12);
    expect(ewmaVol([])).toBe(0);
  });
});

describe("zScore (EWMA mean λ=0.97)", () => {
  it("matches the hand-computed recursion", () => {
    expect(zScore([100, 101, 102, 101, 103, 104, 102, 105])).toBeCloseTo(3.659417190221466, 10);
  });

  it("is 0 for constant prices (zero variance)", () => {
    expect(zScore([5, 5, 5, 5])).toBe(0);
  });
});

describe("rsi14 (Wilder smoothing)", () => {
  // Wilder's classic worked example closes.
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61,
    46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64,
  ];

  it("matches the seed average after exactly period+1 closes", () => {
    expect(rsi14(closes.slice(0, 15))).toBeCloseTo(70.46413502109705, 10);
  });

  it("matches the Wilder recursion over the full sequence", () => {
    expect(rsi14(closes)).toBeCloseTo(57.91502067008556, 10);
  });

  it("is 100 when there are no losses and 50 on short input", () => {
    expect(rsi14([...Array(20).keys()].map((i) => 100 + i))).toBe(100);
    expect(rsi14([1, 2, 3])).toBe(50);
  });
});

describe("ema / momentum", () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("matches k = 2/(n+1) seeded with the first value", () => {
    expect(ema(values, 10)).toBeCloseTo(6.239368480121215, 12);
    expect(ema(values, 30)).toBeCloseTo(3.455999347184394, 12);
  });

  it("normalizes the EMA10−EMA30 crossover by ATR", () => {
    expect(momentum(values, 2)).toBeCloseTo(1.3916845664684103, 12);
  });

  it("is 0 when ATR is not positive", () => {
    expect(momentum(values, 0)).toBe(0);
  });
});

describe("atr14 (Wilder smoothing)", () => {
  const seq: [number, number, number, number][] = [
    [100, 102, 99, 101], [101, 103, 100, 102], [102, 104, 101, 100], [100, 101, 98, 99],
    [99, 102, 99, 101], [101, 105, 100, 104], [104, 106, 103, 105], [105, 107, 104, 106],
    [106, 108, 105, 107], [107, 109, 106, 105], [105, 106, 103, 104], [104, 107, 104, 106],
    [106, 110, 105, 109], [109, 111, 108, 110], [110, 112, 109, 111], [111, 113, 110, 112],
  ];
  const candles = seq.map(([o, h, l, c]) => bar(o, h, l, c));

  it("matches the hand-computed Wilder recursion", () => {
    expect(atr14(candles)).toBeCloseTo(3.2653061224489797, 12);
  });

  it("falls back to the simple TR mean below period+1 candles", () => {
    expect(atr14(candles.slice(0, 5))).toBeCloseTo(3.0, 12);
  });

  it("is 0 with fewer than 2 candles", () => {
    expect(atr14([bar(1, 1, 1, 1)])).toBe(0);
  });
});

describe("regimeRatio (vol_short / vol_long)", () => {
  it("matches √(mean r²) over the 20/60 windows", () => {
    const returns = [...Array(40).fill(0.001), ...Array(20).fill(0.003)];
    expect(regimeRatio(returns)).toBeCloseTo(1.5666989036012804, 12);
  });

  it("is neutral (1) when history is too short", () => {
    expect(regimeRatio(Array(59).fill(0.01))).toBe(1);
  });
});

describe("roundTo / clamp", () => {
  it("rounds to symbol precision", () => {
    expect(roundTo(1.08496745, 5)).toBe(1.08497);
    expect(roundTo(151.3719, 3)).toBe(151.372);
  });

  it("clamps into [lo, hi]", () => {
    expect(clamp(300, 30, 240)).toBe(240);
    expect(clamp(10, 30, 240)).toBe(30);
    expect(clamp(90, 30, 240)).toBe(90);
  });
});
