import { describe, expect, it } from "vitest";
import {
  applyFill,
  evaluateGuards,
  feeUsdMinor,
  isPureReduce,
  markPrice,
  roundMoney,
  sizeByRisk,
  uplUsdMinor,
  usdPerQuote,
  type EnginePosition,
  type FillSpec,
} from "../src/pnl/engine";

function fill(overrides: Partial<FillSpec> & Pick<FillSpec, "side" | "qty" | "price">): FillSpec {
  return {
    symbol: "BTCUSDT",
    ts: "2026-07-28T10:00:00.000Z",
    signalId: null,
    newPositionId: "pos-new",
    feeUsdMinor: feeUsdMinor(overrides.qty, overrides.price, overrides.symbol ?? "BTCUSDT"),
    ...overrides,
  };
}

function longBtc(qty: number, avgEntry: number, entryFees: number): EnginePosition {
  return {
    id: "pos-1",
    symbol: "BTCUSDT",
    side: "long",
    qty,
    avgEntry,
    entryFeesUsdMinor: entryFees,
    openedAt: "2026-07-28T09:00:00.000Z",
    signalId: null,
  };
}

describe("roundMoney", () => {
  it("rounds half away from zero, symmetric for shorts", () => {
    expect(roundMoney(2.5)).toBe(3);
    expect(roundMoney(-2.5)).toBe(-3);
    expect(roundMoney(2.4)).toBe(2);
    expect(roundMoney(-2.4)).toBe(-2);
    expect(roundMoney(0)).toBe(0);
  });
});

describe("feeUsdMinor", () => {
  it("charges 8 bps of notional in cents", () => {
    // 1 BTC @ 50,000 → notional 5,000,000¢ → 4,000¢ fee
    expect(feeUsdMinor(1, 50_000, "BTCUSDT")).toBe(4000);
  });

  it("floors at 1 cent", () => {
    // 0.001 SOL @ 100 → notional 10¢ → 8bps ≈ 0.008¢ → floor 1¢
    expect(feeUsdMinor(0.001, 100, "SOLUSDT")).toBe(1);
  });

  it("USDJPY notional is USD already (base_is_usd) — the JPY price must not inflate it", () => {
    // 0.022 lots × 100,000 = $2,200 notional = 220,000¢ → 8bps = 176¢
    // (the old qty×price×contract formula charged 8bps of a ~¥33M "notional")
    expect(feeUsdMinor(0.022, 151.363, "USDJPY")).toBe(176);
  });
});

describe("applyFill — long lifecycle (exact cents)", () => {
  it("opens a long with carried entry fee", () => {
    const r = applyFill(null, fill({ side: "buy", qty: 1, price: 50_000 }));
    expect(r.balanceDeltaUsdMinor).toBe(0);
    expect(r.trades).toEqual([]);
    expect(r.position).toMatchObject({
      id: "pos-new",
      side: "long",
      qty: 1,
      avgEntry: 50_000,
      entryFeesUsdMinor: 4000,
    });
  });

  it("partial close realizes exact cents and consumes pro-rata entry fees", () => {
    const pos = longBtc(1, 50_000, 4000);
    const r = applyFill(pos, fill({ side: "sell", qty: 0.4, price: 51_000 }));
    // gross = 0.4 × 1000 × 100 = 40,000¢; close fee 1,632¢; entry share 1,600¢
    expect(r.balanceDeltaUsdMinor).toBe(40_000 - 1632 - 1600);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]).toMatchObject({
      side: "long",
      qty: 0.4,
      entry: 50_000,
      exit: 51_000,
      rplUsdMinor: 36_768,
      feesUsdMinor: 1632 + 1600,
    });
    expect(r.position).toMatchObject({ qty: 0.6, avgEntry: 50_000, entryFeesUsdMinor: 2400 });
  });

  it("full close takes the exact entry-fee remainder — no cent leaks", () => {
    const pos = longBtc(0.6, 50_000, 2400);
    const r = applyFill(pos, fill({ side: "sell", qty: 0.6, price: 49_000 }));
    // gross = 0.6 × (−1000) × 100 = −60,000¢; close fee 2,352¢; entry share 2,400¢
    expect(r.balanceDeltaUsdMinor).toBe(-60_000 - 2352 - 2400);
    expect(r.position).toBeNull();
    expect(r.trades[0].rplUsdMinor).toBe(-64_752);
    expect(r.trades[0].feesUsdMinor).toBe(2352 + 2400);
  });

  it("lifecycle total reconciles: Σ trade.rpl == balance delta", () => {
    let balance = 0;
    const trades: number[] = [];
    let r = applyFill(null, fill({ side: "buy", qty: 1, price: 50_000 }));
    r = applyFill(r.position, fill({ side: "sell", qty: 0.4, price: 51_000 }));
    balance += r.balanceDeltaUsdMinor;
    trades.push(...r.trades.map((t) => t.rplUsdMinor));
    r = applyFill(r.position, fill({ side: "sell", qty: 0.6, price: 49_000 }));
    balance += r.balanceDeltaUsdMinor;
    trades.push(...r.trades.map((t) => t.rplUsdMinor));
    expect(balance).toBe(trades.reduce((a, b) => a + b, 0));
    expect(balance).toBe(36_768 - 64_752);
  });
});

