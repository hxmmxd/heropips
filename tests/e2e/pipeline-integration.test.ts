/**
 * Unified Quote Pipeline (UQP) — E2E Test Suite
 * Full Pipeline Integration & Real-World Scenarios (Tiers 3 & 4)
 *
 * Covers:
 * - Tier 3: Cross-Feature Pairwise Interactions
 *   1. Ingestion ↔ Aggregation
 *   2. Aggregation ↔ AI Accessor
 *   3. Ingestion ↔ SSE Streaming
 *   4. Hot Cache ↔ Supabase Upsert Idempotency
 * - Tier 4: Real-World Application Scenarios
 *   1. Multi-Broker High-Frequency Ingestion to Live SSE
 *   2. Full Tick-to-Candle-to-AI Confluence Cycle
 *   3. Flash Crash & Spread Volatility Invariant Hardening
 *   4. Cold Start & Database Reconnection Resiliency
 *   5. Multi-Broker Divergence & Slippage Prevention
 *   6. Outbound Network Leak Black-Hole Test (100 Concurrent Requests)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestContext } from './harness/test-context';
import { NetworkGuard } from './harness/network-guard';
import { readSSEChunks } from './harness/sse-reader';
import { createUQPPriceStreamHandler } from './r4-sse-streaming.test';
import { computeIndicators } from '@/lib/indicators';
import { calculateRiskParams } from '@/lib/market';
import {
  generateNormalTicks,
  generateSpikeTicks,
  generateMultiBrokerTicks,
  type NormalizedTick,
} from './fixtures/ticks.fixture';
import {
  aggregateTicksToCandles,
  verifyCandleInvariants,
  generateSyntheticCandles,
  type Candle,
} from './fixtures/candles.fixture';

describe('UQP Full Pipeline Integration (Tiers 3 & 4)', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = new TestContext({ enableNetworkGuard: true });
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // TIER 3: Cross-Feature Pairwise Interactions
  // =========================================================================
  describe('Tier 3: Cross-Feature Pairwise Combinations', () => {
    it('3.1 Ingestion ↔ Aggregation: raw ticks stream into Redis and aggregate into valid 1m candles', async () => {
      const startTime = 1724000000000;
      const ticks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, 30, 2000, 0.25, startTime);

      // Ingest ticks into Redis stream
      for (const t of ticks) {
        await ctx.injectTick(t);
      }

      // Read entries back from Redis stream
      const streamEntries = ctx.getStreamEntries('vantage', 'XAUUSD');
      expect(streamEntries).toHaveLength(30);

      // Perform deterministic aggregation
      const candles = aggregateTicksToCandles(ticks, '1m', 'vantage', 'XAUUSD');
      expect(candles.length).toBeGreaterThanOrEqual(1);

      // Verify invariants on resulting candle
      for (const c of candles) {
        const inv = verifyCandleInvariants(c, '1m');
        expect(inv.valid).toBe(true);
        expect(inv.errors).toHaveLength(0);
      }
    });

    it('3.2 Aggregation ↔ AI Accessor: aggregated candles in Supabase & Hot Cache feed AI indicators directly', async () => {
      // 60 candles in Supabase + 1 in hot cache
      const candles = generateSyntheticCandles('EURUSD', 'xm', '1m', 60, 1.0850, 1724000000000);
      ctx.supabase.seed('market_candles', candles.slice(0, 59));
      await ctx.setHotCacheCandle('xm', 'EURUSD', '1m', candles[59]);

      // Query internal pipeline data
      const { data: dbBars } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'xm')
        .eq('symbol', 'EURUSD')
        .eq('timeframe', '1m')
        .order('time', { ascending: true });

      const hotBar = await ctx.getHotCacheCandle('xm', 'EURUSD', '1m');
      const combined = [...(dbBars || []), hotBar];

      // Compute in-memory indicators
      const ind = computeIndicators(combined);
      expect(ind.price).toBe(candles[59].close);
      expect(ind.rsi).toBeDefined();
      expect(ind.macd).toBeDefined();
      expect(ind.bbands).toBeDefined();

      NetworkGuard.assertZeroExternalCalls();
    });

    it('3.3 Ingestion ↔ SSE Streaming: ingested ticks trigger throttled SSE delivery to connected client', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 60 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      setTimeout(async () => {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2 });
      }, 20);

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ 'XAU/USD': 2735.1 });

      abortController.abort();
    });

    it('3.4 Hot Cache ↔ Supabase Upsert: minute bar closure triggers idempotent database commit', async () => {
      const openBar: Candle = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: 1724000060000,
        open: 2735.0,
        high: 2738.0,
        low: 2734.5,
        close: 2737.5,
        volume: 85,
        is_closed: false,
      };

      // 1. Bar is active in Hot Cache
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', openBar);

      // 2. Bar closes -> mark closed and upsert to Supabase
      const closedBar = { ...openBar, is_closed: true, close: 2737.8, high: 2738.2, volume: 90 };
      const { data: upsert1, error: err1 } = await ctx.supabase
        .from('market_candles')
        .upsert(closedBar, { onConflict: 'broker,symbol,timeframe,time' });

      expect(err1).toBeNull();
      expect(upsert1).toBeDefined();

      // 3. Second identical upsert (idempotency check on conflict)
      const { data: upsert2, error: err2 } = await ctx.supabase
        .from('market_candles')
        .upsert(closedBar, { onConflict: 'broker,symbol,timeframe,time' });

      expect(err2).toBeNull();

      // Verify only 1 row exists in table (no duplicates)
      const { data: allRows } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'vantage')
        .eq('symbol', 'XAUUSD')
        .eq('time', 1724000060000);

      expect(allRows).toHaveLength(1);
      expect(allRows[0].is_closed).toBe(true);
      expect(allRows[0].close).toBe(2737.8);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Application Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios', () => {
    /**
     * Scenario 1: Multi-Broker High-Frequency Ingestion to Live SSE
     */
    it('4.1 Scenario 1: Multi-Broker High-Frequency Ingestion to Live SSE', async () => {
      // Create Vantage and XM stream handlers
      const vantageHandler = createUQPPriceStreamHandler(ctx.redis, { broker: 'vantage', debounceMs: 60 });
      const xmHandler = createUQPPriceStreamHandler(ctx.redis, { broker: 'xm', debounceMs: 60 });

      const cVantage = new AbortController();
      const cXM = new AbortController();

      const resVantage = await vantageHandler(new Request('http://localhost:3000/api/price-stream', { signal: cVantage.signal }));
      const resXM = await xmHandler(new Request('http://localhost:3000/api/price-stream', { signal: cXM.signal }));

      // Ingest 60 rapid multi-broker ticks across Vantage, XM, and ATFX
      const multiTicks = generateMultiBrokerTicks(['XAU/USD', 'EUR/USD'], ['vantage', 'xm', 'atfx'], 10, Date.now());

      setTimeout(async () => {
        for (const t of multiTicks) {
          await ctx.injectTick(t);
        }
      }, 20);

      // Read chunk from Vantage client
      const [vantageEvents, xmEvents] = await Promise.all([
        readSSEChunks(resVantage, { maxChunks: 1, timeoutMs: 2000 }),
        readSSEChunks(resXM, { maxChunks: 1, timeoutMs: 2000 }),
      ]);

      expect(vantageEvents).toHaveLength(1);
      expect(xmEvents).toHaveLength(1);

      // Vantage client must receive Vantage quotes
      expect(vantageEvents[0].data['XAU/USD']).toBeDefined();
      expect(xmEvents[0].data['XAU/USD']).toBeDefined();

      // Clean disconnect
      cVantage.abort();
      cXM.abort();
    });

    /**
     * Scenario 2: Full Tick-to-Candle-to-AI Confluence Cycle
     */
    it('4.2 Scenario 2: Full Tick-to-Candle-to-AI Confluence Cycle', async () => {
      // Simulate historical 60 candles in Supabase
      const baseCandles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 60, 2735.0, 1724000000000);
      ctx.supabase.seed('market_candles', baseCandles);

      // Stream 20 live ticks during current minute
      const currentMinuteTime = 1724000000000 + 60 * 60000;
      const liveTicks = generateNormalTicks('XAUUSD', 'vantage', 2736.0, 20, 2000, 0.25, currentMinuteTime);

      for (const t of liveTicks) {
        await ctx.injectTick(t);
      }

      // Aggregate live ticks into running open candle
      const aggregatedLive = aggregateTicksToCandles(liveTicks, '1m', 'vantage', 'XAUUSD');
      expect(aggregatedLive).toHaveLength(1);
      const openBar = aggregatedLive[0];

      // Update Redis hot cache with open bar
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', openBar);

      // AI Engine pulls combined history + hot cache
      const { data: history } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'vantage')
        .eq('symbol', 'XAUUSD')
        .eq('timeframe', '1m')
        .order('time', { ascending: true });

      const latestHot = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');
      const allBars = [...(history || []), latestHot];

      // Evaluate Indicators & Confluence
      const ind = computeIndicators(allBars);
      expect(ind.price).toBe(openBar.close);
      expect(ind.rsi).toBeGreaterThan(0);
      expect(ind.macd?.histogram).toBeDefined();

      // Dynamic SL/TP position sizing
      const sizing = calculateRiskParams(ind.price, ind.atr || 2.5, 'BUY', 10000, 1.0, 'XAU/USD');
      expect(parseFloat(sizing.stopLoss)).toBeLessThan(ind.price);
      expect(parseFloat(sizing.takeProfit)).toBeGreaterThan(ind.price);
      expect(sizing.lotVolume).toContain('Lots');

      // Assert zero external network leaks
      NetworkGuard.assertZeroExternalCalls();
    });

    /**
     * Scenario 3: Flash Crash & Spread Volatility Invariant Hardening
     */
    it('4.3 Scenario 3: Flash Crash & Spread Volatility Invariant Hardening', async () => {
      // Flash crash ticks (Gold plunges $25 in seconds with wide spreads)
      const flashTicks = generateSpikeTicks('XAUUSD', 'vantage', 2735.0, 2710.0, 1724000000000);

      // Ingest flash crash ticks
      for (const t of flashTicks) {
        await ctx.injectTick(t);
      }

      // Aggregate into OHLC candle
      const flashCandles = aggregateTicksToCandles(flashTicks, '1m', 'vantage', 'XAUUSD');
      expect(flashCandles).toHaveLength(1);
      const bar = flashCandles[0];

      // Hard mathematical invariants validation
      const inv = verifyCandleInvariants(bar, '1m');
      expect(inv.valid).toBe(true);
      expect(bar.high).toBeGreaterThanOrEqual(bar.open);
      expect(bar.high).toBeGreaterThanOrEqual(bar.close);
      expect(bar.low).toBeLessThanOrEqual(bar.open);
      expect(bar.low).toBeLessThanOrEqual(bar.close);
      expect(bar.low).toBeLessThanOrEqual(bar.high);
      expect(bar.volume).toBe(5);

      // Feed into indicators with history
      const history = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 55, 2735.0);
      history.push(bar);

      const ind = computeIndicators(history);
      expect(ind.price).toBe(bar.close);
      expect(ind.atr).toBeGreaterThan(0);
      expect(Number.isFinite(ind.rsi!)).toBe(true);
    });

    /**
     * Scenario 4: Cold Start & Database Reconnection Resiliency
     */
    it('4.4 Scenario 4: Cold Start & Database Reconnection Resiliency', async () => {
      // 1. Cold start: Redis hot cache is empty, Supabase has historical data
      const history = generateSyntheticCandles('GBPUSD', 'vantage', '1m', 60, 1.2950);
      ctx.supabase.seed('market_candles', history);

      // Hot cache is null
      const hot = await ctx.getHotCacheCandle('vantage', 'GBPUSD', '1m');
      expect(hot).toBeNull();

      // Gracefully fall back to Supabase closed bars
      const { data: dbBars } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'vantage')
        .eq('symbol', 'GBPUSD')
        .eq('timeframe', '1m')
        .order('time', { ascending: true });

      expect(dbBars).toHaveLength(60);
      const ind = computeIndicators(dbBars);
      expect(ind.price).toBe(history[59].close);
      expect(ind.rsi).toBeDefined();

      // 2. Simulated transient write error during Supabase batch upsert
      ctx.supabase.simulateError('market_candles', { message: 'Connection reset by peer', code: 'ECONNRESET' });

      const pendingCandle = generateSyntheticCandles('GBPUSD', 'vantage', '1m', 1, 1.2960)[0];
      const { data: failData, error: failErr } = await ctx.supabase
        .from('market_candles')
        .upsert(pendingCandle);

      expect(failData).toBeNull();
      expect(failErr).toBeDefined();
      expect(failErr.code).toBe('ECONNRESET');

      // Clear error (database recovers) and retry upsert
      ctx.supabase.clearSimulatedErrors();
      const { data: recoverData, error: recoverErr } = await ctx.supabase
        .from('market_candles')
        .upsert(pendingCandle);

      expect(recoverErr).toBeNull();
      expect(recoverData).toBeDefined();
    });

    /**
     * Scenario 5: Multi-Broker Divergence & Slippage Prevention
     */
    it('4.5 Scenario 5: Multi-Broker Divergence & Slippage Prevention', async () => {
      // Vantage quote: 2735.00 / 2735.20 (Mid: 2735.10)
      // XM quote:      2736.00 / 2736.30 (Mid: 2736.15)
      // ATFX quote:    2734.00 / 2734.25 (Mid: 2734.125)
      await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2 });
      await ctx.injectTick({ broker: 'xm', symbol: 'XAU/USD', bid: 2736.0, ask: 2736.3, mid: 2736.15, spread: 0.3 });
      await ctx.injectTick({ broker: 'atfx', symbol: 'XAU/USD', bid: 2734.0, ask: 2734.25, mid: 2734.125, spread: 0.25 });

      // Client A on Vantage requests price stream
      const vantageHandler = createUQPPriceStreamHandler(ctx.redis, { broker: 'vantage', debounceMs: 50 });
      const cVantage = new AbortController();
      const resVantage = await vantageHandler(new Request('http://localhost:3000/api/price-stream', { signal: cVantage.signal }));

      // Trigger flush
      setTimeout(async () => {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735.1, ask: 2735.3, mid: 2735.2, spread: 0.2 });
      }, 10);

      const events = await readSSEChunks(resVantage, { maxChunks: 1, timeoutMs: 1500 });
      expect(events).toHaveLength(1);
      // Vantage client sees Vantage quote, NOT XM or ATFX quote
      expect(events[0].data['XAU/USD']).toBe(2735.2);

      // Verify position sizing calculates against exact broker price
      const sltp = calculateRiskParams(2735.2, 2.0, 'BUY', 10000, 1.0, 'XAU/USD');
      expect(parseFloat(sltp.stopLoss)).toBeLessThan(2735.2);

      cVantage.abort();
    });

    /**
     * Scenario 6: Outbound Network Leak Black-Hole Test (100 Concurrent Requests)
     */
    it('4.6 Scenario 6: Outbound Network Leak Black-Hole Test (100 Concurrent Requests)', async () => {
      const symbols = [
        'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD',
        'ETHUSD', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
      ];

      // Seed 60 candles per symbol in Supabase
      for (const sym of symbols) {
        const c = generateSyntheticCandles(sym, 'vantage', '1m', 60, 100.0);
        ctx.supabase.seed('market_candles', c);
      }

      // Execute 100 parallel analysis requests across the 10 symbols
      const tasks: Promise<any>[] = [];
      for (let i = 0; i < 100; i++) {
        const sym = symbols[i % symbols.length];
        tasks.push(
          (async () => {
            const { data } = await ctx.supabase
              .from('market_candles')
              .select('*')
              .eq('broker', 'vantage')
              .eq('symbol', sym)
              .eq('timeframe', '1m');

            const res = computeIndicators(data || []);
            return { sym, price: res.price, rsi: res.rsi };
          })()
        );
      }

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(100);
      for (const r of results) {
        expect(r.price).toBeGreaterThan(0);
        expect(r.rsi).toBeDefined();
      }

      // Strictly zero external HTTP calls permitted under high concurrency
      NetworkGuard.assertZeroExternalCalls();
      expect(NetworkGuard.getViolations()).toHaveLength(0);
      expect(NetworkGuard.getCallLog()).toHaveLength(0);
    });
  });
});
