import { describe, test, expect } from 'vitest';
import { computeIndicators, CandleInput } from './indicators';

// Helper to generate a flat list of candles
function generateFlatCandles(count: number, price = 100): CandleInput[] {
  const candles: CandleInput[] = [];
  for (let i = 0; i < count; i++) {
    candles.push({ open: price, high: price, low: price, close: price });
  }
  return candles;
}

// Helper to generate trending candles
function generateTrendingCandles(count: number, startPrice = 100, trend = 1): CandleInput[] {
  const candles: CandleInput[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const nextClose = price + trend;
    candles.push({
      open: price,
      high: Math.max(price, nextClose) + 0.5,
      low: Math.min(price, nextClose) - 0.5,
      close: nextClose,
    });
    price = nextClose;
  }
  return candles;
}

describe('Indicators Engine (computeIndicators)', () => {
  test('returns null indicators when candles length is less than 50 (bootstrap limit)', () => {
    const candles = generateFlatCandles(49);
    const result = computeIndicators(candles);

    expect(result.price).toBe(0);
    expect(result.rsi).toBeNull();
    expect(result.macd).toBeNull();
    expect(result.prevHistogram).toBeNull();
    expect(result.ema20).toBeNull();
    expect(result.ema50).toBeNull();
    expect(result.ema200).toBeNull();
    expect(result.atr).toBeNull();
    expect(result.atrRatio).toBeNull();
    expect(result.bbands).toBeNull();
    expect(result.stoch).toBeNull();
  });

  test('correctly calculates indicators on flat prices (no volatility, no trend)', () => {
    const price = 150;
    const candles = generateFlatCandles(60, price);
    const result = computeIndicators(candles);

    expect(result.price).toBe(price);
    // RSI of flat line should default/clamp cleanly (typically 50 or 100 depending on zero division)
    expect(result.rsi).toBe(50);
    expect(result.ema20).toBeCloseTo(price, 4);
    expect(result.ema50).toBeCloseTo(price, 4);
    expect(result.ema200).toBeNull(); // Still null because we only have 60 candles

    // MACD for constant price should be zero
    expect(result.macd?.value).toBeCloseTo(0, 4);
    expect(result.macd?.signal).toBeCloseTo(0, 4);
    expect(result.macd?.histogram).toBeCloseTo(0, 4);

    // ATR for flat line (high == low == close) should be 0
    expect(result.atr).toBe(0);

    // Bollinger Bands should collapse to middle
    expect(result.bbands?.middle).toBeCloseTo(price, 4);
    expect(result.bbands?.upper).toBeCloseTo(price, 4);
    expect(result.bbands?.lower).toBeCloseTo(price, 4);
    expect(result.bbands?.width).toBe(0);
  });

  test('calculates correct indicators on strong uptrending prices', () => {
    const candles = generateTrendingCandles(100, 100, 2); // 100 candles, going up by 2 each bar
    const result = computeIndicators(candles);

    // Under strong uptrend, RSI should be high (>80)
    expect(result.rsi).toBeGreaterThan(80);

    // EMAs should be in bullish order: price > EMA20 > EMA50
    expect(result.price).toBeGreaterThan(result.ema20!);
    expect(result.ema20!).toBeGreaterThan(result.ema50!);

    // MACD should be positive (EMA12 > EMA26)
    expect(result.macd?.value).toBeGreaterThan(0);

    // Bollinger Bands percentB should be > 0.5 (price above middle band)
    expect(result.bbands?.percentB).toBeGreaterThan(0.5);
  });

  test('calculates correct indicators on strong downtrending prices', () => {
    const candles = generateTrendingCandles(100, 200, -2); // 100 candles, going down by 2 each bar
    const result = computeIndicators(candles);

    // Under strong downtrend, RSI should be low (<20)
    expect(result.rsi).toBeLessThan(20);

    // EMAs should be in bearish order: price < EMA20 < EMA50
    expect(result.price).toBeLessThan(result.ema20!);
    expect(result.ema20!).toBeLessThan(result.ema50!);

    // MACD should be negative
    expect(result.macd?.value).toBeLessThan(0);

    // Bollinger Bands percentB should be < 0.5 (price below middle band)
    expect(result.bbands?.percentB).toBeLessThan(0.5);
  });

  test('includes EMA200 when candle history is 200 or more', () => {
    const candles = generateFlatCandles(205, 100);
    const result = computeIndicators(candles);

    expect(result.ema200).not.toBeNull();
    expect(result.ema200).toBeCloseTo(100, 4);
  });

  test('correctly calculates Stochastic values within valid bounds', () => {
    // Generate a set of candles that cycle prices up and down
    const candles: CandleInput[] = [];
    for (let i = 0; i < 70; i++) {
      const cyclePrice = 100 + Math.sin(i / 5) * 10;
      candles.push({
        open: cyclePrice,
        high: cyclePrice + 2,
        low: cyclePrice - 2,
        close: cyclePrice,
      });
    }

    const result = computeIndicators(candles);
    expect(result.stoch).not.toBeNull();
    expect(result.stoch!.k).toBeGreaterThanOrEqual(0);
    expect(result.stoch!.k).toBeLessThanOrEqual(100);
    expect(result.stoch!.d).toBeGreaterThanOrEqual(0);
    expect(result.stoch!.d).toBeLessThanOrEqual(100);
  });
});
