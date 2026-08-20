/**
 * E2E Test Suite: R2 OHLC Aggregator Daemon & Market Candle Invariants
 * Tests Tier 1 Feature Coverage and Tier 2 Boundary & Corner Cases
 * Derived from ORIGINAL_REQUEST.md, PROJECT.md, and UQP_Architecture_Plan.md
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, TestContext } from './harness/test-context';
import {
  Candle,
  verifyCandleInvariants,
  aggregateTicksToCandles,
  generateSyntheticCandles,
  TIMEFRAME_MS,
} from './fixtures/candles.fixture';
import {
  generateNormalTicks,
  generateSpikeTicks,
  NormalizedTick,
} from './fixtures/ticks.fixture';

describe('R2: OHLC Aggregation Daemon & Market Candle Invariants', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = createTestContext();
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // TIER 1: FEATURE TESTS (F4, F5, F6, F7)
  // =========================================================================

  describe('Feature 4: OHLC Aggregation & Time-Bucketing (F4)', () => {
    it('F4.1: should bucket ticks into deterministic 1-minute intervals (floor(time / 60000) * 60000)', () => {
      const baseMinute = Math.floor(1724000000000 / 60000) * 60000;
      const ticks: NormalizedTick[] = [
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: baseMinute + 10000 },
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2736.0, ask: 2736.2, mid: 2736.1, spread: 0.2, time: baseMinute + 25000 },
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2734.0, ask: 2734.2, mid: 2734.1, spread: 0.2, time: baseMinute + 50000 }, // Minute 0 (00:00:50)
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2737.0, ask: 2737.2, mid: 2737.1, spread: 0.2, time: baseMinute + 70000 }, // Minute 1 (00:01:10)
      ];

      const candles = aggregateTicksToCandles(ticks, '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(2);
      const expectedBucket0 = baseMinute;
      const expectedBucket1 = baseMinute + 60000;

      expect(candles[0].time).toBe(expectedBucket0);
      expect(candles[1].time).toBe(expectedBucket1);

      // Bucket 0 aggregation values
      expect(candles[0].open).toBe(2735.1);
      expect(candles[0].high).toBe(2736.1);
      expect(candles[0].low).toBe(2734.1);
      expect(candles[0].close).toBe(2734.1);
      expect(candles[0].volume).toBe(3);

      // Bucket 1 aggregation values
      expect(candles[1].open).toBe(2737.1);
      expect(candles[1].high).toBe(2737.1);
      expect(candles[1].low).toBe(2737.1);
      expect(candles[1].close).toBe(2737.1);
      expect(candles[1].volume).toBe(1);
    });

    it('F4.2: should bucket ticks into deterministic 5-minute intervals (floor(time / 300000) * 300000)', () => {
      const baseTime = 1724000000000; // aligned base
      const ticks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, 30, 20000, 0.2, baseTime); // 30 ticks spanning 600s = 10m

      const candles5m = aggregateTicksToCandles(ticks, '5m', 'vantage', 'XAUUSD');

      expect(candles5m.length).toBeGreaterThanOrEqual(2);
      for (const candle of candles5m) {
        expect(candle.time % (5 * 60 * 1000)).toBe(0);
        const inv = verifyCandleInvariants(candle, '5m');
        expect(inv.valid).toBe(true);
      }
    });

    it('F4.3: should bucket ticks into deterministic 1-hour intervals (floor(time / 3600000) * 3600000)', () => {
      const baseHour = 1724000000000 - (1724000000000 % 3600000);
      const ticks: NormalizedTick[] = [
        { broker: 'vantage', symbol: 'EURUSD', bid: 1.085, ask: 1.0852, mid: 1.0851, spread: 0.0002, time: baseHour + 1000 },
        { broker: 'vantage', symbol: 'EURUSD', bid: 1.089, ask: 1.0892, mid: 1.0891, spread: 0.0002, time: baseHour + 1800000 }, // +30m
        { broker: 'vantage', symbol: 'EURUSD', bid: 1.082, ask: 1.0822, mid: 1.0821, spread: 0.0002, time: baseHour + 3500000 }, // +58m
        { broker: 'vantage', symbol: 'EURUSD', bid: 1.086, ask: 1.0862, mid: 1.0861, spread: 0.0002, time: baseHour + 3700000 }, // Next hour
      ];

      const candles1h = aggregateTicksToCandles(ticks, '1h', 'vantage', 'EURUSD');

      expect(candles1h).toHaveLength(2);
      expect(candles1h[0].time).toBe(baseHour);
      expect(candles1h[0].open).toBe(1.0851);
      expect(candles1h[0].high).toBe(1.0891);
      expect(candles1h[0].low).toBe(1.0821);
      expect(candles1h[0].close).toBe(1.0821);
      expect(candles1h[0].volume).toBe(3);
    });

    it('F4.4: should initialize Open, High, Low, Close to the first tick Mid price with Volume = 1', () => {
      const singleTick: NormalizedTick = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        bid: 2735.45,
        ask: 2735.65,
        mid: 2735.55,
        spread: 0.2,
        time: 1724000000000,
      };

      const candles = aggregateTicksToCandles([singleTick], '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(1);
      expect(candles[0].open).toBe(2735.55);
      expect(candles[0].high).toBe(2735.55);
      expect(candles[0].low).toBe(2735.55);
      expect(candles[0].close).toBe(2735.55);
      expect(candles[0].volume).toBe(1);
    });

    it('F4.5: should dynamically expand High/Low and update Close while incrementing Volume with each tick', () => {
      const baseTime = 1724000000000;
      const ticks: NormalizedTick[] = [
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: baseTime },
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2738.0, ask: 2738.2, mid: 2738.1, spread: 0.2, time: baseTime + 10000 }, // New High
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2732.0, ask: 2732.2, mid: 2732.1, spread: 0.2, time: baseTime + 20000 }, // New Low
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2736.0, ask: 2736.2, mid: 2736.1, spread: 0.2, time: baseTime + 30000 }, // Final Close
      ];

      const candles = aggregateTicksToCandles(ticks, '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(1);
      expect(candles[0].open).toBe(2735.1);
      expect(candles[0].high).toBe(2738.1);
      expect(candles[0].low).toBe(2732.1);
      expect(candles[0].close).toBe(2736.1);
      expect(candles[0].volume).toBe(4);
    });
  });

  describe('Feature 5: Candle Mathematical Invariants (F5)', () => {
    it('F5.1: should strictly satisfy invariant High >= max(Open, Close, Low) across all generated candles', () => {
      const candles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 100);

      for (const candle of candles) {
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.high).toBeGreaterThanOrEqual(candle.low);
        expect(candle.high).toBeGreaterThanOrEqual(Math.max(candle.open, candle.close, candle.low));
      }
    });

    it('F5.2: should strictly satisfy invariant Low <= min(Open, Close, High) across all generated candles', () => {
      const candles = generateSyntheticCandles('EURUSD', 'xm', '1m', 100, 1.085);

      for (const candle of candles) {
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.high);
        expect(candle.low).toBeLessThanOrEqual(Math.min(candle.open, candle.close, candle.high));
      }
    });

    it('F5.3: should strictly satisfy invariant High >= Low without exception', () => {
      const candles = generateSyntheticCandles('GBPUSD', 'atfx', '5m', 50, 1.295);

      for (const candle of candles) {
        expect(candle.high).toBeGreaterThanOrEqual(candle.low);
      }
    });

    it('F5.4: should guarantee Volume equals the exact number of ticks processed within the bar', () => {
      const count = 77;
      const ticks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, count, 500, 0.2, 1724000000000); // 77 ticks in 38.5s

      const candles = aggregateTicksToCandles(ticks, '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(1);
      expect(candles[0].volume).toBe(count);
    });

    it('F5.5: should preserve multi-timeframe hierarchy (5m Open=1st 1m Open, 5m Close=last 1m Close, 5m High=max 1m Highs, 5m Low=min 1m Lows)', () => {
      // 5 1-minute blocks of ticks
      const allTicks: NormalizedTick[] = [];
      const baseTime = Math.floor(1724000000000 / 300000) * 300000;

      for (let min = 0; min < 5; min++) {
        const minTicks = generateNormalTicks(
          'XAUUSD',
          'vantage',
          2730 + min * 2,
          10,
          5000,
          0.2,
          baseTime + min * 60000
        );
        allTicks.push(...minTicks);
      }

      const candles1m = aggregateTicksToCandles(allTicks, '1m', 'vantage', 'XAUUSD');
      const candles5m = aggregateTicksToCandles(allTicks, '5m', 'vantage', 'XAUUSD');

      expect(candles1m).toHaveLength(5);
      expect(candles5m).toHaveLength(1);

      const c5m = candles5m[0];
      expect(c5m.open).toBe(candles1m[0].open);
      expect(c5m.close).toBe(candles1m[4].close);
      expect(c5m.high).toBe(Math.max(...candles1m.map((c) => c.high)));
      expect(c5m.low).toBe(Math.min(...candles1m.map((c) => c.low)));
      expect(c5m.volume).toBe(candles1m.reduce((sum, c) => sum + c.volume, 0));
    });
  });

  describe('Feature 6: Redis Candle Hot Cache Management (F6)', () => {
    it('F6.1: should maintain latest candle in Redis hot cache under key format candles:{broker}:{symbol}:{timeframe}:latest', async () => {
      const candle: Candle = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: 1724000000000,
        open: 2735.0,
        high: 2738.5,
        low: 2734.2,
        close: 2737.8,
        volume: 45,
        is_closed: false,
      };

      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', candle);

      const cached = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');
      expect(cached).toBeDefined();
      expect(cached.open).toBe(2735.0);
      expect(cached.high).toBe(2738.5);
      expect(cached.low).toBe(2734.2);
      expect(cached.close).toBe(2737.8);
      expect(cached.volume).toBe(45);
      expect(cached.is_closed).toBe(false);
    });

    it('F6.2: should update hot cache in real-time as ticks arrive during the open minute bar', async () => {
      const baseTime = 1724000000000;
      let runningCandle: Candle = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: baseTime,
        open: 2735.0,
        high: 2735.0,
        low: 2735.0,
        close: 2735.0,
        volume: 1,
        is_closed: false,
      };

      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', runningCandle);

      // Tick 2: Higher price
      runningCandle.high = 2737.0;
      runningCandle.close = 2737.0;
      runningCandle.volume = 2;
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', runningCandle);

      const update1 = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');
      expect(update1.high).toBe(2737.0);
      expect(update1.volume).toBe(2);

      // Tick 3: Lower price
      runningCandle.low = 2733.5;
      runningCandle.close = 2734.0;
      runningCandle.volume = 3;
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', runningCandle);

      const update2 = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');
      expect(update2.low).toBe(2733.5);
      expect(update2.close).toBe(2734.0);
      expect(update2.volume).toBe(3);
    });

    it('F6.3: should transition hot cache to new open bar when minute boundary is crossed', async () => {
      const minute0 = 1724000000000;
      const minute1 = minute0 + 60000;

      // Finalize minute 0 bar
      const bar0: Candle = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: minute0,
        open: 2735.0,
        high: 2738.0,
        low: 2734.0,
        close: 2737.0,
        volume: 50,
        is_closed: true,
      };
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', bar0);

      // Transition to minute 1 open bar
      const bar1: Candle = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: minute1,
        open: 2737.5,
        high: 2737.5,
        low: 2737.5,
        close: 2737.5,
        volume: 1,
        is_closed: false,
      };
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', bar1);

      const latest = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');
      expect(latest.time).toBe(minute1);
      expect(latest.open).toBe(2737.5);
      expect(latest.is_closed).toBe(false);
    });

    it('F6.4: should isolate hot cache across brokers and symbols independently', async () => {
      const vXau: Candle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '1m', time: 1724000000000, open: 2735.0, high: 2735.0, low: 2735.0, close: 2735.0, volume: 1 };
      const xmXau: Candle = { broker: 'xm', symbol: 'XAUUSD', timeframe: '1m', time: 1724000000000, open: 2736.2, high: 2736.2, low: 2736.2, close: 2736.2, volume: 1 };
      const vEur: Candle = { broker: 'vantage', symbol: 'EURUSD', timeframe: '1m', time: 1724000000000, open: 1.0852, high: 1.0852, low: 1.0852, close: 1.0852, volume: 1 };

      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', vXau);
      await ctx.setHotCacheCandle('xm', 'XAUUSD', '1m', xmXau);
      await ctx.setHotCacheCandle('vantage', 'EURUSD', '1m', vEur);

      const cachedVXau = await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m');
      const cachedXmXau = await ctx.getHotCacheCandle('xm', 'XAUUSD', '1m');
      const cachedVEur = await ctx.getHotCacheCandle('vantage', 'EURUSD', '1m');

      expect(cachedVXau.open).toBe(2735.0);
      expect(cachedXmXau.open).toBe(2736.2);
      expect(cachedVEur.open).toBe(1.0852);
    });

    it('F6.5: should support multi-timeframe hot caches (1m, 5m, 1h) concurrently for the same symbol', async () => {
      const c1m: Candle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '1m', time: 1724000000000, open: 2735.0, high: 2736.0, low: 2734.0, close: 2735.5, volume: 10 };
      const c5m: Candle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '5m', time: 1724000000000, open: 2735.0, high: 2740.0, low: 2732.0, close: 2739.0, volume: 50 };
      const c1h: Candle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '1h', time: 1724000000000, open: 2730.0, high: 2750.0, low: 2725.0, close: 2745.0, volume: 600 };

      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1m', c1m);
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '5m', c5m);
      await ctx.setHotCacheCandle('vantage', 'XAUUSD', '1h', c1h);

      expect((await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1m')).volume).toBe(10);
      expect((await ctx.getHotCacheCandle('vantage', 'XAUUSD', '5m')).volume).toBe(50);
      expect((await ctx.getHotCacheCandle('vantage', 'XAUUSD', '1h')).volume).toBe(600);
    });
  });

  describe('Feature 7: Supabase market_candles Batch Upsert & Idempotency (F7)', () => {
    it('F7.1: should batch upsert finalized closed candles into Supabase market_candles table', async () => {
      const candles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 10);

      const { data, error } = await ctx.supabase
        .from('market_candles')
        .upsert(candles, { onConflict: 'broker,symbol,timeframe,time' });

      expect(error).toBeNull();
      expect(data).toHaveLength(10);

      const stored = ctx.supabase.getTable('market_candles');
      expect(stored).toHaveLength(10);
    });

    it('F7.2: should enforce unique constraint on (broker, symbol, timeframe, time) and update existing record on conflict', async () => {
      const baseRecord = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        timeframe: '1m',
        time: 1724000000000,
        open: 2735.0,
        high: 2736.0,
        low: 2734.0,
        close: 2735.5,
        volume: 10,
        is_closed: false,
      };

      // 1. Initial Insert
      await ctx.supabase
        .from('market_candles')
        .upsert(baseRecord, { onConflict: 'broker,symbol,timeframe,time' });

      expect(ctx.supabase.getTable('market_candles')).toHaveLength(1);

      // 2. Updated bar with new High, Close, Volume, and is_closed = true
      const updatedRecord = {
        ...baseRecord,
        high: 2739.0,
        close: 2738.5,
        volume: 25,
        is_closed: true,
      };

      await ctx.supabase
        .from('market_candles')
        .upsert(updatedRecord, { onConflict: 'broker,symbol,timeframe,time' });

      const stored = ctx.supabase.getTable('market_candles');
      expect(stored).toHaveLength(1); // Row count must remain exactly 1 (no duplicate rows created)
      expect(stored[0].high).toBe(2739.0);
      expect(stored[0].close).toBe(2738.5);
      expect(stored[0].volume).toBe(25);
      expect(stored[0].is_closed).toBe(true);
    });

    it('F7.3: should ensure repeated identical batch upserts are 100% idempotent', async () => {
      const batch = generateSyntheticCandles('EURUSD', 'xm', '1m', 20);

      // Upsert batch 3 times sequentially
      await ctx.supabase.from('market_candles').upsert(batch, { onConflict: 'broker,symbol,timeframe,time' });
      await ctx.supabase.from('market_candles').upsert(batch, { onConflict: 'broker,symbol,timeframe,time' });
      await ctx.supabase.from('market_candles').upsert(batch, { onConflict: 'broker,symbol,timeframe,time' });

      const stored = ctx.supabase.getTable('market_candles');
      expect(stored).toHaveLength(20);
    });

    it('F7.4: should query chronological historical series with proper limit and order', async () => {
      const candles = generateSyntheticCandles('XAUUSD', 'vantage', '1m', 50);
      await ctx.supabase.from('market_candles').upsert(candles, { onConflict: 'broker,symbol,timeframe,time' });

      const { data, error } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('broker', 'vantage')
        .eq('symbol', 'XAUUSD')
        .eq('timeframe', '1m')
        .order('time', { ascending: true })
        .limit(15);

      expect(error).toBeNull();
      expect(data).toHaveLength(15);
      expect(data[0].time).toBe(candles[0].time);
      expect(data[14].time).toBe(candles[14].time);
    });

    it('F7.5: should filter closed vs in-progress candles accurately', async () => {
      const closedCandle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '1m', time: 1724000000000, open: 2735, high: 2736, low: 2734, close: 2735.5, volume: 20, is_closed: true };
      const openCandle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '1m', time: 1724000060000, open: 2735.5, high: 2737, low: 2735, close: 2736.8, volume: 5, is_closed: false };

      await ctx.supabase.from('market_candles').upsert([closedCandle, openCandle], { onConflict: 'broker,symbol,timeframe,time' });

      const { data: closedOnly } = await ctx.supabase
        .from('market_candles')
        .select('*')
        .eq('is_closed', true);

      expect(closedOnly).toHaveLength(1);
      expect(closedOnly[0].time).toBe(1724000000000);
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // =========================================================================

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: should handle exact timestamp boundaries (tick at 59999 belongs to bucket T, tick at 60000 belongs to T+1)', () => {
      const t59999: NormalizedTick = { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: 59999 };
      const t60000: NormalizedTick = { broker: 'vantage', symbol: 'XAUUSD', bid: 2736.0, ask: 2736.2, mid: 2736.1, spread: 0.2, time: 60000 };

      const candles = aggregateTicksToCandles([t59999, t60000], '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(2);
      expect(candles[0].time).toBe(0);
      expect(candles[0].close).toBe(2735.1);
      expect(candles[1].time).toBe(60000);
      expect(candles[1].open).toBe(2736.1);
    });

    it('T2.2: should correctly compute single-tick candle where Open == High == Low == Close and Volume == 1', () => {
      const singleTick: NormalizedTick = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        bid: 2735.0,
        ask: 2735.2,
        mid: 2735.1,
        spread: 0.2,
        time: 1724000000000,
      };

      const candles = aggregateTicksToCandles([singleTick], '1m', 'vantage', 'XAUUSD');
      const c = candles[0];

      expect(c.open).toBe(c.high);
      expect(c.high).toBe(c.low);
      expect(c.low).toBe(c.close);
      expect(c.volume).toBe(1);
      expect(verifyCandleInvariants(c).valid).toBe(true);
    });

    it('T2.3: should handle high tick density burst (500 ticks in 1 minute) maintaining invariant correctness', () => {
      const baseTime = Math.floor(1724000000000 / 60000) * 60000;
      const ticks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, 500, 100, 0.2, baseTime); // 500 ticks spanning 50s

      const candles = aggregateTicksToCandles(ticks, '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(1);
      const c = candles[0];
      expect(c.volume).toBe(500);
      expect(verifyCandleInvariants(c, '1m').valid).toBe(true);
    });

    it('T2.4: should preserve extreme flash crash wicks in aggregated candle', () => {
      const baseTime = 1724000000000;
      const spikeTicks = generateSpikeTicks('XAUUSD', 'vantage', 2735.0, 2705.0, baseTime);

      const candles = aggregateTicksToCandles(spikeTicks, '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(1);
      const c = candles[0];
      expect(c.open).toBe(2735.1);
      expect(c.low).toBe(2707.0); // lowest mid during spike trough
      expect(c.high).toBe(2735.1);
      expect(c.volume).toBe(5);
      expect(verifyCandleInvariants(c).valid).toBe(true);
    });

    it('T2.5: should isolate parallel aggregation across multiple brokers without data cross-contamination', () => {
      const vTicks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, 10, 1000, 0.2, 1724000000000);
      const xmTicks = generateNormalTicks('XAUUSD', 'xm', 2740.0, 10, 1000, 0.4, 1724000000000);

      const vCandles = aggregateTicksToCandles(vTicks, '1m', 'vantage', 'XAUUSD');
      const xmCandles = aggregateTicksToCandles(xmTicks, '1m', 'xm', 'XAUUSD');

      expect(vCandles[0].broker).toBe('vantage');
      expect(xmCandles[0].broker).toBe('xm');
      expect(vCandles[0].open).toBeLessThan(xmCandles[0].open);
    });

    it('T2.6: should simulate database write failures and retry recovery cleanly', async () => {
      const candle = { broker: 'vantage', symbol: 'XAUUSD', timeframe: '1m', time: 1724000000000, open: 2735, high: 2736, low: 2734, close: 2735.5, volume: 10, is_closed: true };

      // Simulate transient DB error
      ctx.supabase.simulateError('market_candles', { message: 'Connection reset by peer', code: 'ECONNRESET' });

      const failedResult = await ctx.supabase
        .from('market_candles')
        .upsert(candle, { onConflict: 'broker,symbol,timeframe,time' });

      expect(failedResult.error).toBeDefined();
      expect(failedResult.error.code).toBe('ECONNRESET');

      // Clear error and retry
      ctx.supabase.clearSimulatedErrors();

      const successResult = await ctx.supabase
        .from('market_candles')
        .upsert(candle, { onConflict: 'broker,symbol,timeframe,time' });

      expect(successResult.error).toBeNull();
      expect(ctx.supabase.getTable('market_candles')).toHaveLength(1);
    });

    it('T2.7: should handle out-of-order late arriving ticks within the open bar updating bounds properly', () => {
      const baseTime = 1724000000000;
      const ticks: NormalizedTick[] = [
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: baseTime + 20000 },
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2740.0, ask: 2740.2, mid: 2740.1, spread: 0.2, time: baseTime + 10000 }, // Late tick with earlier timestamp but higher price
        { broker: 'vantage', symbol: 'XAUUSD', bid: 2730.0, ask: 2730.2, mid: 2730.1, spread: 0.2, time: baseTime + 5000 },  // Late tick with lowest price
      ];

      const candles = aggregateTicksToCandles(ticks, '1m', 'vantage', 'XAUUSD');

      expect(candles).toHaveLength(1);
      const c = candles[0];
      expect(c.high).toBe(2740.1);
      expect(c.low).toBe(2730.1);
      expect(c.volume).toBe(3);
      expect(verifyCandleInvariants(c).valid).toBe(true);
    });
  });
});
