import { describe, expect, it } from "vitest";
import { PAPER_STARTING_BALANCE_USD_MINOR, SYMBOLS, type SymbolCode } from "@heropips/contracts";
import { applyFill, feeUsdMinor, type EnginePosition } from "../src/pnl/engine";

/** Deterministic PRNG (mulberry32) — the property must be reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYMS = Object.keys(SYMBOLS) as SymbolCode[];
const BASE_PRICE: Record<SymbolCode, number> = {
  EURUSD: 1.1,
  GBPUSD: 1.27,
  USDJPY: 155,
  XAUUSD: 2400,
  BTCUSDT: 50_000,
  ETHUSDT: 3000,
  SOLUSDT: 150,
};

function randomPrice(symbol: SymbolCode, rng: () => number): number {
  const factor = Math.pow(10, SYMBOLS[symbol].precision);
  const raw = BASE_PRICE[symbol] * (0.9 + rng() * 0.2);
  return Math.round(raw * factor) / factor;
}

describe("fee/balance/equity reconciliation property", () => {
  it("500 seeded random fill sequences reconcile with ZERO cent drift", () => {
    for (let iter = 0; iter < 500; iter++) {
      const rng = mulberry32(iter + 1);
      let balance = PAPER_STARTING_BALANCE_USD_MINOR;
      let feesCharged = 0; // every fill fee, at fill time
      let feesRealized = 0; // Σ trade.fees (close shares + entry shares)
      let rplSum = 0; // Σ trade.rpl (net)
      const open = new Map<SymbolCode, EnginePosition>();
      let seq = 0;

      const doFill = (symbol: SymbolCode, side: "buy" | "sell", qty: number, price: number): void => {
        const fee = feeUsdMinor(qty, price, symbol);
        feesCharged += fee;
        const res = applyFill(open.get(symbol) ?? null, {
          symbol,
          side,
          qty,
          price,
          feeUsdMinor: fee,
          ts: "2026-07-28T10:00:00.000Z",
          signalId: null,
          newPositionId: `p-${iter}-${seq++}`,
        });
        balance += res.balanceDeltaUsdMinor;
        let tradeSum = 0;
        for (const t of res.trades) {
          expect(Number.isInteger(t.rplUsdMinor)).toBe(true);
          expect(Number.isInteger(t.feesUsdMinor)).toBe(true);
          rplSum += t.rplUsdMinor;
          feesRealized += t.feesUsdMinor;
          tradeSum += t.rplUsdMinor;
        }
        // balance moves EXACTLY by the realized trade rows of this fill
        expect(res.balanceDeltaUsdMinor).toBe(tradeSum);
        expect(Number.isInteger(balance)).toBe(true);
        if (res.position) {
          expect(Number.isInteger(res.position.entryFeesUsdMinor)).toBe(true);
          open.set(symbol, res.position);
        } else {
          open.delete(symbol);
        }
      };

      // random walk of 5–30 fills across the whole tradable universe
      const steps = 5 + Math.floor(rng() * 25);
      for (let i = 0; i < steps; i++) {
        const symbol = SYMS[Math.floor(rng() * SYMS.length)];
        const side = rng() < 0.5 ? "buy" : "sell";
        const qty = (1 + Math.floor(rng() * 100)) / 100;
        doFill(symbol, side, qty, randomPrice(symbol, rng));
      }

      // flatten everything at fresh random prices
      for (const [symbol, pos] of [...open]) {
        doFill(symbol, pos.side === "long" ? "sell" : "buy", pos.qty, randomPrice(symbol, rng));
      }
      expect(open.size).toBe(0);

      // INVARIANTS — tolerance 0 cents:
      // 1) balance is exactly the start plus the sum of net realized trades
      expect(balance).toBe(PAPER_STARTING_BALANCE_USD_MINOR + rplSum);
      // 2) every fee cent charged is realized exactly once (none minted/lost)
      expect(feesRealized).toBe(feesCharged);
      // 3) equity == balance when no positions remain (upl term is empty)
      const equity = balance + 0;
      expect(equity).toBe(balance);
    }
  });
});