describe("applyFill — short symmetric", () => {
  it("realizes the mirror-image gross for a short reduce", () => {
    const open = applyFill(null, fill({ side: "sell", qty: 1, price: 50_000 }));
    expect(open.position).toMatchObject({ side: "short", qty: 1, entryFeesUsdMinor: 4000 });

    const r = applyFill(open.position, fill({ side: "buy", qty: 0.4, price: 49_000 }));
    // gross = 0.4 × (49,000 − 50,000) × (−1) × 100 = +40,000¢ (same magnitude as the long win)
    // close fee 1,568¢ (cheaper notional), entry share 1,600¢
    expect(r.trades[0].rplUsdMinor).toBe(40_000 - 1568 - 1600);
    expect(r.position).toMatchObject({ side: "short", qty: 0.6, entryFeesUsdMinor: 2400 });
  });
});

describe("applyFill — cross through zero", () => {
  it("closes the trade row and opens the remainder at the fill price", () => {
    const pos = longBtc(1, 50_000, 4000);
    // sell 1.5 @ 52,000: fee = 8bps of 7,800,000¢ = 6,240¢ split 2:1
    const r = applyFill(pos, fill({ side: "sell", qty: 1.5, price: 52_000 }));
    expect(r.trades).toHaveLength(1);
    // gross = 1 × 2,000 × 100 = 200,000¢; close-fee share 4,160¢; entry fees 4,000¢
    expect(r.trades[0]).toMatchObject({ qty: 1, entry: 50_000, exit: 52_000, rplUsdMinor: 191_840 });
    expect(r.balanceDeltaUsdMinor).toBe(191_840);
    expect(r.position).toMatchObject({
      id: "pos-new",
      side: "short",
      qty: 0.5,
      avgEntry: 52_000,
      entryFeesUsdMinor: 2080, // the opening share of the fill fee
      openedAt: "2026-07-28T10:00:00.000Z",
    });
  });
});

describe("applyFill — weighted average entry", () => {
  it("averages same-direction adds by quantity", () => {
    const a = applyFill(null, fill({ symbol: "ETHUSDT", side: "buy", qty: 1, price: 3000 }));
    const b = applyFill(a.position, fill({ symbol: "ETHUSDT", side: "buy", qty: 1, price: 3100 }));
    expect(b.position).toMatchObject({ qty: 2, avgEntry: 3050, entryFeesUsdMinor: 240 + 248 });
    expect(b.balanceDeltaUsdMinor).toBe(0);
  });

  it("weights unequal quantities", () => {
    const a = applyFill(null, fill({ symbol: "ETHUSDT", side: "buy", qty: 3, price: 3000 }));
    const b = applyFill(a.position, fill({ symbol: "ETHUSDT", side: "buy", qty: 1, price: 3400 }));
    expect(b.position?.avgEntry).toBeCloseTo(3100, 10);
  });
});

