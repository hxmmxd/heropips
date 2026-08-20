/**
 * Adversarial Challenger Test Suite for Milestone M3 (R3 AI Rewire & SSE Streaming)
 * Challenger: Challenger M3-1
 *
 * Adversarial Scenarios Challenged:
 * 1. Cold-Start Scenarios (Empty Redis, Empty Supabase, Missing DB, Hermetic Fallback)
 * 2. Zero Outbound Network Leakage (Strict intercept and assertion against TwelveData / Yahoo)
 * 3. Corrupted / Extreme Candle Data & NaN/Infinity Edge Cases in Indicators
 * 4. Multi-Broker & Exotic Symbol Normalization Stress Tests
 * 5. SSE Price Stream Debounce & Memory Leak / Abort Signal Robustness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NetworkGuard } from './harness/network-guard';
import { TestContext } from './harness/test-context';
import {
  getInternalCandles,
  getMultiTimeframeCandles,
  getCorrelatedCandles,
  generateHermeticCandles,
} from '@/lib/internalCandles';
import {
  getMarketSnapshot,
  fetchCandles,
  fetchNewsHeadlines,
  scoreIndicators,
  calculateRiskParams,
  cleanBrokerSymbolToStandard,
  isForexSymbol,
  isStockSymbol,
  detectSymbol,
} from '@/lib/market';
import { computeIndicators } from '@/lib/indicators';
import { computeVWAP } from '@/lib/vwap';
import { getMTFBias } from '@/lib/mtfBias';
import { detectCandlePatterns } from '@/lib/candlePatterns';
import { checkCorrelation } from '@/lib/correlation';
import { generateSyntheticCandles } from './fixtures/candles.fixture';

describe('Adversarial Challenger M3-1: R3 AI Rewire & Engine Robustness', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = new TestContext({ enableNetworkGuard: true });
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // CHALLENGE 1: Cold-Start & Database Absence Resilience
  // =========================================================================
  describe('Challenge 1: Cold-Start & Zero-Data Fallbacks', () => {
    it('1.1 should generate mathematically valid candles when Redis, Supabase, and Historical DB are completely empty', async () => {
      // With zero seeded data in mock Supabase and mock Redis:
      const candles = await getInternalCandles('XAUUSD', '1h', 50, 'vantage');
      expect(candles).toBeDefined();
      expect(candles).toHaveLength(50);
      expect(candles[0].symbol).toBe('XAUUSD');
      expect(candles[0].broker).toBe('vantage');
      expect(candles[0].timeframe).toBe('1h');
      expect(candles[0].open).toBeGreaterThan(0);
      expect(candles[0].high).toBeGreaterThanOrEqual(candles[0].open);
      expect(candles[0].low).toBeLessThanOrEqual(candles[0].open);
      expect(candles[49].close).toBeGreaterThan(0);

      // Verify indicator calculation works immediately on hermetic fallback
      const indicators = computeIndicators(candles);
      expect(indicators.price).toBeGreaterThan(0);
      expect(indicators.rsi).toBeGreaterThanOrEqual(0);
      expect(indicators.rsi).toBeLessThanOrEqual(100);
      expect(indicators.macd).not.toBeNull();
      expect(indicators.bbands).not.toBeNull();
      expect(indicators.stoch).not.toBeNull();
    });

    it('1.2 should successfully construct full MarketSnapshot in cold-start condition with zero network leakage', async () => {
      const snapshot = await getMarketSnapshot('XAU/USD', 'vantage');
      expect(snapshot).not.toBeNull();
      expect(snapshot!.symbol).toBe('XAU/USD');
      expect(snapshot!.price).toBeGreaterThan(0);
      expect(snapshot!.confluenceScore).toBeGreaterThanOrEqual(0);
      expect(snapshot!.confluenceScore).toBeLessThanOrEqual(100);
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(snapshot!.confluenceDirection);
      expect(snapshot!.gateResults.length).toBeGreaterThanOrEqual(12);

      // Strictly assert zero outbound external HTTP calls
      NetworkGuard.assertZeroExternalCalls();
      expect(NetworkGuard.getViolations()).toHaveLength(0);
    });

    it('1.3 should handle unknown / unprofiled symbols hermetically without throwing', async () => {
      const candles = await getInternalCandles('UNKNOWN_CRYPTO_PAIR', '15m', 60, 'custom_broker');
      expect(candles).toHaveLength(60);
      expect(candles[0].symbol).toBe('UNKNOWN_CRYPTO_PAIR');
      expect(candles[0].broker).toBe('custom_broker');
      expect(candles[0].open).toBe(100.0); // Default fallback profile basePrice
    });
  });

  // =========================================================================
  // CHALLENGE 2: Zero Outbound Network Leakage & Strict Isolation
  // =========================================================================
  describe('Challenge 2: Zero Outbound Network Leakage Verification', () => {
    it('2.1 should execute all 12 confluence gates with zero external HTTP calls', async () => {
      const symbols = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'QQQ'];
      for (const sym of symbols) {
        const snapshot = await getMarketSnapshot(sym, 'vantage');
        expect(snapshot).not.toBeNull();
        expect(snapshot!.price).toBeGreaterThan(0);
      }

      NetworkGuard.assertZeroExternalCalls();
      expect(NetworkGuard.getViolations()).toHaveLength(0);
    });

    it('2.2 should execute fetchCandles and fetchNewsHeadlines with zero external HTTP calls', async () => {
      const chartCandles = await fetchCandles('EUR/USD', '1h', 50, 'xm');
      expect(chartCandles).toHaveLength(50);
      expect(chartCandles[0].close).toBeGreaterThan(0);

      const news = await fetchNewsHeadlines(5);
      expect(Array.isArray(news)).toBe(true);

      NetworkGuard.assertZeroExternalCalls();
    });

    it('2.3 should ensure getMultiTimeframeCandles and getCorrelatedCandles never trigger external HTTP', async () => {
      const mtf = await getMultiTimeframeCandles('XAU/USD', 'vantage');
      expect(mtf.m15.length).toBe(200);
      expect(mtf.h1.length).toBe(50);
      expect(mtf.d1.length).toBe(60);
      expect(mtf.w1.length).toBe(52);

      const corr = await getCorrelatedCandles('XAU/USD', 'vantage');
      expect(corr).toBeDefined();

      NetworkGuard.assertZeroExternalCalls();
    });
  });

  // =========================================================================
  // CHALLENGE 3: Corrupted Data, NaN/Infinity, and Indicator Edge Cases
  // =========================================================================
  describe('Challenge 3: Corrupted Data, NaN/Infinity & Edge Cases', () => {
    it('3.1 Flat Price Series (0% Volatility): handles zero variance without NaN or divide-by-zero', () => {
      const flatCandles = Array.from({ length: 60 }, () => ({
        open: 1.085,
        high: 1.085,
        low: 1.085,
        close: 1.085,
      }));

      const ind = computeIndicators(flatCandles);
      expect(ind.price).toBe(1.085);
      expect(ind.rsi).toBe(50); // Safe neutral fallback
      expect(ind.macd?.value).toBe(0);
      expect(ind.macd?.histogram).toBe(0);
      expect(ind.bbands?.percentB).toBe(0.5);
      expect(ind.bbands?.width).toBe(0);
      expect(ind.stoch?.k).toBe(50);
      expect(ind.atr).toBe(0);
      expect(ind.atrRatio).toBe(1);

      // Verify scoreIndicators handles 0 volatility gracefully
      const score = scoreIndicators(
        ind.price,
        ind.rsi,
        ind.macd ? { macd: ind.macd.value, signal: ind.macd.signal, histogram: ind.macd.histogram } : null,
        ind.ema20,
        ind.ema50,
        ind.ema200,
        ind.bbands,
        ind.stoch,
        'neutral',
        null,
        null,
        null,
        ind.atrRatio,
        ind.prevHistogram
      );
      expect(Number.isFinite(score.score)).toBe(true);
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(score.direction);
    });

    it('3.2 Massive Price Spike (10,000% gap): indicator values remain finite numbers', () => {
      const normal = generateSyntheticCandles('BTCUSD', 'vantage', '1h', 55, 60000.0);
      normal.push({
        time: 1724000000000 + 55 * 3600000,
        open: 60000.0,
        high: 600000.0, // 10x spike
        low: 59000.0,
        close: 580000.0,
        volume: 999999,
        broker: 'vantage',
        symbol: 'BTCUSD',
        timeframe: '1h',
        is_closed: true,
      });

      const ind = computeIndicators(normal);
      expect(Number.isFinite(ind.price)).toBe(true);
      expect(Number.isFinite(ind.rsi!)).toBe(true);
      expect(Number.isFinite(ind.macd!.histogram)).toBe(true);
      expect(Number.isFinite(ind.atr!)).toBe(true);
      expect(Number.isFinite(ind.bbands!.upper)).toBe(true);
      expect(Number.isFinite(ind.stoch!.k)).toBe(true);
    });

    it('3.3 Extreme Small Fractional Prices (e.g. 0.00000123 crypto): computes valid indicators', () => {
      const tinyCandles = Array.from({ length: 60 }, (_, i) => ({
        open: 0.0000100 + i * 0.0000001,
        high: 0.0000105 + i * 0.0000001,
        low: 0.0000095 + i * 0.0000001,
        close: 0.0000102 + i * 0.0000001,
      }));

      const ind = computeIndicators(tinyCandles);
      expect(ind.price).toBeCloseTo(0.0000161, 6);
      expect(ind.rsi!).toBeGreaterThan(80);
      expect(Number.isFinite(ind.macd!.histogram)).toBe(true);
    });

    it('3.4 VWAP with 0 volume candles: falls back to price range proxy without NaN', () => {
      const zeroVolCandles = Array.from({ length: 50 }, (_, i) => ({
        time: new Date(Date.now() - (50 - i) * 3600000).toISOString(),
        open: 2730.0 + i * 0.1,
        high: 2731.0 + i * 0.1,
        low: 2729.0 + i * 0.1,
        close: 2730.5 + i * 0.1,
        volume: 0,
      }));

      const vwapRes = computeVWAP(zeroVolCandles, 2735.4);
      expect(Number.isFinite(vwapRes.vwap)).toBe(true);
      expect(Number.isFinite(vwapRes.upperBand1)).toBe(true);
      expect(Number.isFinite(vwapRes.lowerBand1)).toBe(true);
      expect(['above', 'below', 'at']).toContain(vwapRes.priceRelation);
    });

    it('3.5 Candlestick Pattern detection: handles identical OHLC candles without index errors', () => {
      const identicalCandles = Array.from({ length: 5 }, () => ({
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));

      const patterns = detectCandlePatterns(identicalCandles);
      expect(patterns).toBeDefined();
      expect(patterns.signal).toBe('neutral');
      expect(patterns.strength).toBe(0);
    });

    it('3.6 Position sizing (calculateRiskParams): handles extreme account sizes and high risk percentages safely', () => {
      // Normal retail account
      const retail = calculateRiskParams(2735.0, 15.0, 'BUY', 10000, 1.5, 'XAU/USD');
      expect(retail.stopLoss).toBeDefined();
      expect(retail.takeProfit).toBeDefined();
      expect(retail.lotVolume).toMatch(/^[0-9.]+ Lots$/);

      // Micro account ($10 balance)
      const micro = calculateRiskParams(2735.0, 15.0, 'BUY', 10, 1.0, 'XAU/USD');
      expect(parseFloat(micro.lotVolume)).toBeGreaterThanOrEqual(0.01); // Minimum 0.01 lot

      // Institutional account ($10,000,000 balance)
      const whale = calculateRiskParams(2735.0, 15.0, 'BUY', 10000000, 2.0, 'XAU/USD');
      expect(parseFloat(whale.lotVolume)).toBeLessThanOrEqual(50.0); // Maximum 50.0 lot cap
    });
  });

  // =========================================================================
  // CHALLENGE 4: Multi-Broker Partitioning & Symbol Mapping
  // =========================================================================
  describe('Challenge 4: Multi-Broker Partitioning & Symbol Mapping', () => {
    it('4.1 should strictly partition candle queries across brokers', async () => {
      const vantageBars = generateSyntheticCandles('EURUSD', 'vantage', '1m', 30, 1.0850);
      const xmBars = generateSyntheticCandles('EURUSD', 'xm', '1m', 30, 1.0870);

      ctx.supabase.seed('market_candles', [...vantageBars, ...xmBars]);

      const vantageRes = await getInternalCandles('EURUSD', '1m', 30, 'vantage');
      const xmRes = await getInternalCandles('EURUSD', '1m', 30, 'xm');

      expect(vantageRes[0].broker).toBe('vantage');
      expect(xmRes[0].broker).toBe('xm');
      expect(vantageRes[0].open).toBe(1.0850);
      expect(xmRes[0].open).toBe(1.0870);
    });

    it('4.2 should accurately parse messy user prompt symbols and broker suffix tickers', () => {
      expect(cleanBrokerSymbolToStandard('XAUUSD.raw')).toBe('XAU/USD');
      expect(cleanBrokerSymbolToStandard('EURUSD.pro')).toBe('EUR/USD');
      expect(cleanBrokerSymbolToStandard('BTCUSD_ecn')).toBe('BTC/USD');
      expect(cleanBrokerSymbolToStandard('NAS100.cash')).toBe('NAS100');

      expect(detectSymbol('Give me technical analysis on gold right now')).toBe('XAU/USD');
      expect(detectSymbol('What do you think of eurusd today?')).toBe('EUR/USD');
      expect(detectSymbol('Is bitcoin bullish?')).toBe('BTC/USD');
      expect(detectSymbol('Check nasdaq momentum')).toBe('QQQ');
    });
  });
});
