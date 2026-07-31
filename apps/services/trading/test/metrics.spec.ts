import { describe, expect, it } from "vitest";
import { dailyReturns, downsampleEvenly, maxDrawdownBps, sharpe, winRate } from "../src/pnl/metrics";

describe("maxDrawdownBps", () => {
  it("measures the deepest peak-to-trough drop in floored bps", () => {
    // peak 120 → trough 80 = 33.33% → 3333 bps (floored)
    expect(maxDrawdownBps([100, 120, 90, 110, 80])).toBe(3333);
  });

  it("is 0 for empty and monotone-up curves", () => {
    expect(maxDrawdownBps([])).toBe(0);
    expect(maxDrawdownBps([50, 60, 70])).toBe(0);
  });

  it("tracks the running peak, not the global max", () => {
    // drop happens before the later higher peak: 100→90 = 10% = 1000 bps
    expect(maxDrawdownBps([100, 90, 200, 195])).toBe(1000);
  });
});

describe("dailyReturns", () => {
  it("computes simple returns between consecutive day closes", () => {
    const r = dailyReturns([100, 110, 99]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(0.1, 12);
    expect(r[1]).toBeCloseTo(-0.1, 12);
    expect(dailyReturns([100])).toEqual([]);
  });
});

describe("sharpe", () => {
  it("is null below 5 daily returns", () => {
    expect(sharpe([0.01, 0.02, 0.01, 0.02])).toBeNull();
  });

  it("is null for zero variance", () => {
    expect(sharpe([0.01, 0.01, 0.01, 0.01, 0.01])).toBeNull();
  });

  it("matches mean/stdev × √365 on a fixed fixture", () => {
    // mean 0.014, sample sd √3e-5 → 2.556038… × 19.104973… ≈ 48.833
    const s = sharpe([0.01, 0.02, 0.01, 0.02, 0.01]);
    expect(s).not.toBeNull();
    expect(s as number).toBeCloseTo(48.833, 2);
  });
});

describe("winRate", () => {
  it("counts rpl > 0 as wins over closed trades", () => {
    expect(winRate([100, -50, 30, -10])).toBe(0.5);
    expect(winRate([5])).toBe(1);
    expect(winRate([0])).toBe(0); // break-even is not a win
  });

  it("is null with no closed trades", () => {
    expect(winRate([])).toBeNull();
  });
});

describe("downsampleEvenly", () => {
  it("keeps first and last points and spaces the rest evenly", () => {
    const out = downsampleEvenly([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
    expect(out).toHaveLength(5);
    expect(out[0]).toBe(0);
    expect(out[4]).toBe(9);
  });

  it("returns the series untouched when under the cap", () => {
    expect(downsampleEvenly([1, 2, 3], 500)).toEqual([1, 2, 3]);
  });
});