describe("uplUsdMinor / markPrice", () => {
  const quote = { bid: 3080, ask: 3082 };

  it("marks longs at bid (conservative)", () => {
    const pos: EnginePosition = { ...longBtc(2, 3050, 0), symbol: "ETHUSDT" };
    expect(markPrice("long", quote)).toBe(3080);
    expect(uplUsdMinor(pos, 3080)).toBe(6000); // 2 × 30 × 100¢
  });

  it("marks shorts at ask (conservative)", () => {
    const pos: EnginePosition = { ...longBtc(2, 3050, 0), symbol: "ETHUSDT", side: "short" };
    expect(markPrice("short", quote)).toBe(3082);
    expect(uplUsdMinor(pos, 3082)).toBe(-6400); // 2 × (3082−3050) × (−1) × 100¢
  });
});

describe("sizeByRisk — documented formula, exact", () => {
  it("qty = floor_to_step(risk_usd / (|entry−stop| × contract_size), 10^-precision)", () => {
    // $10,000 equity, 1% risk = $100; EURUSD |1.10−1.09| × 100,000 = $1,000/qty
    expect(sizeByRisk(1_000_000, 1, 1.1, 1.09, "EURUSD")).toBe(0.1);
    // $10,000 equity, 2% risk = $200; XAUUSD |2400−2390| × 100 = $1,000/qty
    expect(sizeByRisk(1_000_000, 2, 2400, 2390, "XAUUSD")).toBe(0.2);
  });

  it("floors to the step, never rounds up", () => {
    // risk $100, $300/unit → 0.333333…, EURUSD step 1e-5 → 0.33333
    expect(sizeByRisk(1_000_000, 1, 1.1, 1.097, "EURUSD")).toBe(0.33333);
  });

  it("returns 0 when equity cannot cover one step or the stop equals entry", () => {
    expect(sizeByRisk(100, 0.1, 1.1, 1.09, "EURUSD")).toBe(0);
    expect(sizeByRisk(1_000_000, 1, 1.1, 1.1, "EURUSD")).toBe(0);
    expect(sizeByRisk(0, 1, 1.1, 1.09, "EURUSD")).toBe(0);
  });
});

describe("JPY quote conversion (USDJPY)", () => {
  function shortJpy(qty: number, avgEntry: number, entryFees: number): EnginePosition {
    return {
      id: "pos-jpy",
      symbol: "USDJPY",
      side: "short",
      qty,
      avgEntry,
      entryFeesUsdMinor: entryFees,
      openedAt: "2026-07-28T09:00:00.000Z",
      signalId: null,
    };
  }

  it("usd_per_quote: 1/price for JPY, exactly 1 for USD/USDT quotes", () => {
    expect(usdPerQuote("USDJPY", 151.363)).toBeCloseTo(1 / 151.363, 12);
    expect(usdPerQuote("EURUSD", 1.1)).toBe(1);
    expect(usdPerQuote("BTCUSDT", 50_000)).toBe(1);
  });

  it("unrealized (E2E regression): short 0.022 lots, +0.01 JPY move → −15¢, NOT −$22", () => {
    // upl_quote = 0.022 × (151.373 − 151.363) × 100,000 × (−1) = −22 JPY
    // usd = −22 / 151.373 = −$0.1453… → −15¢ half-away-from-zero
    const pos = shortJpy(0.022, 151.363, 0);
    expect(uplUsdMinor(pos, 151.373)).toBe(-15);
  });

  it("realized converts at the fill price that realizes the chunk", () => {
    // short 1 lot @ 152, buy back @ 151: pnl_quote = 1 × (151−152) × 100,000 × (−1) = +100,000 JPY
    // usd = 100,000 / 151 = $662.251… → gross 66,225¢; fees 8,000¢ each way
    const open = applyFill(null, fill({ symbol: "USDJPY", side: "sell", qty: 1, price: 152 }));
    expect(open.position?.entryFeesUsdMinor).toBe(8000); // 8bps of $100,000 USD notional
    const r = applyFill(open.position, fill({ symbol: "USDJPY", side: "buy", qty: 1, price: 151 }));
    expect(r.trades[0].rplUsdMinor).toBe(66_225 - 8000 - 8000);
    // reconciliation: balance mutation IS the same converted integer
    expect(r.balanceDeltaUsdMinor).toBe(r.trades[0].rplUsdMinor);
    expect(r.position).toBeNull();
  });

  it("sizes risk in USD: $10,000 equity, 1% risk, entry 151.363, stop 151.408 → 3.363 lots", () => {
    // dist 0.045 JPY → 0.045/151.363 = $0.000297…/unit → $29.7299/lot
    // $100 / 29.7299 = 3.3636… → floored to the 0.001 step = 3.363
    expect(sizeByRisk(1_000_000, 1, 151.363, 151.408, "USDJPY")).toBe(3.363);
  });

  it("risk guard compares USD to USD: the sized JPY order passes the 2% cap", () => {
    // 3.363 × 0.045 × 100,000 / 151.363 × 100 ≈ 9,998¢ ≤ 20,000¢ (2% of $10k)
    expect(
      evaluateGuards({
        equityUsdMinor: 1_000_000,
        openPositionsOnConnection: 0,
        existing: null,
        side: "sell",
        qty: 3.363,
        entry: 151.363,
        stop: 151.408,
        symbol: "USDJPY",
        rplTodayUsdMinor: 0,
        uplNowUsdMinor: 0,
        dayStartEquityUsdMinor: 1_000_000,
      }),
    ).toBeNull();
  });

  it("USDT sanity: 1:1 conversion leaves fee/upl/realized math unchanged", () => {
    expect(feeUsdMinor(1, 50_000, "BTCUSDT")).toBe(4000);
    const pos = longBtc(1, 50_000, 0);
    expect(uplUsdMinor(pos, 50_100)).toBe(10_000); // 1 × 100 × 100¢, no rate applied
    const r = applyFill(pos, fill({ side: "sell", qty: 1, price: 50_100 }));
    expect(r.trades[0].rplUsdMinor).toBe(10_000 - 4008 - 0); // gross − close fee − entry share
  });
});

