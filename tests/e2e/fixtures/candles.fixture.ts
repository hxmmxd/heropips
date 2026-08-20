/**
 * Synthetic Candle Fixtures & Invariant Validators for UQP E2E Testing
 */
import { NormalizedTick } from './ticks.fixture';

export interface Candle {
  broker?: string;
  symbol?: string;
  timeframe?: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_closed?: boolean;
}

export const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

/**
 * Validates mathematical invariants for an OHLC candle
 */
export function verifyCandleInvariants(candle: Candle, timeframe?: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (candle.high < Math.max(candle.open, candle.close, candle.low)) {
    errors.push(`Invariant violated: High (${candle.high}) < max(Open: ${candle.open}, Close: ${candle.close}, Low: ${candle.low})`);
  }

  if (candle.low > Math.min(candle.open, candle.close, candle.high)) {
    errors.push(`Invariant violated: Low (${candle.low}) > min(Open: ${candle.open}, Close: ${candle.close}, High: ${candle.high})`);
  }

  if (candle.high < candle.low) {
    errors.push(`Invariant violated: High (${candle.high}) < Low (${candle.low})`);
  }

  if (candle.volume < 0 || !Number.isFinite(candle.volume)) {
    errors.push(`Invariant violated: Volume (${candle.volume}) must be non-negative finite number`);
  }

  if (candle.time <= 0 || !Number.isFinite(candle.time)) {
    errors.push(`Invariant violated: Time (${candle.time}) must be positive timestamp`);
  }

  if (timeframe && TIMEFRAME_MS[timeframe]) {
    const interval = TIMEFRAME_MS[timeframe];
    if (candle.time % interval !== 0) {
      errors.push(`Invariant violated: Time (${candle.time}) is not aligned to ${timeframe} boundary (${interval}ms)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Pure reference aggregator converting a series of ticks into discrete time-bucketed OHLC candles
 */
export function aggregateTicksToCandles(
  ticks: NormalizedTick[],
  timeframe: string = '1m',
  broker: string = 'vantage',
  symbol: string = 'XAUUSD'
): Candle[] {
  const intervalMs = TIMEFRAME_MS[timeframe] || 60000;
  const buckets = new Map<number, NormalizedTick[]>();

  for (const tick of ticks) {
    const bucketTime = Math.floor(tick.time / intervalMs) * intervalMs;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime)!.push(tick);
  }

  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);
  const candles: Candle[] = [];

  for (let i = 0; i < sortedBucketTimes.length; i++) {
    const t = sortedBucketTimes[i];
    const bucketTicks = buckets.get(t)!;
    const prices = bucketTicks.map((tick) => tick.mid);

    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const volume = bucketTicks.length;
    const is_closed = i < sortedBucketTimes.length - 1; // Last bucket may be in-progress

    candles.push({
      broker,
      symbol,
      timeframe,
      time: t,
      open,
      high,
      low,
      close,
      volume,
      is_closed,
    });
  }

  return candles;
}

/**
 * Generates a realistic synthetic time series of N candles with smooth trends and oscillations
 */
export function generateSyntheticCandles(
  symbol: string = 'XAUUSD',
  broker: string = 'vantage',
  timeframe: string = '1m',
  count: number = 60,
  startPrice: number = 2735.0,
  startTime: number = 1724000000000
): Candle[] {
  const intervalMs = TIMEFRAME_MS[timeframe] || 60000;
  const alignedStart = Math.floor(startTime / intervalMs) * intervalMs;
  const candles: Candle[] = [];
  let currentClose = startPrice;

  // Scale movements appropriately for FX (e.g. 1.0850) vs Gold (2735.0)
  const scale = startPrice < 5 ? 0.0001 : startPrice < 500 ? 0.01 : 0.3;

  for (let i = 0; i < count; i++) {
    const time = alignedStart + i * intervalMs;
    const open = currentClose;
    const rawTrend = Math.sin(i / 10) * 1.2 + Math.cos(i / 5) * 0.8;
    const rawDelta = (rawTrend + (i % 3 === 0 ? 0.6 : -0.4)) * scale;
    const close = Number((open + rawDelta).toFixed(5));
    const wickHigh = (Math.abs(Math.sin(i)) * 0.8 + 0.2) * scale;
    const wickLow = (Math.abs(Math.cos(i)) * 0.8 + 0.2) * scale;
    const high = Number((Math.max(open, close) + wickHigh).toFixed(5));
    const low = Number((Math.min(open, close) - wickLow).toFixed(5));
    const volume = Math.floor(50 + Math.abs(Math.sin(i)) * 150);

    candles.push({
      broker,
      symbol,
      timeframe,
      time,
      open,
      high,
      low,
      close,
      volume,
      is_closed: i < count - 1,
    });

    currentClose = close;
  }

  return candles;
}

// Pre-baked candles for indicator testing (100 candles each)
export const SAMPLE_1M_CANDLES_XAUUSD = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 100, 2735.0, 1724000000000);
export const SAMPLE_1M_CANDLES_EURUSD = generateSyntheticCandles('EURUSD', 'xm', '1m', 100, 1.0850, 1724000000000);
export const SAMPLE_5M_CANDLES_XAUUSD = generateSyntheticCandles('XAUUSD', 'vantage', '5m', 60, 2735.0, 1724000000000);
export const SAMPLE_1H_CANDLES_XAUUSD = generateSyntheticCandles('XAUUSD', 'vantage', '1h', 50, 2735.0, 1724000000000);

export const SINGLE_TICK_CANDLE: Candle = {
  broker: 'vantage',
  symbol: 'XAUUSD',
  timeframe: '1m',
  time: 1724000000000,
  open: 2735.5,
  high: 2735.5,
  low: 2735.5,
  close: 2735.5,
  volume: 1,
  is_closed: false,
};
