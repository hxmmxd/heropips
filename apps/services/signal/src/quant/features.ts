import type { Candle } from "../market/source";

/* =========================================================================
 * Feature pipeline — pure, deterministic functions over 1-minute candles.
 * Every formula is documented; unit tests pin exact hand-computed values.
 * ======================================================================= */

/** Round to `dp` decimal places (symbol precision at API boundaries). */
export function roundTo(x: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Log returns: r_i = ln(c_i / c_{i-1}). Length is closes.length − 1. */
export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

/**
 * RiskMetrics EWMA volatility (λ = 0.94):
 *   σ²_0 = r_0²;  σ²_t = λ·σ²_{t−1} + (1−λ)·r_t²
 * Returns σ of the final step (per-bar units). Empty input ⇒ 0.
 */
export function ewmaVol(returns: number[], lambda = 0.94): number {
  if (returns.length === 0) return 0;
  let v = returns[0] * returns[0];
  for (let i = 1; i < returns.length; i++) {
    v = lambda * v + (1 - lambda) * returns[i] * returns[i];
  }
  return Math.sqrt(v);
}

/**
 * Z-score of the last price against its EWMA mean (λ = 0.97):
 *   m_0 = p_0, v_0 = 0
 *   dev_t = p_t − m_{t−1};  v_t = λ·v_{t−1} + (1−λ)·dev_t²;  m_t = λ·m_{t−1} + (1−λ)·p_t
 *   z = (p_last − m) / √v   (0 when the variance is 0)
 */
export function zScore(prices: number[], lambda = 0.97): number {
  if (prices.length === 0) return 0;
  let m = prices[0];
  let v = 0;
  for (let i = 1; i < prices.length; i++) {
    const dev = prices[i] - m;
    v = lambda * v + (1 - lambda) * dev * dev;
    m = lambda * m + (1 - lambda) * prices[i];
  }
  const sd = Math.sqrt(v);
  return sd > 0 ? (prices[prices.length - 1] - m) / sd : 0;
}

/**
 * RSI with Wilder smoothing over `period` (default 14):
 *   seed averages = simple mean of the first `period` gains/losses,
 *   then avg_t = (avg_{t−1}·(period−1) + x_t) / period.
 * Needs period+1 closes; fewer ⇒ neutral 50. All-gain ⇒ 100.
 */
export function rsi14(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** EMA with k = 2/(n+1), seeded with the first value. Empty ⇒ 0. */
export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

/**
 * Momentum crossover: (EMA10 − EMA30) / ATR — trend strength in ATR units.
 * Positive ⇒ short trend above long trend. ATR ≤ 0 ⇒ 0.
 */
export function momentum(closes: number[], atr: number): number {
  if (atr <= 0) return 0;
  return (ema(closes, 10) - ema(closes, 30)) / atr;
}

/**
 * ATR with Wilder smoothing over `period` (default 14):
 *   TR_i = max(h−l, |h−prevClose|, |l−prevClose|)
 *   seed = simple mean of the first `period` TRs, then Wilder recursion.
 * Fewer than period+1 candles ⇒ simple mean of available TRs.
 */
export function atr14(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const { h, l } = candles[i];
    const pc = candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

/**
 * Realized-vol regime ratio: rv(last shortN returns) / rv(last longN returns)
 * where rv = √(mean r²) (zero-mean realized vol). >1 ⇒ vol expanding.
 * Degenerate windows (too few returns or zero long vol) ⇒ 1 (neutral).
 */
export function regimeRatio(returns: number[], shortN = 20, longN = 60): number {
  if (returns.length < longN) return 1;
  const rv = (win: number[]): number =>
    Math.sqrt(win.reduce((a, r) => a + r * r, 0) / win.length);
  const short = rv(returns.slice(-shortN));
  const long = rv(returns.slice(-longN));
  return long > 0 ? short / long : 1;
}
