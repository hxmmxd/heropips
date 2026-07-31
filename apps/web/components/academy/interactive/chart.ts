/* =========================================================================
 * Shared SVG chart math for the academy interactives (replay + arcade).
 * ViewBox is a fixed 100×56 unit stage; every scenario normalizes into it,
 * so candle data can live in real instrument price space.
 * ======================================================================= */

import { SYMBOLS, type SymbolCode } from "@heropips/contracts";
import type { Candle } from "@/lib/academy/scenarios";

export const CHART_W = 100;
export const CHART_H = 56;

/** ms per candle — the shared replay/reveal cadence. */
export const CANDLE_TICK_MS = 180;

export type ChartGeom = {
  /** Full x-slot width per candle (CHART_W / n). */
  slotW: number;
  /** Candle body width — 60% of the slot. */
  bodyW: number;
  /** Slot-center x for candle index i. */
  xCenter: (i: number) => number;
  /** Linear price → y map over [min low, max high] with 6% padding. */
  y: (price: number) => number;
};

/**
 * Geometry over the FULL candle list — pass every candle (not just the
 * revealed prefix) so the scale never jumps mid-reveal.
 */
export function chartGeom(candles: readonly Candle[]): ChartGeom {
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of candles) {
    if (c.l < lo) lo = c.l;
    if (c.h > hi) hi = c.h;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.06;
  const top = hi + pad;
  const span = top - (lo - pad);
  const n = Math.max(candles.length, 1);
  const slotW = CHART_W / n;
  return {
    slotW,
    bodyW: slotW * 0.6,
    xCenter: (i) => (i + 0.5) * slotW,
    y: (price) => ((top - price) / span) * CHART_H,
  };
}

/** Format a price with the instrument's precision (fallback 2). */
export function fmtChartPrice(pair: string, price: number): string {
  const precision = pair in SYMBOLS ? SYMBOLS[pair as SymbolCode].precision : 2;
  return price.toFixed(precision);
}

/** Live reduced-motion preference — timers skip to final states when set. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
