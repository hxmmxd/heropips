import { SYMBOLS, type SymbolCode } from "@heropips/contracts";
import { roundTo } from "../quant/features";
import type { Candle, LatestTick, QuantSource } from "./source";

export const SIM_DATA_SOURCE = "institutional-composite-sim";

/** Realistic anchor prices the simulated series start from. */
export const ANCHOR_PRICES: Record<SymbolCode, number> = {
  EURUSD: 1.085,
  GBPUSD: 1.27,
  USDJPY: 151.4,
  XAUUSD: 2400,
  BTCUSDT: 118000,
  ETHUSDT: 4100,
  SOLUSDT: 210,
};

const MINUTES_PER_YEAR = 365 * 24 * 60; // 525,600
const MS_PER_MINUTE = 60_000;
/** Bars pre-generated before "now" so features always have history. */
const BASE_HISTORY = 512;

/** mulberry32 — tiny deterministic PRNG, uniform in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash — mixes the symbol name into the seed. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Box–Muller standard normal; consumes exactly two PRNG draws. */
function gauss(rng: () => number): number {
  const u = 1 - rng(); // (0, 1] — avoids log(0)
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface SymbolState {
  rng: () => number;
  candles: Candle[];
  last: number; // last close, unrounded (keeps the walk exact)
}

/**
 * Deterministic simulated quant feed: per-symbol geometric Brownian motion,
 * drift 0, per-minute volatility annual_vol / sqrt(minutes-per-year), driven
 * by mulberry32 seeded from SIM_SEED + fnv1a(symbol). Candle i is a pure
 * function of (seed, symbol, i): each bar consumes exactly 7 PRNG draws, so
 * two sources with the same seed produce byte-identical series.
 *
 * The injected clock only decides HOW MANY bars exist (one per elapsed
 * minute), never their content.
 */
export class SimQuantSource implements QuantSource {
  private readonly states = new Map<SymbolCode, SymbolState>();
  private readonly t0: number; // ms, floored to the minute at construction

  constructor(
    private readonly seed: number,
    private readonly nowMs: () => number = Date.now,
  ) {
    this.t0 = Math.floor(this.nowMs() / MS_PER_MINUTE) * MS_PER_MINUTE;
  }

  dataSource(_symbol: SymbolCode): string {
    return SIM_DATA_SOURCE;
  }

  async getCandles(symbol: SymbolCode, n: number): Promise<Candle[]> {
    const candles = this.series(symbol);
    return candles.slice(Math.max(0, candles.length - n));
  }

  async getLatest(symbol: SymbolCode): Promise<LatestTick> {
    const candles = this.series(symbol);
    const last = candles[candles.length - 1];
    return { price: last.c, ts: last.ts };
  }

  /** Bars available at the current clock: base history + one per elapsed minute. */
  private series(symbol: SymbolCode): Candle[] {
    const state = this.state(symbol);
    const elapsed = Math.max(0, Math.floor((this.nowMs() - this.t0) / MS_PER_MINUTE));
    const want = BASE_HISTORY + elapsed;
    while (state.candles.length < want) {
      state.candles.push(this.nextCandle(symbol, state));
    }
    return state.candles;
  }

  private state(symbol: SymbolCode): SymbolState {
    let state = this.states.get(symbol);
    if (!state) {
      state = {
        rng: mulberry32((this.seed + fnv1a(symbol)) >>> 0),
        candles: [],
        last: ANCHOR_PRICES[symbol],
      };
      this.states.set(symbol, state);
    }
    return state;
  }

  private nextCandle(symbol: SymbolCode, state: SymbolState): Candle {
    const meta = SYMBOLS[symbol];
    const stepVol = meta.annual_vol / Math.sqrt(MINUTES_PER_YEAR);
    const i = state.candles.length;
    // Bar index BASE_HISTORY-1 opens at t0; earlier bars extend into the past.
    const tsMs = this.t0 + (i - BASE_HISTORY + 1) * MS_PER_MINUTE;

    const o = state.last;
    const c = o * Math.exp(stepVol * gauss(state.rng)); // GBM, drift 0
    const h = Math.max(o, c) * Math.exp(stepVol * 0.5 * Math.abs(gauss(state.rng)));
    const l = Math.min(o, c) * Math.exp(-stepVol * 0.5 * Math.abs(gauss(state.rng)));
    const v = Math.round(1_000 + state.rng() * 9_000);
    state.last = c;

    const p = meta.precision;
    return {
      ts: new Date(tsMs).toISOString(),
      o: roundTo(o, p),
      h: roundTo(h, p),
      l: roundTo(l, p),
      c: roundTo(c, p),
      v,
    };
  }
}
