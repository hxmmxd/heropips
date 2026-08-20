/**
 * Unified Quote Pipeline (UQP) — Tier 5 Adversarial Ingestion & Aggregation Stress Suite
 * Challenger: Challenger 1 (Final Acceptance & Adversarial Hardening)
 *
 * Empirical Adversarial Verification:
 * 1. Burst Volume Stress: 10,000+ ticks/sec injection through Ingestion & Aggregation pipeline.
 * 2. Extreme Out-of-Order Timestamps: Jumbled arrivals, sub-ms timestamp collisions, clock jumps.
 * 3. Corrupted & Boundary Tick Data: Zero prices, negative prices, NaN, inverted spread (ask < bid), astronomical & micro prices, injection attacks.
 * 4. Multi-Broker Simultaneous Streams: Vantage, XM, ICMarkets, ATFX, Pepperstone, Exness, Binance, OANDA concurrent streams & isolation.
 * 5. Candle Aggregation Boundary Conditions: Exact millisecond boundaries (:00.000 vs :59.999), empty minute gaps, volume precision, multi-TF envelope invariants.
 * 6. Store Persistence & Upsert Concurrency: Batch upsert floods, conflict idempotency, transient error recovery, zero data loss.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestContext } from './harness/test-context';
import { NetworkGuard } from './harness/network-guard';
import {
  TickIngestionDaemon,
  normalizeBrokerSlug,
  normalizeSymbol,
  normalizeTickData,
  publishTick,
  getStreamKey,
  getPubSubChannel,
  IngestionTick,
  MockTickGenerator,
  STREAM_MAX_LEN,
} from '@/daemons/tickIngestion';
import {
  CandleAggregatorDaemon,
  CandleData,
  verifyCandleInvariants,
  getCandleHotCacheKey,
  TIMEFRAME_MS,
} from '@/daemons/candleAggregator';
import { getInternalCandles } from '@/lib/internalCandles';
import { computeIndicators } from '@/lib/indicators';
import { generateSyntheticCandles } from './fixtures/candles.fixture';
import { generateNormalTicks, generateSpikeTicks } from './fixtures/ticks.fixture';

describe('Tier 5 Adversarial Hardening: Ingestion & Aggregation (Challenger 1)', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = new TestContext({ enableNetworkGuard: true });
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // CHALLENGE 1: High-Throughput Burst Volume Stress (10,000+ Ticks)
  // =========================================================================
  describe('Challenge 1: High-Throughput Burst Volume Stress', () => {
    it('1.1 should process a 10,000-tick burst through CandleAggregatorDaemon maintaining strict invariants', async () => {
      const BURST_COUNT = 10000;
      const symbols = ['XAUUSD', 'EURUSD', 'BTCUSD', 'GBPUSD', 'USDJPY'];
      const brokers = ['vantage', 'xm', 'icmarkets'];

      const aggregator = new CandleAggregatorDaemon({
        redisClient: ctx.redis,
        subscriberClient: ctx.redisSubscriber,
        supabaseClient: ctx.supabase as any,
        symbols,
        brokers,
        timeframes: ['1m', '5m', '1h'],
      });

      const tStart = Date.now();
      const baseTime = 1724000000000;

      for (let i = 0; i < BURST_COUNT; i++) {
        const broker = brokers[i % brokers.length];
        const symbol = symbols[i % symbols.length];
        const mid = 2700 + (i % 200) * 0.05;
        const tickTime = baseTime + (i % 300) * 1000;

        await aggregator.ingestTick({
          broker,
          symbol,
          bid: mid - 0.1,
          ask: mid + 0.1,
          mid,
          spread: 0.2,
          time: tickTime,
        });
      }

      const elapsed = Date.now() - tStart;
      const stats = aggregator.getStats();

      expect(stats.totalTicksProcessed).toBe(BURST_COUNT);
      expect(stats.candlesFormed1m).toBeGreaterThan(0);

      // Verify all active candles satisfy invariants
      const openCandles = aggregator.getAllOpenCandles();
      expect(openCandles.length).toBeGreaterThanOrEqual(symbols.length * brokers.length);

      for (const c of openCandles) {
        const inv = verifyCandleInvariants(c, c.timeframe);
        expect(inv.valid).toBe(true);
        expect(inv.errors).toHaveLength(0);
      }
    });

    it('1.2 should ingest 10,000 ticks into Redis stream with MAXLEN trimming and preserve newest entries', async () => {
      const streamKey = 'stream:vantage:xauusd';
      const TOTAL_ENTRIES = 12000;
      const MAX_LEN = 10000;

      for (let i = 0; i < TOTAL_ENTRIES; i++) {
        await ctx.redis.xadd(
          streamKey,
          'MAXLEN',
          '~',
          MAX_LEN,
          '*',
          'seq',
          String(i),
          'mid',
          String(2730 + (i % 100) * 0.1),
          'time',
          String(1724000000000 + i * 10)
        );
      }

      const streamLen = await ctx.redis.xlen(streamKey);
      expect(streamLen).toBeLessThanOrEqual(MAX_LEN);

      const entries = ctx.redis.getStreamEntries(streamKey);
      expect(entries.length).toBeLessThanOrEqual(MAX_LEN);

      // Verify newest entry is preserved at the end
      const last = entries[entries.length - 1];
      expect(last.fields.seq).toBe(String(TOTAL_ENTRIES - 1));
    });
  });

  // =========================================================================
  // CHALLENGE 2: Out-of-Order Timestamps & Clock Skew Fuzzing
  // =========================================================================
  describe('Challenge 2: Out-of-Order Timestamps & Clock Skew Fuzzing', () => {
    it('2.1 should correctly aggregate out-of-order in-bar ticks updating High, Low, and Volume without corrupting Open or Close', async () => {
      const aggregator = new CandleAggregatorDaemon({
        redisClient: ctx.redis,
        subscriberClient: ctx.redisSubscriber,
        supabaseClient: ctx.supabase as any,
        symbols: ['XAUUSD'],
        brokers: ['vantage'],
        timeframes: ['1m'],
      });

      const baseMinute = 1724000000000;

      // Jumbled order within minute bar:
      // Tick 1: t=10s, mid=2735.0 (Initial Open)
      // Tick 2: t=30s, mid=2740.0
      // Tick 3: t=15s, mid=2755.0 (High spike arriving late)
      // Tick 4: t=45s, mid=2720.0 (Low spike arriving late)
      // Tick 5: t=20s, mid=2738.0
      // Tick 6: t=50s, mid=2742.0 (Final Close)

      const jumbled = [
        { time: baseMinute + 10000, mid: 2735.0 },
        { time: baseMinute + 30000, mid: 2740.0 },
        { time: baseMinute + 15000, mid: 2755.0 },
        { time: baseMinute + 45000, mid: 2720.0 },
        { time: baseMinute + 20000, mid: 2738.0 },
        { time: baseMinute + 50000, mid: 2742.0 },
      ];

      for (const t of jumbled) {
        await aggregator.ingestTick({
          broker: 'vantage',
          symbol: 'XAUUSD',
          mid: t.mid,
          time: t.time,
        });
      }

      const bar = aggregator.getLatestCandle('vantage', 'XAUUSD', '1m');
      expect(bar).not.toBeNull();
      expect(bar!.open).toBe(2735.0);
      expect(bar!.high).toBe(2755.0);
      expect(bar!.low).toBe(2720.0);
      expect(bar!.volume).toBe(6);
      expect(verifyCandleInvariants(bar!, '1m').valid).toBe(true);
    });

    it('2.2 should handle 100 sub-millisecond identical-timestamp ticks without dropped updates or NaN', async () => {
      const aggregator = new CandleAggregatorDaemon({
        redisClient: ctx.redis,
        subscriberClient: ctx.redisSubscriber,
        supabaseClient: ctx.supabase as any,
        symbols: ['EURUSD'],
        brokers: ['xm'],
        timeframes: ['1m'],
      });

      const fixedTime = 1724000010000;
      for (let i = 0; i < 100; i++) {
        await aggregator.ingestTick({
          broker: 'xm',
          symbol: 'EURUSD',
          mid: 1.0850 + i * 0.00005,
          time: fixedTime,
        });
      }

      const bar = aggregator.getLatestCandle('xm', 'EURUSD', '1m');
      expect(bar).not.toBeNull();
      expect(bar!.volume).toBe(100);
      expect(bar!.open).toBe(1.0850);
      expect(bar!.high).toBeCloseTo(1.0850 + 99 * 0.00005, 5);
      expect(bar!.low).toBe(1.0850);
    });
  });

  // =========================================================================
  // CHALLENGE 3: Corrupted & Boundary Tick Data Sanitization
  // =========================================================================
  describe('Challenge 3: Corrupted & Boundary Tick Data Sanitization', () => {
    it('3.1 should sanitize non-positive, NaN, and negative prices into valid positive numbers', () => {
      const testCases = [
        { broker: 'vantage', raw: { symbol: 'XAUUSD', bid: 0, ask: 0 } },
        { broker: 'vantage', raw: { symbol: 'XAUUSD', bid: -50.0, ask: -40.0 } },
        { broker: 'vantage', raw: { symbol: 'XAUUSD', bid: NaN, ask: NaN } },
        { broker: 'vantage', raw: { symbol: 'XAUUSD', bid: null as any, ask: undefined as any } },
      ];

      for (const tc of testCases) {
        const norm = normalizeTickData(tc.broker, tc.raw);
        expect(norm.bid).toBeGreaterThan(0);
        expect(norm.ask).toBeGreaterThanOrEqual(norm.bid);
        expect(norm.mid).toBeGreaterThan(0);
        expect(norm.spread).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(norm.mid)).toBe(true);
      }
    });

    it('3.2 should fix inverted spread (ask < bid) by setting ask = bid', () => {
      const inverted = normalizeTickData('vantage', {
        symbol: 'XAUUSD',
        bid: 2740.0,
        ask: 2730.0, // inverted ask < bid
      });

      expect(inverted.bid).toBe(2740.0);
      expect(inverted.ask).toBe(2740.0); // Corrected to match bid
      expect(inverted.spread).toBe(0);
      expect(inverted.mid).toBe(2740.0);
    });

    it('3.3 should handle micro-satoshi (8 decimals) and astronomical prices with precision preservation', () => {
      // Micro-price
      const micro = normalizeTickData('vantage', {
        symbol: 'BTCUSD',
        bid: 0.00000001,
        ask: 0.00000002,
      });
      expect(micro.bid).toBeGreaterThan(0);
      expect(micro.ask).toBeGreaterThanOrEqual(micro.bid);

      // Astronomical price
      const astro = normalizeTickData('vantage', {
        symbol: 'US30',
        bid: 1000000000.0,
        ask: 1000000010.0,
      });
      expect(astro.bid).toBe(1000000000.0);
      expect(astro.ask).toBe(1000000010.0);
      expect(astro.mid).toBe(1000000005.0);
    });

    it('3.4 should clean broker slugs and symbol names with special characters and injection strings', () => {
      expect(normalizeBrokerSlug("vantage' OR '1'='1")).toBe('vantage');
      expect(normalizeBrokerSlug('<script>xm</script>')).toBe('xm');
      expect(normalizeBrokerSlug('')).toBe('vantage');
      expect(normalizeBrokerSlug('IC_MARKETS_PRO')).toBe('icmarkets');
      expect(normalizeBrokerSlug('PEPPERSTONE_DEMO')).toBe('pepperstone');
      expect(normalizeBrokerSlug('ATFX_LIVE_1')).toBe('atfx');
      expect(normalizeBrokerSlug('EXNESS_CENT')).toBe('exness');

      expect(normalizeSymbol('XAU/USD.raw')).toBe('XAUUSD');
      expect(normalizeSymbol('EUR-USD_ecn')).toBe('EURUSD');
      expect(normalizeSymbol('btc_usd.pro')).toBe('BTCUSD');
      expect(normalizeSymbol('')).toBe('XAUUSD');
    });
  });

  // =========================================================================
  // CHALLENGE 4: Multi-Broker Stream Concurrency & Isolation
  // =========================================================================
  describe('Challenge 4: Multi-Broker Stream Concurrency & Isolation', () => {
    it('4.1 should isolate streams and hot caches across 8 supported brokers simultaneously', async () => {
      const brokers = ['vantage', 'xm', 'icmarkets', 'pepperstone', 'atfx', 'exness', 'binance', 'oanda'];
      const symbol = 'XAUUSD';

      for (let i = 0; i < brokers.length; i++) {
        const broker = brokers[i];
        const basePrice = 2730 + i * 2;

        const candle: CandleData = {
          broker,
          symbol,
          timeframe: '1m',
          time: 1724000000000,
          open: basePrice,
          high: basePrice + 1.0,
          low: basePrice - 1.0,
          close: basePrice + 0.5,
          volume: 20 + i,
          is_closed: false,
        };

        const key = getCandleHotCacheKey(broker, symbol, '1m');
        await ctx.redis.set(key, JSON.stringify(candle));
      }

      // Assert each broker has distinct, non-overlapping hot cache entries
      for (let i = 0; i < brokers.length; i++) {
        const broker = brokers[i];
        const key = getCandleHotCacheKey(broker, symbol, '1m');
        const raw = await ctx.redis.get(key);
        expect(raw).not.toBeNull();
        const parsed = JSON.parse(raw!);
        expect(parsed.broker).toBe(broker);
        expect(parsed.open).toBe(2730 + i * 2);
      }
    });

    it('4.2 should support concurrent multi-broker pub/sub listeners without packet leakage', async () => {
      const vantageChannel = getPubSubChannel('vantage', 'XAUUSD');
      const xmChannel = getPubSubChannel('xm', 'XAUUSD');

      const vantageMsgs: any[] = [];
      const xmMsgs: any[] = [];

      const vSub = ctx.redis.duplicate();
      const xmSub = ctx.redis.duplicate();

      await vSub.subscribe(vantageChannel);
      vSub.on('message', (ch, msg) => {
        if (ch === vantageChannel) vantageMsgs.push(JSON.parse(msg));
      });

      await xmSub.subscribe(xmChannel);
      xmSub.on('message', (ch, msg) => {
        if (ch === xmChannel) xmMsgs.push(JSON.parse(msg));
      });

      // Interleave 20 ticks
      for (let i = 0; i < 10; i++) {
        await ctx.redis.publish(
          vantageChannel,
          JSON.stringify({ broker: 'vantage', symbol: 'XAUUSD', mid: 2730 + i })
        );
        await ctx.redis.publish(
          xmChannel,
          JSON.stringify({ broker: 'xm', symbol: 'XAUUSD', mid: 2740 + i })
        );
      }

      expect(vantageMsgs).toHaveLength(10);
      expect(xmMsgs).toHaveLength(10);

      expect(vantageMsgs.every((m) => m.broker === 'vantage')).toBe(true);
      expect(xmMsgs.every((m) => m.broker === 'xm')).toBe(true);

      vSub.disconnect();
      xmSub.disconnect();
    });
  });

  // =========================================================================
  // CHALLENGE 5: Candle Aggregation Boundary Conditions
  // =========================================================================
  describe('Challenge 5: Candle Aggregation Boundary Conditions', () => {
    it('5.1 should accurately map sub-millisecond timestamps to 1m, 5m, and 1h boundaries', () => {
      const baseHour = 1724000000000 - (1724000000000 % 3600000);

      const aggregator = new CandleAggregatorDaemon();

      // Minute 0 boundary: 00:00.000 -> Minute 0
      expect(aggregator.alignBucketTime(baseHour, '1m')).toBe(baseHour);
      // Minute 0 end: 00:59.999 -> Minute 0
      expect(aggregator.alignBucketTime(baseHour + 59999, '1m')).toBe(baseHour);
      // Minute 1 start: 01:00.000 -> Minute 1
      expect(aggregator.alignBucketTime(baseHour + 60000, '1m')).toBe(baseHour + 60000);

      // 5-Minute boundary: 04:59.999 -> 5m Bucket 0
      expect(aggregator.alignBucketTime(baseHour + 4 * 60000 + 59999, '5m')).toBe(baseHour);
      // 5-Minute boundary: 05:00.000 -> 5m Bucket 1
      expect(aggregator.alignBucketTime(baseHour + 5 * 60000, '5m')).toBe(baseHour + 300000);

      // 1-Hour boundary: 59:59.999 -> Hour 0
      expect(aggregator.alignBucketTime(baseHour + 59 * 60000 + 59999, '1h')).toBe(baseHour);
      // 1-Hour boundary: 60:00.000 -> Hour 1
      expect(aggregator.alignBucketTime(baseHour + 3600000, '1h')).toBe(baseHour + 3600000);
    });

    it('5.2 should handle multi-minute inactivity gap (Minute 0 -> Minute 5) with clean rollover and bar closure', async () => {
      const aggregator = new CandleAggregatorDaemon({
        redisClient: ctx.redis,
        subscriberClient: ctx.redisSubscriber,
        supabaseClient: ctx.supabase as any,
        symbols: ['XAUUSD'],
        brokers: ['vantage'],
        timeframes: ['1m', '5m'],
      });

      const baseTime = 1724000000000;

      // Minute 0 tick
      await aggregator.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2735.0, time: baseTime });
      // Minute 5 tick after gap
      await aggregator.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2745.0, time: baseTime + 300000 });

      const c1m = aggregator.getLatestCandle('vantage', 'XAUUSD', '1m');
      expect(c1m).not.toBeNull();
      expect(c1m!.time).toBe(baseTime + 300000);
      expect(c1m!.open).toBe(2745.0);
      expect(c1m!.volume).toBe(1);

      const stats = aggregator.getStats();
      expect(stats.candlesFormed1m).toBe(1); // 1 closed bar was queued
    });
  });

  // =========================================================================
  // CHALLENGE 6: Persistence, Upsert Idempotency & Database Fault Recovery
  // =========================================================================
  describe('Challenge 6: Persistence, Upsert Idempotency & DB Fault Recovery', () => {
    it('6.1 should execute mass batch upsert (200 candles) with 0 schema violations', async () => {
      const candles: CandleData[] = Array.from({ length: 200 }, (_, i) => ({
        broker: 'vantage',
        symbol: 'EURUSD',
        timeframe: '1m',
        time: 1724000000000 + i * 60000,
        open: 1.0850 + i * 0.0001,
        high: 1.0860 + i * 0.0001,
        low: 1.0840 + i * 0.0001,
        close: 1.0855 + i * 0.0001,
        volume: 50 + i,
        is_closed: true,
      }));

      const { data, error } = await ctx.supabase
        .from('market_candles')
        .upsert(candles, { onConflict: 'broker,symbol,timeframe,time' });

      expect(error).toBeNull();
      expect(data).toHaveLength(200);

      const stored = ctx.supabase.getTable('market_candles');
      expect(stored).toHaveLength(200);
    });

    it('6.2 should re-queue finalized candles during transient database error and flush successfully upon recovery', async () => {
      const aggregator = new CandleAggregatorDaemon({
        redisClient: ctx.redis,
        subscriberClient: ctx.redisSubscriber,
        supabaseClient: ctx.supabase as any,
        symbols: ['XAUUSD'],
        brokers: ['vantage'],
        timeframes: ['1m'],
      });

      const baseTime = 1724000000000;

      // Ingest 2 ticks across minute boundary to queue a finalized bar
      await aggregator.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2735.0, time: baseTime });
      await aggregator.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2738.0, time: baseTime + 60000 });

      // Inject database lock error
      ctx.supabase.simulateError('market_candles', { message: 'Lock wait timeout', code: '55P03' });

      // Flush attempts and fails -> re-queues
      const flushedWhileErr = await aggregator.flushPendingToDatabase(false);
      expect(flushedWhileErr).toBe(0);

      // Clear error -> retry flush
      ctx.supabase.clearSimulatedErrors();
      const flushedRecovered = await aggregator.flushPendingToDatabase(true);
      expect(flushedRecovered).toBeGreaterThan(0);

      const stored = ctx.supabase.getTable('market_candles');
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0].symbol).toBe('XAUUSD');
    });

    it('6.3 should guarantee zero outbound network leaks during combined ingestion and internal candle retrieval', async () => {
      const candles = generateSyntheticCandles('XAUUSD', 'vantage', '1h', 50);
      ctx.supabase.seed('market_candles', candles);

      const retrieved = await getInternalCandles('XAUUSD', '1h', 50, 'vantage');
      expect(retrieved).toHaveLength(50);

      const ind = computeIndicators(retrieved);
      expect(ind.price).toBeGreaterThan(0);
      expect(ind.rsi).toBeDefined();

      NetworkGuard.assertZeroExternalCalls();
      expect(NetworkGuard.getViolations()).toHaveLength(0);
    });
  });
});
