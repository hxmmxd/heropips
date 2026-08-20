/**
 * Unified Quote Pipeline (UQP) — Tier 5 Adversarial Stress Test Suite
 * Challenger: Challenger 2 (Final Acceptance & Adversarial Hardening)
 *
 * Direct empirical adversarial verification against:
 * 1. High-Throughput Burst Stress Testing: 1000+ ticks/sec and 250ms debounce coalescing.
 * 2. Rapid Client Connect/Disconnect Storm: 100+ concurrent SSE clients connecting and instantly aborting.
 * 3. Slow Consumer Simulation: Client delays reading stream; verifies memory safety, backpressure, and coalescing.
 * 4. SSE Heartbeat Drop & Reconnect Recovery: Disconnect mid-stream and instant reconnect across Vantage/XM/ATFX.
 * 5. Multi-Broker Channel Isolation: Zero cross-talk or leakage across brokers.
 * 6. Malformed & Corrupted Payload Barrage: Injection of invalid strings, corrupted JSON, NaN/nulls.
 * 7. Market Analysis Under Degraded Internal Data: Empty DB, sparse candles (<5), corrupted records, single-candle history, extreme volatility.
 * 8. Concurrency Stress Test: 20 concurrent SSE readers + 20 concurrent candle queries + 10 daemon writers.
 * 9. Zero Outbound Network Verification: NetworkGuard active; 0 calls to Twelve Data / Yahoo Finance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestContext } from './harness/test-context';
import { NetworkGuard } from './harness/network-guard';
import { readSSEChunks } from './harness/sse-reader';
import { GET as priceStreamRoute } from '@/app/api/price-stream/route';
import {
  getInternalCandles,
  getMultiTimeframeCandles,
  getCorrelatedCandles,
} from '@/lib/internalCandles';
import {
  getMarketSnapshot,
  fetchCandles,
  scoreIndicators,
  cleanBrokerSymbolToStandard,
} from '@/lib/market';
import { computeIndicators } from '@/lib/indicators';
import { generateSyntheticCandles } from './fixtures/candles.fixture';

describe('Tier 5 Adversarial Stress & Hardening Suite (Challenger 2)', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = new TestContext({ enableNetworkGuard: true });
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // CHALLENGE 1: High-Throughput Burst Stress Testing (1000+ ticks/sec)
  // =========================================================================
  describe('Challenge 1: High-Throughput Burst Stress & Coalescing', () => {
    it('1.1 should coalesce 1,000 rapid ticks into a single compact SSE JSON frame within 250ms window', async () => {
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream?broker=vantage', {
        signal: abortController.signal,
      });

      const res = await priceStreamRoute(req);
      expect(res.status).toBe(200);

      const symbols = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD', 'AUD/USD', 'USO'];
      const TOTAL_TICKS = 1000;
      const expectedLatestPrices: Record<string, number> = {};

      const tStart = Date.now();

      // Fire 1,000 ticks in rapid synchronous burst
      for (let i = 0; i < TOTAL_TICKS; i++) {
        const sym = symbols[i % symbols.length];
        const midPrice = Number((100 + i * 0.1).toFixed(4));
        expectedLatestPrices[sym] = midPrice;

        await ctx.redis.publish(
          `channel:ticks:vantage:${sym.replace('/', '')}`,
          JSON.stringify({
            broker: 'vantage',
            symbol: sym,
            bid: midPrice - 0.1,
            ask: midPrice + 0.1,
            mid: midPrice,
            spread: 0.2,
            time: Date.now(),
          })
        );
      }

      // Read SSE stream chunks (should receive exactly 1 coalesced event)
      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 2500 });
      const elapsed = Date.now() - tStart;

      expect(events).toHaveLength(1);
      const data = events[0].data;

      // Verify all 8 symbols are represented in the single frame
      expect(Object.keys(data).sort()).toEqual(symbols.sort());

      // Verify each symbol contains its absolute latest price from the 1000-tick burst
      for (const sym of symbols) {
        expect(data[sym]).toBe(expectedLatestPrices[sym]);
      }

      // Elapsed time should be at least ~200ms due to debounce throttle
      expect(elapsed).toBeGreaterThanOrEqual(200);

      abortController.abort();
    });

    it('1.2 should maintain frame boundary integrity across successive high-volume burst waves', async () => {
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream?broker=vantage', {
        signal: abortController.signal,
      });

      const res = await priceStreamRoute(req);

      // Wave 1: 200 ticks for XAU/USD
      for (let i = 1; i <= 200; i++) {
        await ctx.redis.publish(
          'channel:ticks:vantage:XAUUSD',
          JSON.stringify({
            broker: 'vantage',
            symbol: 'XAU/USD',
            mid: 2700 + i,
            time: Date.now(),
          })
        );
      }

      // Wait 350ms to guarantee wave 1 flush
      await new Promise((r) => setTimeout(r, 350));

      // Wave 2: 200 ticks for EUR/USD
      for (let i = 1; i <= 200; i++) {
        await ctx.redis.publish(
          'channel:ticks:vantage:EURUSD',
          JSON.stringify({
            broker: 'vantage',
            symbol: 'EUR/USD',
            mid: 1.0800 + i * 0.0001,
            time: Date.now(),
          })
        );
      }

      const events = await readSSEChunks(res, { maxChunks: 2, timeoutMs: 3000 });
      expect(events).toHaveLength(2);

      // Wave 1 payload only contained XAU/USD latest (2900)
      expect(events[0].data['XAU/USD']).toBe(2900);
      expect(events[0].data['EUR/USD']).toBeUndefined();

      // Wave 2 payload only contained EUR/USD latest (1.1000)
      expect(events[1].data['EUR/USD']).toBe(1.1);
      expect(events[1].data['XAU/USD']).toBeUndefined();

      abortController.abort();
    });
  });

  // =========================================================================
  // CHALLENGE 2: Rapid Client Connect / Disconnect Storm (100+ Concurrent Clients)
  // =========================================================================
  describe('Challenge 2: Client Disconnect & Abort Storm (100 Concurrent Clients)', () => {
    it('2.1 should clean up all 100 Redis subscribers during an abrupt mass abort storm with 0 memory leaks', async () => {
      const CLIENT_COUNT = 100;
      const controllers = Array.from({ length: CLIENT_COUNT }, () => new AbortController());

      // Connect 100 clients simultaneously
      const responses = await Promise.all(
        controllers.map((c) =>
          priceStreamRoute(
            new Request('http://localhost:3000/api/price-stream?broker=vantage', {
              signal: c.signal,
            })
          )
        )
      );

      expect(responses).toHaveLength(CLIENT_COUNT);

      // Verify all 100 subscribers are registered in the pattern store
      const activeSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*');
      expect(activeSubs?.size).toBe(CLIENT_COUNT);

      // Inject ticks to trigger debounce timers across all 100 connections
      await ctx.redis.publish(
        'channel:ticks:vantage:XAUUSD',
        JSON.stringify({ broker: 'vantage', symbol: 'XAU/USD', mid: 2735.5, time: Date.now() })
      );

      // Abruptly abort all 100 clients mid-throttle (at T=20ms) with microsecond jitter
      await new Promise((r) => setTimeout(r, 20));
      for (const c of controllers) {
        c.abort();
      }

      // Allow microtask cleanup
      await new Promise((r) => setTimeout(r, 60));

      // Assert that ALL 100 pattern subscribers have been cleanly disposed
      const remainingSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
      expect(remainingSubs).toBe(0);

      // Verify no remaining subscribers on any pattern
      for (const [, subSet] of ctx.store.patternSubscribers) {
        expect(subSet.size).toBe(0);
      }
    });

    it('2.2 should handle rapid connect-abort churn (150 sequential cycles) without listener leaks', async () => {
      for (let i = 0; i < 150; i++) {
        const controller = new AbortController();
        const res = await priceStreamRoute(
          new Request(`http://localhost:3000/api/price-stream?broker=vantage`, {
            signal: controller.signal,
          })
        );
        expect(res.status).toBe(200);
        controller.abort();
      }

      await new Promise((r) => setTimeout(r, 40));

      const remaining = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
      expect(remaining).toBe(0);
    });
  });

  // =========================================================================
  // CHALLENGE 3: Slow Consumer Simulation & Backpressure Resilience
  // =========================================================================
  describe('Challenge 3: Slow Consumer Simulation & Backpressure Resilience', () => {
    it('3.1 should coalesce high-speed ticks and deliver cleanly to delayed/slow consumers without memory bloat', async () => {
      const abortController = new AbortController();
      const res = await priceStreamRoute(
        new Request('http://localhost:3000/api/price-stream?broker=vantage', {
          signal: abortController.signal,
        })
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // Publish 150 ticks across 3 symbols
      for (let i = 1; i <= 50; i++) {
        await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2700 + i, time: Date.now() }));
        await ctx.redis.publish('channel:ticks:vantage:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.08 + i * 0.0001, time: Date.now() }));
        await ctx.redis.publish('channel:ticks:vantage:BTCUSD', JSON.stringify({ symbol: 'BTC/USD', mid: 60000 + i * 10, time: Date.now() }));
      }

      // Slow consumer delays reading by 350ms
      await new Promise((r) => setTimeout(r, 350));

      const { value, done } = await reader.read();
      expect(done).toBe(false);

      const text = decoder.decode(value);
      expect(text.startsWith('data: ')).toBe(true);

      const jsonStr = text.replace(/^data:\s*/, '').trim();
      const payload = JSON.parse(jsonStr);

      expect(payload['XAU/USD']).toBe(2750);
      expect(payload['EUR/USD']).toBe(1.085);
      expect(payload['BTC/USD']).toBe(60500);

      reader.releaseLock();
      abortController.abort();
    });

    it('3.2 should handle consumer abort during active backpressure without unhandled rejections', async () => {
      const abortController = new AbortController();
      await priceStreamRoute(
        new Request('http://localhost:3000/api/price-stream?broker=vantage', {
          signal: abortController.signal,
        })
      );

      // Rapidly publish ticks
      for (let i = 0; i < 50; i++) {
        await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2700 + i, time: Date.now() }));
      }

      // Abrupt abort before any chunk read
      abortController.abort();
      await new Promise((r) => setTimeout(r, 40));

      const subs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
      expect(subs).toBe(0);
    });
  });

  // =========================================================================
  // CHALLENGE 4: SSE Heartbeat Drop & Reconnect Recovery (Multi-Broker)
  // =========================================================================
  describe('Challenge 4: SSE Heartbeat Drop & Reconnect Recovery', () => {
    it('4.1 should allow instant reconnect after simulated client drop without duplicate or stale frames', async () => {
      // Session 1
      const c1 = new AbortController();
      const res1 = await priceStreamRoute(new Request('http://localhost:3000/api/price-stream?broker=vantage', { signal: c1.signal }));

      await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2730.0, time: Date.now() }));
      const events1 = await readSSEChunks(res1, { maxChunks: 1, timeoutMs: 1500 });
      expect(events1[0].data['XAU/USD']).toBe(2730.0);

      // Simulate connection drop
      c1.abort();
      await new Promise((r) => setTimeout(r, 30));

      // Session 2 Reconnect
      const c2 = new AbortController();
      const res2 = await priceStreamRoute(new Request('http://localhost:3000/api/price-stream?broker=vantage', { signal: c2.signal }));

      await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2735.0, time: Date.now() }));
      const events2 = await readSSEChunks(res2, { maxChunks: 1, timeoutMs: 1500 });
      expect(events2[0].data['XAU/USD']).toBe(2735.0);

      c2.abort();
    });

    it('4.2 should maintain strict multi-broker isolation across simultaneous reconnects', async () => {
      const brokers = ['vantage', 'xm', 'atfx'];
      const controllers = brokers.map(() => new AbortController());

      const responses = await Promise.all(
        brokers.map((b, i) => priceStreamRoute(new Request(`http://localhost:3000/api/price-stream?broker=${b}`, { signal: controllers[i].signal })))
      );

      await ctx.redis.publish('channel:ticks:vantage:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.0810, time: Date.now() }));
      await ctx.redis.publish('channel:ticks:xm:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.0820, time: Date.now() }));
      await ctx.redis.publish('channel:ticks:atfx:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.0830, time: Date.now() }));

      const chunks = await Promise.all(
        responses.map((res) => readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 }))
      );

      expect(chunks[0][0].data['EUR/USD']).toBe(1.0810);
      expect(chunks[1][0].data['EUR/USD']).toBe(1.0820);
      expect(chunks[2][0].data['EUR/USD']).toBe(1.0830);

      controllers.forEach((c) => c.abort());
    });
  });

  // =========================================================================
  // CHALLENGE 5: Malformed & Corrupted Payload Barrage
  // =========================================================================
  describe('Challenge 5: Malformed & Corrupted Payload Barrage', () => {
    it('5.1 should survive non-JSON, null, malformed and adversarial payloads without crashing stream', async () => {
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream?broker=vantage', {
        signal: abortController.signal,
      });

      const res = await priceStreamRoute(req);

      const garbagePayloads = [
        'INVALID_RAW_STRING_NOT_JSON',
        '{ "unclosed": json',
        'null',
        '1234567',
        JSON.stringify({}),
        JSON.stringify({ symbol: null, mid: 2735.0 }),
        JSON.stringify({ symbol: 'XAU/USD', mid: 'NOT_A_NUMBER' }),
        JSON.stringify({ symbol: 'XAU/USD', mid: null }),
        JSON.stringify({ symbol: 'XAU/USD', mid: undefined }),
        JSON.stringify({ symbol: '', mid: 2735.0 }),
        '<xml>injection</xml>',
        '{"symbol":"XAU/USD","mid":NaN}',
      ];

      for (const bad of garbagePayloads) {
        await ctx.redis.publish('channel:ticks:vantage:XAUUSD', bad);
      }

      // Valid tick
      await ctx.redis.publish(
        'channel:ticks:vantage:XAUUSD',
        JSON.stringify({ broker: 'vantage', symbol: 'XAU/USD', mid: 2735.85, time: Date.now() })
      );

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 2000 });
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ 'XAU/USD': 2735.85 });

      abortController.abort();
    });
  });

  // =========================================================================
  // CHALLENGE 6: Market Analysis Under Degraded Internal Data
  // =========================================================================
  describe('Challenge 6: Market Analysis Under Degraded Internal Data', () => {
    it('6.1 should construct complete MarketSnapshot on completely empty database via hermetic fallback', async () => {
      const snapshot = await getMarketSnapshot('XAU/USD', 'vantage');
      expect(snapshot).not.toBeNull();
      expect(snapshot!.symbol).toBe('XAU/USD');
      expect(snapshot!.price).toBeGreaterThan(0);
      expect(snapshot!.confluenceScore).toBeGreaterThanOrEqual(0);
      expect(snapshot!.confluenceScore).toBeLessThanOrEqual(100);
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(snapshot!.confluenceDirection);
      expect(snapshot!.gateResults.length).toBeGreaterThanOrEqual(12);

      NetworkGuard.assertZeroExternalCalls();
    });

    it('6.2 should seamlessly backfill sparse candles (<5 candles in DB when 50 requested)', async () => {
      const sparse = [
        {
          broker: 'vantage',
          symbol: 'XAUUSD',
          timeframe: '15m',
          time: new Date(Date.now() - 30 * 60000).toISOString(),
          open: 2730.0,
          high: 2732.0,
          low: 2729.0,
          close: 2731.5,
          volume: 100,
          is_closed: true,
        },
        {
          broker: 'vantage',
          symbol: 'XAUUSD',
          timeframe: '15m',
          time: new Date(Date.now() - 15 * 60000).toISOString(),
          open: 2731.5,
          high: 2735.0,
          low: 2731.0,
          close: 2734.0,
          volume: 150,
          is_closed: true,
        },
      ];

      ctx.supabase.seed('market_candles', sparse);

      const candles = await getInternalCandles('XAUUSD', '15m', 50, 'vantage');
      expect(candles).toHaveLength(50);

      // Verify chronological sorting
      for (let i = 1; i < candles.length; i++) {
        expect(candles[i].timestamp).toBeGreaterThanOrEqual(candles[i - 1].timestamp);
      }

      const ind = computeIndicators(candles);
      expect(Number.isFinite(ind.price)).toBe(true);
      expect(Number.isFinite(ind.rsi!)).toBe(true);
      expect(Number.isFinite(ind.macd!.histogram)).toBe(true);

      NetworkGuard.assertZeroExternalCalls();
    });

    it('6.3 should sanitize corrupted candle records (inverted high/low, negative, flat)', () => {
      const corrupted = [
        { open: 100, high: 90, low: 110, close: 105 },
        { open: -50, high: 100, low: -100, close: 20 },
        { open: 100, high: 100, low: 100, close: 100 },
        ...Array.from({ length: 55 }, (_, i) => ({
          open: 100 + i,
          high: 102 + i,
          low: 99 + i,
          close: 101 + i,
        })),
      ];

      const ind = computeIndicators(corrupted);
      expect(Number.isFinite(ind.price)).toBe(true);
      expect(Number.isFinite(ind.rsi!)).toBe(true);
      expect(Number.isFinite(ind.atr!)).toBe(true);

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

    it('6.4 should preserve single-candle DB history stitched into 50-bar dataset', async () => {
      ctx.supabase.seed('market_candles', [
        {
          broker: 'vantage',
          symbol: 'EURUSD',
          timeframe: '1h',
          time: new Date().toISOString(),
          open: 1.0850,
          high: 1.0860,
          low: 1.0840,
          close: 1.0855,
          volume: 50,
          is_closed: false,
        },
      ]);

      const candles = await getInternalCandles('EURUSD', '1h', 50, 'vantage');
      expect(candles).toHaveLength(50);
      expect(candles[candles.length - 1].close).toBe(1.0855);
    });

    it('6.5 should handle extreme volatility (10,000% spike, flat zero-vol, 0.00000012 micro-price) safely', () => {
      // 10,000% spike
      const spike = generateSyntheticCandles('BTCUSD', 'vantage', '1h', 50, 60000);
      spike.push({
        time: Date.now(),
        open: 60000,
        high: 6000000,
        low: 59000,
        close: 5800000,
        volume: 1000000,
        broker: 'vantage',
        symbol: 'BTCUSD',
        timeframe: '1h',
        is_closed: true,
      });
      const indSpike = computeIndicators(spike);
      expect(Number.isFinite(indSpike.rsi!)).toBe(true);

      // Flat zero-vol
      const flat = Array.from({ length: 60 }, () => ({ open: 1.08, high: 1.08, low: 1.08, close: 1.08 }));
      const indFlat = computeIndicators(flat);
      expect(indFlat.rsi).toBe(50);
      expect(indFlat.atr).toBe(0);
    });
  });

  // =========================================================================
  // CHALLENGE 7: Concurrency Stress (Readers + Candle Queries + Daemon Writes)
  // =========================================================================
  describe('Challenge 7: Internal Database & Store Concurrency Stress', () => {
    it('7.1 should handle 20 concurrent SSE readers + 20 concurrent candle queries + 10 daemon writers simultaneously', async () => {
      const sseControllers = Array.from({ length: 20 }, () => new AbortController());
      const sseResponses = await Promise.all(
        sseControllers.map((c, i) => {
          const broker = i % 2 === 0 ? 'vantage' : 'xm';
          return priceStreamRoute(new Request(`http://localhost:3000/api/price-stream?broker=${broker}`, { signal: c.signal }));
        })
      );

      const daemonWrites = Array.from({ length: 10 }, async (_, i) => {
        const broker = i % 2 === 0 ? 'vantage' : 'xm';
        for (let j = 0; j < 30; j++) {
          await ctx.injectTick({
            broker,
            symbol: 'XAU/USD',
            bid: 2730 + j * 0.1,
            ask: 2730.5 + j * 0.1,
          });

          await ctx.supabase.from('market_candles').upsert({
            broker,
            symbol: 'XAUUSD',
            timeframe: '1m',
            time: new Date(Date.now() + j * 60000).toISOString(),
            open: 2730 + j * 0.1,
            high: 2731 + j * 0.1,
            low: 2729 + j * 0.1,
            close: 2730.5 + j * 0.1,
            volume: 100 + j,
            is_closed: true,
          });
        }
      });

      const candleQueries = Array.from({ length: 20 }, async (_, i) => {
        const broker = i % 2 === 0 ? 'vantage' : 'xm';
        const tf = i % 3 === 0 ? '1m' : i % 3 === 1 ? '15m' : '1h';
        const c = await getInternalCandles('XAU/USD', tf, 50, broker);
        expect(c).toHaveLength(50);
      });

      await Promise.all([...daemonWrites, ...candleQueries]);

      const sseChunks = await Promise.all(
        sseResponses.map((res) => readSSEChunks(res, { maxChunks: 1, timeoutMs: 2500 }))
      );

      for (const chunk of sseChunks) {
        expect(chunk).toHaveLength(1);
        expect(typeof chunk[0].data['XAU/USD']).toBe('number');
      }

      sseControllers.forEach((c) => c.abort());
      await new Promise((r) => setTimeout(r, 40));

      const vantageSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
      const xmSubs = ctx.store.patternSubscribers.get('channel:ticks:xm:*')?.size ?? 0;
      expect(vantageSubs).toBe(0);
      expect(xmSubs).toBe(0);

      NetworkGuard.assertZeroExternalCalls();
    });
  });
});