describe("evaluateGuards", () => {
  const base = {
    equityUsdMinor: 1_000_000,
    openPositionsOnConnection: 0,
    existing: null as EnginePosition | null,
    side: "buy" as const,
    qty: 0.1,
    entry: 1.1,
    stop: undefined as number | undefined,
    symbol: "EURUSD" as const,
    rplTodayUsdMinor: 0,
    uplNowUsdMinor: 0,
    dayStartEquityUsdMinor: 1_000_000,
  };

  it("blocks risk above 2% of equity", () => {
    // 0.5 × 0.01 × 100,000 × 100 = 50,000¢ risk > 20,000¢ (2% of $10k)
    expect(evaluateGuards({ ...base, qty: 0.5, stop: 1.09 })).toBe("max_risk_per_trade");
    // exactly at 2% passes: 0.2 × 0.01 × 100,000 × 100 = 20,000¢
    expect(evaluateGuards({ ...base, qty: 0.2, stop: 1.09 })).toBeNull();
  });

  it("blocks the 6th concurrent position, allows adds to existing symbols", () => {
    expect(evaluateGuards({ ...base, openPositionsOnConnection: 5 })).toBe("max_open_positions");
    const existing = longBtc(1, 50_000, 0);
    expect(
      evaluateGuards({ ...base, symbol: "BTCUSDT", qty: 0.1, entry: 50_000, openPositionsOnConnection: 5, existing }),
    ).toBeNull();
  });

  it("daily-loss breaker blocks entries at −5% of day-start equity", () => {
    expect(evaluateGuards({ ...base, rplTodayUsdMinor: -40_000, uplNowUsdMinor: -15_000 })).toBe(
      "daily_loss_breaker",
    );
    // just above the line passes
    expect(evaluateGuards({ ...base, rplTodayUsdMinor: -40_000, uplNowUsdMinor: -9_999 })).toBeNull();
  });

  it("pure reduces are always allowed (closing is never blocked)", () => {
    const existing = longBtc(1, 50_000, 0);
    expect(isPureReduce(existing, "sell", 1)).toBe(true);
    expect(isPureReduce(existing, "sell", 1.5)).toBe(false);
    expect(isPureReduce(existing, "buy", 0.5)).toBe(false);
    expect(
      evaluateGuards({
        ...base,
        symbol: "BTCUSDT",
        side: "sell",
        qty: 1,
        entry: 50_000,
        existing,
        openPositionsOnConnection: 5,
        rplTodayUsdMinor: -900_000,
      }),
    ).toBeNull();
  });
});
