/**
 * Pure TypeScript indicator engine — no Python dependency.
 * Computes RSI, MACD, EMA20/50/200, ATR, Bollinger Bands, and Stochastic
 * from raw candle data. Works in Vercel serverless functions.
 */

export interface CandleInput {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IndicatorResult {
  price: number;
  rsi: number | null;
  macd: { value: number; signal: number; histogram: number } | null;
  /** Previous bar's MACD histogram — used for momentum (expanding/contracting) checks */
  prevHistogram: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  atr: number | null;
  /** ATR ratio: current ATR / 20-period average ATR. >1.5 = trending, <0.7 = ranging */
  atrRatio: number | null;
  /** Bollinger Bands (20, 2σ) */
  bbands: { upper: number; middle: number; lower: number; width: number; percentB: number } | null;
  /** Stochastic (14, 3, 3) */
  stoch: { k: number; d: number } | null;
}

/**
 * Exponential Moving Average helper.
 * Uses Wilder's smoothing (alpha = 1/period) when `wilders` is true,
 * otherwise standard EMA (alpha = 2/(period+1)).
 */
function ema(values: number[], period: number, wilders = false): number[] {
  const alpha = wilders ? 1 / period : 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0];
  result.push(prev);

  for (let i = 1; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    result.push(prev);
  }
  return result;
}

/**
 * Simple Moving Average over the last `period` values.
 */
function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

export function computeIndicators(candles: CandleInput[]): IndicatorResult {
  if (candles.length < 50) {
    return {
      price: 0, rsi: null, macd: null, prevHistogram: null,
      ema20: null, ema50: null, ema200: null,
      atr: null, atrRatio: null, bbands: null, stoch: null,
    };
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const currentPrice = closes[closes.length - 1];

  // ── RSI (14) — Wilder's smoothing ────────────────────────
  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i] - closes[i - 1]);
  }
  const gains = deltas.map(d => (d > 0 ? d : 0));
  const losses = deltas.map(d => (d < 0 ? -d : 0));

  const avgGain = ema(gains, 14, true);
  const avgLoss = ema(losses, 14, true);

  const lastGain = avgGain[avgGain.length - 1];
  const lastLoss = avgLoss[avgLoss.length - 1];
  let rsi: number | null = null;
  if (lastLoss === 0) {
    rsi = lastGain === 0 ? 50 : 100;
  } else {
    const rs = lastGain / lastLoss;
    rsi = 100 - 100 / (1 + rs);
  }

  // ── MACD (12, 26, 9) ────────────────────────────────────
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = ema(macdLine, 9);
  const lastMACD = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const histogram = lastMACD - lastSignal;
  // Previous bar's histogram for momentum check
  const prevHistogram = macdLine.length >= 2 && signalLine.length >= 2
    ? macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2]
    : null;

  // ── EMA 20 / 50 / 200 ──────────────────────────────────
  const ema20Arr = ema(closes, 20);
  const lastEma20 = ema20Arr[ema20Arr.length - 1];

  const ema50Arr = ema(closes, 50);
  const lastEma50 = ema50Arr[ema50Arr.length - 1];

  const lastEma200 = candles.length >= 200
    ? ema(closes, 200)[closes.length - 1]
    : null;

  // ── ATR (14) — Wilder's smoothing ──────────────────────
  const trueRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const hl = highs[i] - lows[i];
    if (i === 0) {
      trueRanges.push(hl);
    } else {
      const hpc = Math.abs(highs[i] - closes[i - 1]);
      const lpc = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(hl, hpc, lpc));
    }
  }
  const atrValues = ema(trueRanges, 14, true);
  const atr = atrValues[atrValues.length - 1];

  // ATR ratio: current TR / 20-period avg ATR
  const currentTR = trueRanges[trueRanges.length - 1];
  const avgATR20 = sma(atrValues.slice(-20), 20);
  const atrRatio = avgATR20 && avgATR20 > 0 ? currentTR / avgATR20 : 1;

  // ── Bollinger Bands (20, 2σ) ───────────────────────────
  let bbands: IndicatorResult['bbands'] = null;
  if (closes.length >= 20) {
    const bbPeriod = 20;
    const bbSlice = closes.slice(-bbPeriod);
    const middle = bbSlice.reduce((s, v) => s + v, 0) / bbPeriod;
    const variance = bbSlice.reduce((s, v) => s + (v - middle) ** 2, 0) / bbPeriod;
    const stdDev = Math.sqrt(variance);
    const upper = middle + 2 * stdDev;
    const lower = middle - 2 * stdDev;
    const width = (upper - lower) / middle; // Normalized band width
    const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5;

    bbands = { upper, middle, lower, width, percentB };
  }

  // ── Stochastic (14, 3, 3) ─────────────────────────────
  let stoch: IndicatorResult['stoch'] = null;
  if (candles.length >= 20) {
    const stochPeriod = 14;
    const smoothK = 3;
    const smoothD = 3;

    // Compute raw %K for enough bars to smooth
    const rawK: number[] = [];
    for (let i = stochPeriod - 1; i < candles.length; i++) {
      let highest = -Infinity;
      let lowest = Infinity;
      for (let j = i - stochPeriod + 1; j <= i; j++) {
        if (highs[j] > highest) highest = highs[j];
        if (lows[j] < lowest) lowest = lows[j];
      }
      rawK.push(highest !== lowest ? ((closes[i] - lowest) / (highest - lowest)) * 100 : 50);
    }

    // Smooth %K with SMA(smoothK)
    const kValues: number[] = [];
    for (let i = smoothK - 1; i < rawK.length; i++) {
      const slice = rawK.slice(i - smoothK + 1, i + 1);
      kValues.push(slice.reduce((s, v) => s + v, 0) / smoothK);
    }

    // Smooth %D with SMA(smoothD) of %K
    const dValues: number[] = [];
    for (let i = smoothD - 1; i < kValues.length; i++) {
      const slice = kValues.slice(i - smoothD + 1, i + 1);
      dValues.push(slice.reduce((s, v) => s + v, 0) / smoothD);
    }

    if (kValues.length > 0 && dValues.length > 0) {
      stoch = { k: kValues[kValues.length - 1], d: dValues[dValues.length - 1] };
    }
  }

  return {
    price: currentPrice,
    rsi,
    macd: { value: lastMACD, signal: lastSignal, histogram },
    prevHistogram,
    ema20: lastEma20,
    ema50: lastEma50,
    ema200: lastEma200,
    atr,
    atrRatio,
    bbands,
    stoch,
  };
}
