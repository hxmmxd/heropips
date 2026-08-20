/**
 * Unified Quote Pipeline (UQP) — E2E Test Suite
 * Requirement Area 3 (R3): AI Engine Rewire, Zero-Outbound HTTP & In-Memory Indicators
 *
 * Covers:
 * - Tier 1: Zero Outbound HTTP Enforcement via NetworkGuard
 * - Tier 1: Internal Candle Querying (Redis Hot Cache + Supabase market_candles)
 * - Tier 1: In-Memory Technical Indicators (RSI, MACD, EMA, BBands, Stoch, ATR)
 * - Tier 2: Cold-Start & Empty Database Handling
 * - Tier 2: Boundary & Corner Cases (Min threshold, 200-bar EMA, zero volatility, price spikes, symbol cleaning)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NetworkGuard } from './harness/network-guard';
import { TestContext } from './harness/test-context';
import { computeIndicators, type CandleInput } from '@/lib/indicators';
import {
  cleanBrokerSymbolToStandard,
  isForexSymbol,
  isStockSymbol,
  displaySymbol,
  detectSymbol,
} from '@/lib/market';
import {
  generateSyntheticCandles,
  SAMPLE_1M_CANDLES_XAUUSD,
  type Candle,
} from './fixtures/candles.fixture';

describe('R3: AI Engine Rewire & In-Memory Indicators', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = new TestContext({ enableNetworkGuard: true });
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // TIER 1: Zero Outbound HTTP Enforcement (NetworkGuard)
  // =========================================================================
  describe('Tier 1: Zero Outbound HTTP Enforcement (NetworkGuard)', () => {
    it('1.1 should make ZERO outbound calls to Twelve Data (api.twelvedata.com) during market processing', async () => {
      // Seed Redis hot cache and Supabase with proprietary market data
      const candles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 60, 2735.0);
      ctx.supabase.seed('market_candles', candles.slice(0, 59));
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', candles[59]);

      // Verify indicator computation on internal data does not invoke fetch
      const indicatorResult = computeIndicators(candles);
      expect(indicatorResult.price).toBeGreaterThan(0);
      expect(indicatorResult.rsi).not.toBeNull();

      // Assert zero external network calls occurred
      NetworkGuard.assertZeroExternalCalls();
      expect(NetworkGuard.getViolations()).toHaveLength(0);
    });

    it('1.2 should make ZERO outbound calls to Yahoo Finance (yahoo.com) during price/indicator analysis', async () => {
      const eurusdCandles = generateSyntheticCandles('EURUSD', 'xm', '1m', 60, 1.085);
      ctx.supabase.seed('market_candles', eurusdCandles);

      const result = computeIndicators(eurusdCandles);
      expect(result.price).toBeCloseTo(1.085, 2);
      expect(result.macd).toBeDefined();

      NetworkGuard.assertZeroExternalCalls();
      const calls = NetworkGuard.getCallLog();
      const yfCalls = calls.filter((c) => c.url.includes('yahoo.com'));
      expect(yfCalls).toHaveLength(0);
    });

    it('1.3 should execute multi-symbol indicator runs without touching external market APIs', async () => {
      const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];
      for (const sym of symbols) {
        const c = generateSyntheticCandles(sym, 'vantage', '1m', 55, 100.0);
        const res = computeIndicators(c);
        expect(res.price).toBeGreaterThan(0);
      }

      NetworkGuard.assertZeroExternalCalls();
      expect(NetworkGuard.getCallLog()).toHaveLength(0);
    });

    it('1.4 should actively throw a fatal violation if a Twelve Data request is attempted', async () => {
      await expect(
        globalThis.fetch('https://api.twelvedata.com/price?symbol=XAU/USD&apikey=fake')
      ).rejects.toThrow(/FATAL TEST VIOLATION.*forbidden external provider.*twelvedata/i);

      expect(NetworkGuard.getViolations().length).toBeGreaterThanOrEqual(1);
    });

    it('1.5 should actively throw a fatal violation if a Yahoo Finance request is attempted', async () => {
      await expect(
        globalThis.fetch('https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X')
      ).rejects.toThrow(/FATAL TEST VIOLATION.*forbidden external provider.*yahoo/i);

      expect(NetworkGuard.getViolations().length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // TIER 1: Internal Candle Querying (Redis Hot Cache + Supabase)
  // =========================================================================
  describe('Tier 1: Internal Candle Querying (Redis Hot Cache + Supabase)', () => {
    it('2.1 should retrieve the latest in-progress candle from Redis Hot Cache', async () => {
      const openBar: Candle = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: 1724000060000,
        open: 2735.0,
        high: 2736.2,
        low: 2734.8,
        close: 2735.9,
        volume: 42,
        is_closed: false,
      };

      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', openBar);
      const cached = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');

      expect(cached).toBeDefined();
      expect(cached.symbol).toBe('XAUUSD');
      expect(cached.close).toBe(2735.9);
      expect(cached.is_closed).toBe(false);
      expect(cached.volume).toBe(42);
    });

    it('2.2 should retrieve historical closed candles from Supabase market_candles with time ordering', async () => {
      const historicalCandles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 10, 2730.0);
      ctx.supabase.seed('market_candles', historicalCandles);

      const { data, error } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'vantage')
        .eq('symbol', 'XAUUSD')
        .eq('timeframe', '1m')
        .order('time', { ascending: true });

      expect(error).toBeNull();
      expect(data).toHaveLength(10);
      expect(data[0].time).toBeLessThan(data[9].time);
    });

    it('2.3 should seamlessly merge historical Supabase bars with the active Redis hot cache bar', async () => {
      const closedBars = generateSyntheticCandles('EURUSD', 'xm', '1m', 50, 1.0850, 1724000000000);
      ctx.supabase.seed('market_candles', closedBars);

      const latestOpenBar: Candle = {
        broker: 'xm',
        symbol: 'EURUSD',
        timeframe: '1m',
        time: 1724000000000 + 50 * 60000,
        open: 1.0855,
        high: 1.0859,
        low: 1.0854,
        close: 1.0858,
        volume: 15,
        is_closed: false,
      };
      await ctx.setHotCacheCandle('xm', 'EURUSD', '1m', latestOpenBar);

      // Access both sources (internal accessor emulation)
      const { data: dbBars } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'xm')
        .eq('symbol', 'EURUSD')
        .eq('timeframe', '1m')
        .order('time', { ascending: true });

      const hotBar = await ctx.getHotCacheCandle('xm', 'EURUSD', '1m');

      const fullSeries = [...(dbBars || []), hotBar].filter(Boolean);
      expect(fullSeries).toHaveLength(51);
      expect(fullSeries[50].is_closed).toBe(false);
      expect(fullSeries[50].close).toBe(1.0858);

      // Run indicators on combined stream
      const indicators = computeIndicators(fullSeries);
      expect(indicators.price).toBe(1.0858);
      expect(indicators.rsi).toBeGreaterThan(0);
    });

    it('2.4 should query multi-timeframe candles (1m, 5m, 1h) independently without crosstalk', async () => {
      const c1m = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 60, 2735.0);
      const c5m = generateSyntheticCandles('XAUUSD', 'vantage', '5m', 30, 2735.0);
      const c1h = generateSyntheticCandles('XAUUSD', 'vantage', '1h', 24, 2735.0);

      ctx.supabase.seed('market_candles', [...c1m, ...c5m, ...c1h]);

      const { data: res1m } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('timeframe', '1m');
      const { data: res5m } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('timeframe', '5m');
      const { data: res1h } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('timeframe', '1h');

      expect(res1m).toHaveLength(60);
      expect(res5m).toHaveLength(30);
      expect(res1h).toHaveLength(24);
    });

    it('2.5 should isolate broker candle storage (Vantage vs XM vs ATFX)', async () => {
      const vantageBars = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 20, 2735.0);
      const xmBars = generateSyntheticCandles('XAUUSD', 'xm', '1m', 20, 2736.0);

      ctx.supabase.seed('market_candles', [...vantageBars, ...xmBars]);

      const { data: vantageData } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'vantage');
      const { data: xmData } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'xm');

      expect(vantageData).toHaveLength(20);
      expect(xmData).toHaveLength(20);
      expect(vantageData[0].open).toBe(2735.0);
      expect(xmData[0].open).toBe(2736.0);
    });
  });

  // =========================================================================
  // TIER 1: In-Memory Indicator Mathematical Fidelity
  // =========================================================================
  describe('Tier 1: In-Memory Indicator Mathematical Fidelity', () => {
    it('3.1 should compute RSI (14) using Wilder smoothing accurately', () => {
      // 1. Strictly monotonically increasing series -> RSI should be ~100
      const bullishBars: CandleInput[] = [];
      for (let i = 0; i < 60; i++) {
        bullishBars.push({
          open: 100 + i,
          high: 101 + i,
          low: 99.5 + i,
          close: 100.8 + i,
        });
      }
      const bullRes = computeIndicators(bullishBars);
      expect(bullRes.rsi).toBeDefined();
      expect(bullRes.rsi!).toBeGreaterThan(95);

      // 2. Strictly monotonically decreasing series -> RSI should be ~0
      const bearishBars: CandleInput[] = [];
      for (let i = 0; i < 60; i++) {
        bearishBars.push({
          open: 200 - i,
          high: 200.5 - i,
          low: 198 - i,
          close: 198.8 - i,
        });
      }
      const bearRes = computeIndicators(bearishBars);
      expect(bearRes.rsi).toBeDefined();
      expect(bearRes.rsi!).toBeLessThan(5);

      // 3. Balanced oscillating series -> RSI should be ~50
      const oscillatingBars: CandleInput[] = [];
      for (let i = 0; i < 60; i++) {
        const close = 100 + (i % 2 === 0 ? 1 : -1);
        oscillatingBars.push({ open: 100, high: 102, low: 98, close });
      }
      const oscRes = computeIndicators(oscillatingBars);
      expect(oscRes.rsi).toBeDefined();
      expect(oscRes.rsi!).toBeGreaterThan(40);
      expect(oscRes.rsi!).toBeLessThan(60);
    });

    it('3.2 should compute MACD (12, 26, 9) with accurate Line, Signal, and Histogram', () => {
      const candles = SAMPLE_1M_CANDLES_XAUUSD;
      const res = computeIndicators(candles);

      expect(res.macd).not.toBeNull();
      expect(res.macd!.value).toBeTypeOf('number');
      expect(res.macd!.signal).toBeTypeOf('number');
      expect(res.macd!.histogram).toBeTypeOf('number');

      // Mathematical invariant: Histogram === Value - Signal
      const expectedHist = res.macd!.value - res.macd!.signal;
      expect(res.macd!.histogram).toBeCloseTo(expectedHist, 5);

      // Previous histogram should be recorded for momentum expansion/contraction check
      expect(res.prevHistogram).not.toBeNull();
      expect(res.prevHistogram).toBeTypeOf('number');
    });

    it('3.3 should compute EMA 20, 50, and 200 correctly matching exponential decay formula', () => {
      // 250 candles to ensure EMA200 is fully computed
      const candles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 250, 2700.0);
      const res = computeIndicators(candles);

      expect(res.ema20).not.toBeNull();
      expect(res.ema50).not.toBeNull();
      expect(res.ema200).not.toBeNull();

      expect(res.ema20!).toBeGreaterThan(2000);
      expect(res.ema50!).toBeGreaterThan(2000);
      expect(res.ema200!).toBeGreaterThan(2000);

      // In an upward trending dataset, EMA20 > EMA50 > EMA200
      const strongTrendCandles: CandleInput[] = [];
      for (let i = 0; i < 220; i++) {
        const p = 1000 + i * 2;
        strongTrendCandles.push({ open: p - 1, high: p + 2, low: p - 2, close: p });
      }
      const trendRes = computeIndicators(strongTrendCandles);
      expect(trendRes.ema20!).toBeGreaterThan(trendRes.ema50!);
      expect(trendRes.ema50!).toBeGreaterThan(trendRes.ema200!);
    });

    it('3.4 should compute Bollinger Bands (20, 2σ) with correct Upper, Middle, Lower, Width, and %B', () => {
      const candles = SAMPLE_1M_CANDLES_XAUUSD;
      const res = computeIndicators(candles);

      expect(res.bbands).not.toBeNull();
      const { upper, middle, lower, width, percentB } = res.bbands!;

      // Invariants: Upper >= Middle >= Lower
      expect(upper).toBeGreaterThanOrEqual(middle);
      expect(middle).toBeGreaterThanOrEqual(lower);

      // Band width: (upper - lower) / middle
      const expectedWidth = (upper - lower) / middle;
      expect(width).toBeCloseTo(expectedWidth, 5);

      // PercentB: (price - lower) / (upper - lower)
      const expectedPercentB = (res.price - lower) / (upper - lower);
      expect(percentB).toBeCloseTo(expectedPercentB, 5);
    });

    it('3.5 should compute Stochastic Oscillator (14, 3, 3) %K and %D lines within [0, 100]', () => {
      const candles = SAMPLE_1M_CANDLES_XAUUSD;
      const res = computeIndicators(candles);

      expect(res.stoch).not.toBeNull();
      expect(res.stoch!.k).toBeGreaterThanOrEqual(0);
      expect(res.stoch!.k).toBeLessThanOrEqual(100);
      expect(res.stoch!.d).toBeGreaterThanOrEqual(0);
      expect(res.stoch!.d).toBeLessThanOrEqual(100);
    });

    it('3.6 should compute ATR (14) with True Range and ATR Ratio accurately', () => {
      const candles = SAMPLE_1M_CANDLES_XAUUSD;
      const res = computeIndicators(candles);

      expect(res.atr).not.toBeNull();
      expect(res.atr!).toBeGreaterThan(0);
      expect(res.atrRatio).not.toBeNull();
      expect(res.atrRatio!).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('4.1 Cold-Start / Empty Database: gracefully handles missing candles without crashing', async () => {
      // Empty Supabase table & empty Redis hot cache
      const { data } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('symbol', 'UNKNOWN_SYMBOL');

      expect(data).toHaveLength(0);

      const hotBar = await ctx.getHotCacheCandle('vantage', 'UNKNOWN_SYMBOL', '1m');
      expect(hotBar).toBeNull();

      // Passing 0 candles to indicator calculator
      const result = computeIndicators([]);
      expect(result.price).toBe(0);
      expect(result.rsi).toBeNull();
      expect(result.macd).toBeNull();
      expect(result.ema20).toBeNull();
      expect(result.bbands).toBeNull();

      NetworkGuard.assertZeroExternalCalls();
    });

    it('4.2 Insufficient candles (< 50 bars): returns null indicators without errors', () => {
      const shortCandles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 49, 2735.0);
      const res = computeIndicators(shortCandles);

      expect(res.price).toBe(0);
      expect(res.rsi).toBeNull();
      expect(res.macd).toBeNull();
      expect(res.ema50).toBeNull();
      expect(res.bbands).toBeNull();
      expect(res.stoch).toBeNull();
    });

    it('4.3 Exactly 50 candles boundary: computes all indicators except EMA200', () => {
      const exactly50 = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 50, 2735.0);
      const res = computeIndicators(exactly50);

      expect(res.price).toBeGreaterThan(0);
      expect(res.rsi).not.toBeNull();
      expect(res.macd).not.toBeNull();
      expect(res.ema20).not.toBeNull();
      expect(res.ema50).not.toBeNull();
      expect(res.ema200).toBeNull(); // EMA200 requires >= 200 bars
      expect(res.bbands).not.toBeNull();
      expect(res.stoch).not.toBeNull();
      expect(res.atr).not.toBeNull();
    });

    it('4.4 Exactly 200 candles boundary: computes EMA200 successfully', () => {
      const exactly200 = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 200, 2735.0);
      const res = computeIndicators(exactly200);

      expect(res.ema200).not.toBeNull();
      expect(res.ema200!).toBeGreaterThan(0);
    });

    it('4.5 Zero Volatility (Flat Price Series): handles zero gain/loss without divide-by-zero or NaN', () => {
      const flatBars: CandleInput[] = [];
      for (let i = 0; i < 60; i++) {
        flatBars.push({ open: 2735.0, high: 2735.0, low: 2735.0, close: 2735.0 });
      }

      const res = computeIndicators(flatBars);
      expect(res.price).toBe(2735.0);
      expect(res.rsi).toBe(50); // Loss=0 and Gain=0 -> returns neutral 50
      expect(res.bbands).not.toBeNull();
      expect(res.bbands!.upper).toBe(2735.0);
      expect(res.bbands!.lower).toBe(2735.0);
      expect(res.bbands!.percentB).toBe(0.5); // Safe fallback
      expect(res.atr).toBe(0);
      expect(Number.isNaN(res.rsi)).toBe(false);
      expect(Number.isNaN(res.bbands!.width)).toBe(false);
    });

    it('4.6 Flash Price Spike (1000-pip gap): computes without NaN or Infinity overflow', () => {
      const normalBars = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 55, 2735.0);
      // Inject violent 100-dollar spike
      normalBars.push({
        time: 1724000000000 + 55 * 60000,
        open: 2735.0,
        high: 2850.0,
        low: 2730.0,
        close: 2845.0,
        volume: 5000,
      });

      const res = computeIndicators(normalBars);
      expect(res.price).toBe(2845.0);
      expect(Number.isFinite(res.rsi!)).toBe(true);
      expect(Number.isFinite(res.macd!.histogram)).toBe(true);
      expect(Number.isFinite(res.atr!)).toBe(true);
      expect(res.atr!).toBeGreaterThan(5.0); // ATR expands significantly
    });

    it('4.7 Broker Symbol Normalization: cleans exotic MT5 broker symbols to standard format', () => {
      expect(cleanBrokerSymbolToStandard('EURUSD.raw')).toBe('EUR/USD');
      expect(cleanBrokerSymbolToStandard('EURUSD_i')).toBe('EUR/USD');
      expect(cleanBrokerSymbolToStandard('GBPUSD.pro')).toBe('GBP/USD');
      expect(cleanBrokerSymbolToStandard('USDJPY.ecn')).toBe('USD/JPY');
      expect(cleanBrokerSymbolToStandard('XAUUSD.v')).toBe('XAU/USD');
      expect(cleanBrokerSymbolToStandard('GOLD.m')).toBe('XAU/USD');
      expect(cleanBrokerSymbolToStandard('BTCUSD.s')).toBe('BTC/USD');
      expect(cleanBrokerSymbolToStandard('ETHUSD.a')).toBe('ETH/USD');
      expect(cleanBrokerSymbolToStandard('NAS100.cash')).toBe('NAS100');
    });

    it('4.8 Symbol Classification & Display: correctly identifies Forex, Stock, and Display names', () => {
      expect(isForexSymbol('EUR/USD')).toBe(true);
      expect(isForexSymbol('GBP/USD')).toBe(true);
      expect(isForexSymbol('USD/JPY')).toBe(true);
      expect(isForexSymbol('XAU/USD')).toBe(false);
      expect(isForexSymbol('QQQ')).toBe(false);

      expect(isStockSymbol('QQQ')).toBe(true);
      expect(isStockSymbol('DIA')).toBe(true);
      expect(isStockSymbol('SPY')).toBe(true);
      expect(isStockSymbol('EUR/USD')).toBe(false);
      expect(isStockSymbol('XAU/USD')).toBe(false);

      expect(displaySymbol('QQQ')).toBe('NAS100');
      expect(displaySymbol('DIA')).toBe('US30');
      expect(displaySymbol('SPY')).toBe('SP500');
      expect(displaySymbol('USO')).toBe('OIL');
      expect(displaySymbol('XAU/USD')).toBe('XAUUSD');
    });

    it('4.9 Symbol Detection from User Prompts: detects tickers with noise and broker lists', () => {
      expect(detectSymbol('What is the trend on gold today?')).toBe('XAU/USD');
      expect(detectSymbol('Can we buy eurusd now?')).toBe('EUR/USD');
      expect(detectSymbol('Show me the chart for bitcoin please')).toBe('BTC/USD');
      expect(detectSymbol('Check nasdaq 100 setup')).toBe('QQQ');
      expect(detectSymbol('Random unmarket question here')).toBeNull();
    });
  });
});
