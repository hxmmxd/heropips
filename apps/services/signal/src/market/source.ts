import type { SymbolCode } from "@heropips/contracts";

/** One 1-minute OHLCV bar. Prices are floats at the symbol's native precision. */
export interface Candle {
  ts: string; // ISO-8601 bar open time
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface LatestTick {
  price: number; // mid price
  ts: string;
}

/**
 * Market data seam for the quant engine. Implementations must be safe to call
 * every tick for every symbol; `dataSource` is disclosed verbatim on every
 * signal and quote-derived artifact (honest labeling — sim is always labeled).
 */
export interface QuantSource {
  /** Last `n` 1-minute candles, oldest first. */
  getCandles(symbol: SymbolCode, n: number): Promise<Candle[]>;
  /** Latest mid price for the symbol. */
  getLatest(symbol: SymbolCode): Promise<LatestTick>;
  /** Provenance label for data served for this symbol right now. */
  dataSource(symbol: SymbolCode): string;
}

export const QUANT_SOURCE = Symbol("QUANT_SOURCE");
