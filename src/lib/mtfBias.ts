/**
 * C2: Multi-Timeframe (MTF) Bias Engine
 * Fetches Daily and Weekly candle data to build a 3-tier bias stack.
 *
 * Stack:
 *   Weekly → Macro trend (strongest weight)
 *   Daily  → Intermediate trend
 *   4H     → Entry timeframe bias (already in market.ts as htfBias)
 *
 * A trade with all 3 timeframes aligned = institutional-grade setup.
 */

import { fetchYahooCandles } from './yahooFinance';

export interface MTFBias {
  weekly: 'bullish' | 'bearish' | 'neutral';
  daily: 'bullish' | 'bearish' | 'neutral';
  h4: 'bullish' | 'bearish' | 'neutral';
  alignment: number;       // 0–3 how many TFs agree with direction
  dominant: 'bullish' | 'bearish' | 'neutral';
  signal: 'bullish' | 'bearish' | 'neutral';
  detail: string;
  aligned: boolean;         // true if ≥ 2/3 timeframes agree
  weight: number;
}

// Simple EMA helper
function ema(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

// Compute RSI
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function biasFromCandles(
  candles: { close: number; high: number; low: number }[],
  label: string
): 'bullish' | 'bearish' | 'neutral' {
  if (candles.length < 20) return 'neutral';

  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];

  // EMA 20 and EMA 50 on the timeframe
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, Math.min(50, closes.length - 1));
  const rsiVal = rsi(closes, 14);

  // Trend score: price above EMAs + RSI direction
  let score = 0;
  if (currentPrice > ema20) score++;
  if (currentPrice > ema50) score++;
  if (ema20 > ema50) score++;  // EMA stack alignment
  if (rsiVal > 55) score++;
  if (rsiVal < 45) score--;

  if (score >= 3) return 'bullish';
  if (score <= 0) return 'bearish';
  return 'neutral';
}

// Yahoo Finance interval mapping
const YAHOO_INTERVALS: Record<string, { interval: string; period: string }> = {
  weekly: { interval: '1wk', period: '1y' },
  daily: { interval: '1d', period: '6mo' },
};

const MTF_CACHE = new Map<string, { result: MTFBias; expiresAt: number }>();
const MTF_TTL = 30 * 60 * 1000; // 30 min cache (weekly/daily don't change often)

export async function getMTFBias(
  symbol: string,
  h4Bias: 'bullish' | 'bearish' | 'neutral',
  preFetchedWeekly?: any[],
  preFetchedDaily?: any[]
): Promise<MTFBias> {
  const cacheKey = symbol;
  const cached = MTF_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  try {
    const weeklyCandles = preFetchedWeekly || await fetchYahooCandles(symbol, '1wk').catch(() => []);
    const dailyCandles = preFetchedDaily || await fetchYahooCandles(symbol, '1d').catch(() => []);

    const weekly = biasFromCandles(weeklyCandles.slice(-52), 'weekly');
    const daily = biasFromCandles(dailyCandles.slice(-60), 'daily');
    const h4 = h4Bias;

    const biases = [weekly, daily, h4];
    const bullCount = biases.filter(b => b === 'bullish').length;
    const bearCount = biases.filter(b => b === 'bearish').length;

    let dominant: 'bullish' | 'bearish' | 'neutral';
    let alignment: number;
    let signal: 'bullish' | 'bearish' | 'neutral';

    if (bullCount >= 2) {
      dominant = 'bullish';
      alignment = bullCount;
      signal = bullCount === 3 ? 'bullish' : 'bullish';
    } else if (bearCount >= 2) {
      dominant = 'bearish';
      alignment = bearCount;
      signal = bearCount === 3 ? 'bearish' : 'bearish';
    } else {
      dominant = 'neutral';
      alignment = 0;
      signal = 'neutral';
    }

    const aligned = alignment >= 2;

    let detail: string;
    if (alignment === 3) {
      detail = `All 3 TFs ${dominant} — Weekly ${weekly} · Daily ${daily} · 4H ${h4} — PERFECT alignment`;
    } else if (alignment === 2) {
      detail = `2/3 TFs ${dominant} — Weekly ${weekly} · Daily ${daily} · 4H ${h4}`;
    } else {
      detail = `TF conflict — Weekly ${weekly} · Daily ${daily} · 4H ${h4} — no clear trend`;
    }

    const result: MTFBias = {
      weekly, daily, h4, alignment, dominant, signal, detail, aligned, weight: 20,
    };

    MTF_CACHE.set(cacheKey, { result, expiresAt: Date.now() + MTF_TTL });
    return result;

  } catch (err) {
    console.error('[MTF Bias] Error:', err);
    const fallback: MTFBias = {
      weekly: 'neutral', daily: 'neutral', h4: h4Bias,
      alignment: 0, dominant: 'neutral', signal: 'neutral',
      detail: 'MTF data unavailable — using 4H only',
      aligned: false, weight: 20,
    };
    return fallback;
  }
}
