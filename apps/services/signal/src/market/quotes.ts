import { SYMBOLS, type QuoteRes, type SymbolCode } from "@heropips/contracts";
import { roundTo } from "../quant/features";

/** Fixed per-market spread in basis points of mid (documented product spec). */
export const SPREAD_BPS: Record<string, number> = {
  fx: 0.6,
  metal: 1.2,
  crypto: 2.0,
};

/** Absolute full spread (ask − bid) at a given mid price. */
export function spreadAbs(symbol: SymbolCode, mid: number): number {
  return (mid * SPREAD_BPS[SYMBOLS[symbol].market]) / 10_000;
}

/** bid/ask = mid ∓ half-spread, rounded to the symbol's native precision. */
export function quoteFromMid(symbol: SymbolCode, mid: number, ts: string): QuoteRes {
  const half = spreadAbs(symbol, mid) / 2;
  const p = SYMBOLS[symbol].precision;
  return { symbol, bid: roundTo(mid - half, p), ask: roundTo(mid + half, p), ts };
}
