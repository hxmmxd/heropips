/**
 * Pure TypeScript indicator engine — no Python dependency.
 * Computes RSI, MACD, EMA50, and ATR from raw candle data.
 * Works in Vercel serverless functions.
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
  ema50: number | null;
  atr: number | null;
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

export function computeIndicators(candles: CandleInput[]): IndicatorResult {
  if (candles.length < 50) {
    return { price: 0, rsi: null, macd: null, ema50: null, atr: null };
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

  // ── EMA50 ───────────────────────────────────────────────
  const ema50 = ema(closes, 50);
  const lastEma50 = ema50[ema50.length - 1];

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

  return {
    price: currentPrice,
    rsi,
    macd: { value: lastMACD, signal: lastSignal, histogram },
    ema50: lastEma50,
    atr,
  };
}
