/**
 * E2E Test Suite: R1 Tick Ingestion Daemon & Multi-Broker Pipeline
 * Tests Tier 1 Feature Coverage and Tier 2 Boundary & Corner Cases
 * Derived from ORIGINAL_REQUEST.md, PROJECT.md, and UQP_Architecture_Plan.md
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, TestContext } from './harness/test-context';
import {
  normalizeTick,
  generateNormalTicks,
  generateSpikeTicks,
  generateZeroSpreadTicks,
  generateSubMillisecondTicks,
  generateMultiBrokerTicks,
  RawSidecarTick,
  NormalizedTick,
  MALFORMED_TICKS,
} from './fixtures/ticks.fixture';
import {
  VANTAGE_MASTER_ACCOUNT,
  XM_MASTER_ACCOUNT,
  ATFX_MASTER_ACCOUNT,
  CLIENT_ACCOUNT_VANTAGE,
  ALL_BROKER_ACCOUNTS,
  createSidecarTick,
} from './fixtures/sidecar.fixture';

describe('R1: Tick Ingestion Daemon & Multi-Broker Pipeline', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = createTestContext();
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // TIER 1: FEATURE TESTS (F1, F2, F3)
  // =========================================================================

  describe('Feature 1: Broker-Segmented Tick Ingestion (F1)', () => {
    it('F1.1: should normalize incoming MT5 sidecar ticks into the standard UQP schema', () => {
      const raw: RawSidecarTick = {
        symbol: 'XAUUSD',
        time_msc: 1724000001234,
        bid: 2735.45,
        ask: 2735.7,
        volume: 15,
      };

      const normalized = normalizeTick('vantage', raw);

      expect(normalized.broker).toBe('vantage');
      expect(normalized.symbol).toBe('XAUUSD');
      expect(normalized.bid).toBe(2735.45);
      expect(normalized.ask).toBe(2735.7);
      expect(normalized.mid).toBe(2735.575);
      expect(normalized.spread).toBe(0.25);
      expect(normalized.time).toBe(1724000001234);
    });

    it('F1.2: should append normalized ticks to Redis stream segmented by broker (stream:{broker}:{symbol})', async () => {
      const tick: NormalizedTick = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        bid: 2735.45,
        ask: 2735.7,
        mid: 2735.575,
        spread: 0.25,
        time: 1724000002000,
      };

      const streamKey = `stream:${tick.broker}:${tick.symbol}`;
      const entryId = await ctx.redis.xadd(
        streamKey,
        'MAXLEN',
        '~',
        10000,
        '*',
        'broker',
        tick.broker,
        'symbol',
        tick.symbol,
        'bid',
        String(tick.bid),
        'ask',
        String(tick.ask),
        'mid',
        String(tick.mid),
        'spread',
        String(tick.spread),
        'time',
        String(tick.time)
      );

      expect(entryId).toBeDefined();
      expect(typeof entryId).toBe('string');

      const streamEntries = ctx.redis.getStreamEntries(streamKey);
      expect(streamEntries).toHaveLength(1);
      expect(streamEntries[0].fields.broker).toBe('vantage');
      expect(streamEntries[0].fields.symbol).toBe('XAUUSD');
      expect(Number(streamEntries[0].fields.bid)).toBe(2735.45);
      expect(Number(streamEntries[0].fields.ask)).toBe(2735.7);
      expect(Number(streamEntries[0].fields.mid)).toBe(2735.575);
      expect(Number(streamEntries[0].fields.spread)).toBe(0.25);
      expect(Number(streamEntries[0].fields.time)).toBe(1724000002000);
    });

    it('F1.3: should publish tick events to Redis Pub/Sub channel (channel:ticks:{broker}:{symbol})', async () => {
      const channel = 'channel:ticks:vantage:XAUUSD';
      const receivedMessages: any[] = [];

      await ctx.redisSubscriber.subscribe(channel);
      ctx.redisSubscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          receivedMessages.push(JSON.parse(msg));
        }
      });

      const tick = {
        broker: 'vantage',
        symbol: 'XAUUSD',
        bid: 2735.45,
        ask: 2735.7,
        mid: 2735.575,
        spread: 0.25,
        time: 1724000003000,
      };

      const publishedCount = await ctx.redis.publish(channel, JSON.stringify(tick));
      expect(publishedCount).toBeGreaterThanOrEqual(1);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual(tick);
    });

    it('F1.4: should correctly partition streams and channels across multiple currency symbols', async () => {
      const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];
      const broker = 'vantage';

      for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        await ctx.injectTick({
          broker,
          symbol: sym,
          bid: 100 + i * 10,
          ask: 100.2 + i * 10,
        });
      }

      for (const sym of symbols) {
        const entries = ctx.getStreamEntries(broker, sym);
        expect(entries).toHaveLength(1);
        expect(entries[0].fields.symbol).toBe(sym);
        expect(entries[0].fields.broker).toBe(broker);
      }
    });

    it('F1.5: should process and deliver ticks with ingestion latency < 100ms', async () => {
      const startTime = Date.now();
      const channel = 'channel:ticks:vantage:XAUUSD';
      let latencyMs = 0;

      await ctx.redisSubscriber.subscribe(channel);
      const deliveryPromise = new Promise<void>((resolve) => {
        ctx.redisSubscriber.once('message', (_ch, _msg) => {
          latencyMs = Date.now() - startTime;
          resolve();
        });
      });

      await ctx.injectTick({
        broker: 'vantage',
        symbol: 'XAUUSD',
        bid: 2735.45,
        ask: 2735.7,
      });

      await deliveryPromise;
      expect(latencyMs).toBeLessThan(100);
    });
  });

  describe('Feature 2: Tick Stream Payload & Mathematical Invariants (F2)', () => {
    it('F2.1: should maintain mathematical invariant Mid = (Bid + Ask) / 2 for all ticks', () => {
      const ticks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, 50, 100, 0.3);

      for (const tick of ticks) {
        const expectedMid = Number(((tick.bid + tick.ask) / 2).toFixed(5));
        expect(tick.mid).toBeCloseTo(expectedMid, 5);
      }
    });

    it('F2.2: should maintain mathematical invariant Spread = Ask - Bid >= 0 for all ticks', () => {
      const ticks = generateNormalTicks('EURUSD', 'xm', 1.085, 50, 100, 0.00015);

      for (const tick of ticks) {
        const expectedSpread = Number((tick.ask - tick.bid).toFixed(5));
        expect(tick.spread).toBeCloseTo(expectedSpread, 5);
        expect(tick.spread).toBeGreaterThanOrEqual(0);
        expect(tick.ask).toBeGreaterThanOrEqual(tick.bid);
      }
    });

    it('F2.3: should ensure all tick timestamps are valid positive epoch milliseconds in chronological order', () => {
      const startTime = 1724000000000;
      const ticks = generateNormalTicks('GBPUSD', 'atfx', 1.295, 20, 250, 0.0002, startTime);

      let prevTime = 0;
      for (const tick of ticks) {
        expect(tick.time).toBeGreaterThan(0);
        expect(tick.time).toBeGreaterThanOrEqual(prevTime);
        prevTime = tick.time;
      }
    });

    it('F2.4: should preserve full numeric precision across Redis stream string serialization and parsing', async () => {
      const highPrecisionTick: NormalizedTick = {
        broker: 'vantage',
        symbol: 'EURUSD',
        bid: 1.08523,
        ask: 1.08538,
        mid: 1.085305,
        spread: 0.00015,
        time: 1724000004567,
      };

      const streamKey = `stream:${highPrecisionTick.broker}:${highPrecisionTick.symbol}`;
      await ctx.redis.xadd(
        streamKey,
        '*',
        'broker',
        highPrecisionTick.broker,
        'symbol',
        highPrecisionTick.symbol,
        'bid',
        String(highPrecisionTick.bid),
        'ask',
        String(highPrecisionTick.ask),
        'mid',
        String(highPrecisionTick.mid),
        'spread',
        String(highPrecisionTick.spread),
        'time',
        String(highPrecisionTick.time)
      );

      const entries = await ctx.redis.xrange(streamKey, '-', '+');
      expect(entries).toHaveLength(1);
      const rawFields = entries[0][1];
      const parsed: Record<string, string> = {};
      for (let i = 0; i < rawFields.length; i += 2) {
        parsed[rawFields[i]] = rawFields[i + 1];
      }

      expect(parseFloat(parsed.bid)).toBe(1.08523);
      expect(parseFloat(parsed.ask)).toBe(1.08538);
      expect(parseFloat(parsed.mid)).toBe(1.085305);
      expect(parseFloat(parsed.spread)).toBe(0.00015);
      expect(parseInt(parsed.time, 10)).toBe(1724000004567);
    });

    it('F2.5: should query stream ranges using XRANGE and XREVRANGE with correct chronological slices', async () => {
      const streamKey = 'stream:vantage:xauusd';
      const count = 10;
      const baseTime = 1724000000000;

      for (let i = 0; i < count; i++) {
        await ctx.redis.xadd(
          streamKey,
          `${baseTime + i * 1000}-0`,
          'bid',
          String(2730 + i),
          'ask',
          String(2730.5 + i),
          'time',
          String(baseTime + i * 1000)
        );
      }

      const forward = await ctx.redis.xrange(streamKey, '-', '+', 'COUNT', 5);
      expect(forward).toHaveLength(5);
      expect(forward[0][0]).toBe(`${baseTime}-0`);

      const reverse = await ctx.redis.xrevrange(streamKey, '+', '-', 'COUNT', 3);
      expect(reverse).toHaveLength(3);
      expect(reverse[0][0]).toBe(`${baseTime + 9000}-0`);
    });
  });

  describe('Feature 3: Multi-Broker Stream & Pub/Sub Isolation (F3)', () => {
    it('F3.1: should isolate tick streams completely between Vantage, XM, and ATFX', async () => {
      const vantageTicks = generateNormalTicks('XAUUSD', 'vantage', 2735.0, 5, 100, 0.2);
      const xmTicks = generateNormalTicks('XAUUSD', 'xm', 2735.5, 5, 100, 0.35);
      const atfxTicks = generateNormalTicks('XAUUSD', 'atfx', 2734.8, 5, 100, 0.28);

      for (const t of vantageTicks) await ctx.injectTick(t);
      for (const t of xmTicks) await ctx.injectTick(t);
      for (const t of atfxTicks) await ctx.injectTick(t);

      const vantageStream = ctx.redis.getStreamEntries('stream:vantage:xauusd');
      const xmStream = ctx.redis.getStreamEntries('stream:xm:xauusd');
      const atfxStream = ctx.redis.getStreamEntries('stream:atfx:xauusd');

      expect(vantageStream).toHaveLength(5);
      expect(xmStream).toHaveLength(5);
      expect(atfxStream).toHaveLength(5);

      // Verify broker tag integrity inside streams
      expect(vantageStream.every((e) => e.fields.broker === 'vantage')).toBe(true);
      expect(xmStream.every((e) => e.fields.broker === 'xm')).toBe(true);
      expect(atfxStream.every((e) => e.fields.broker === 'atfx')).toBe(true);

      // Verify broker-specific prices do not leak across streams
      expect(Number(vantageStream[0].fields.spread)).toBe(0.2);
      expect(Number(xmStream[0].fields.spread)).toBe(0.35);
      expect(Number(atfxStream[0].fields.spread)).toBe(0.28);
    });

    it('F3.2: should isolate Pub/Sub channels so Vantage subscribers never receive XM or ATFX ticks', async () => {
      const vantageChannel = 'channel:ticks:vantage:XAUUSD';
      const xmChannel = 'channel:ticks:xm:XAUUSD';

      const vantageMessages: any[] = [];
      const xmMessages: any[] = [];

      const vantageSub = ctx.redis.duplicate();
      const xmSub = ctx.redis.duplicate();

      await vantageSub.subscribe(vantageChannel);
      vantageSub.on('message', (ch, msg) => {
        if (ch.toLowerCase() === vantageChannel.toLowerCase()) vantageMessages.push(JSON.parse(msg));
      });

      await xmSub.subscribe(xmChannel);
      xmSub.on('message', (ch, msg) => {
        if (ch.toLowerCase() === xmChannel.toLowerCase()) xmMessages.push(JSON.parse(msg));
      });

      // Inject 5 Vantage ticks and 5 XM ticks
      for (let i = 0; i < 5; i++) {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0 + i, ask: 2735.2 + i });
        await ctx.injectTick({ broker: 'xm', symbol: 'XAUUSD', bid: 2736.0 + i, ask: 2736.3 + i });
      }

      expect(vantageMessages).toHaveLength(5);
      expect(xmMessages).toHaveLength(5);

      expect(vantageMessages.every((m) => m.broker === 'vantage')).toBe(true);
      expect(xmMessages.every((m) => m.broker === 'xm')).toBe(true);

      vantageSub.disconnect();
      xmSub.disconnect();
    });

    it('F3.3: should correctly filter master feed accounts (is_master_feed = true) from Supabase broker_accounts', async () => {
      ctx.supabase.seed('broker_accounts', ALL_BROKER_ACCOUNTS);

      const { data: masterFeeds, error } = await ctx.supabase
        .from('broker_accounts')
        .select('*')
        .eq('is_master_feed', true)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(masterFeeds).toHaveLength(3);

      const brokers = masterFeeds.map((m: any) => m.broker);
      expect(brokers).toContain('vantage');
      expect(brokers).toContain('xm');
      expect(brokers).toContain('atfx');
    });

    it('F3.4: should reject / exclude non-master client accounts (is_master_feed = false) from global quote ingestion', async () => {
      ctx.supabase.seed('broker_accounts', ALL_BROKER_ACCOUNTS);

      const { data: clientAccounts } = await ctx.supabase
        .from('broker_accounts')
        .select('*')
        .eq('is_master_feed', false);

      expect(clientAccounts).toHaveLength(1);
      expect(clientAccounts[0].id).toBe(CLIENT_ACCOUNT_VANTAGE.id);
      expect(clientAccounts[0].is_master_feed).toBe(false);
    });

    it('F3.5: should handle high-frequency interleaved ticks across 3 brokers concurrently', async () => {
      const multiTicks = generateMultiBrokerTicks(['XAUUSD', 'EURUSD'], ['vantage', 'xm', 'atfx'], 15);

      for (const t of multiTicks) {
        await ctx.injectTick(t);
      }

      // 15 ticks * 2 symbols = 30 ticks per broker
      const vXau = ctx.redis.getStreamEntries('stream:vantage:xauusd');
      const vEur = ctx.redis.getStreamEntries('stream:vantage:eurusd');
      const xmXau = ctx.redis.getStreamEntries('stream:xm:xauusd');
      const xmEur = ctx.redis.getStreamEntries('stream:xm:eurusd');
      const atfxXau = ctx.redis.getStreamEntries('stream:atfx:xauusd');
      const atfxEur = ctx.redis.getStreamEntries('stream:atfx:eurusd');

      expect(vXau).toHaveLength(15);
      expect(vEur).toHaveLength(15);
      expect(xmXau).toHaveLength(15);
      expect(xmEur).toHaveLength(15);
      expect(atfxXau).toHaveLength(15);
      expect(atfxEur).toHaveLength(15);
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // =========================================================================

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: should process Zero-Spread ticks (Bid == Ask, Spread = 0) without mathematical or division errors', async () => {
      const zeroSpreadTicks = generateZeroSpreadTicks('EURUSD', 'xm', 1.0855, 10);

      for (const tick of zeroSpreadTicks) {
        expect(tick.spread).toBe(0);
        expect(tick.mid).toBe(1.0855);
        const { mid, spread } = await ctx.injectTick(tick);
        expect(mid).toBe(1.0855);
        expect(spread).toBe(0);
      }

      const streamEntries = ctx.redis.getStreamEntries('stream:xm:eurusd');
      expect(streamEntries).toHaveLength(10);
      expect(Number(streamEntries[0].fields.spread)).toBe(0);
      expect(Number(streamEntries[0].fields.mid)).toBe(1.0855);
    });

    it('T2.2: should maintain exact decimal representation for 8-decimal crypto and 3-decimal JPY pricing', async () => {
      // BTCUSD (e.g. 65432.12345678)
      await ctx.injectTick({
        broker: 'vantage',
        symbol: 'BTCUSD',
        bid: 65432.12345678,
        ask: 65432.22345678,
        mid: 65432.17345678,
        spread: 0.1,
      });

      // USDJPY (e.g. 155.123)
      await ctx.injectTick({
        broker: 'vantage',
        symbol: 'USDJPY',
        bid: 155.123,
        ask: 155.145,
        mid: 155.134,
        spread: 0.022,
      });

      const btcEntries = ctx.redis.getStreamEntries('stream:vantage:btcusd');
      expect(btcEntries[0].fields.bid).toBe('65432.12345678');
      expect(btcEntries[0].fields.ask).toBe('65432.22345678');

      const jpyEntries = ctx.redis.getStreamEntries('stream:vantage:usdjpy');
      expect(jpyEntries[0].fields.bid).toBe('155.123');
      expect(jpyEntries[0].fields.ask).toBe('155.145');
    });

    it('T2.3: should preserve flash crash price spikes and wide spreads intact without corruption', async () => {
      const flashTicks = generateSpikeTicks('XAUUSD', 'vantage', 2735.0, 2705.0);

      for (const t of flashTicks) {
        await ctx.injectTick(t);
      }

      const streamEntries = ctx.redis.getStreamEntries('stream:vantage:xauusd');
      expect(streamEntries).toHaveLength(5);

      const lowestPriceEntry = streamEntries.reduce((min, cur) =>
        Number(cur.fields.bid) < Number(min.fields.bid) ? cur : min
      );
      expect(Number(lowestPriceEntry.fields.bid)).toBe(2705.0);
      expect(Number(lowestPriceEntry.fields.spread)).toBe(4.0);
    });

    it('T2.4: should handle sub-millisecond tick bursts with identical timestamps using sequence counters', async () => {
      const timestamp = 1724000005000;
      const subMsTicks = generateSubMillisecondTicks('XAUUSD', 'atfx', 2735.0, 5, timestamp);

      const entryIds: string[] = [];
      for (const t of subMsTicks) {
        const { entryId } = await ctx.injectTick(t);
        entryIds.push(entryId);
      }

      // Check unique sequence IDs generated
      expect(new Set(entryIds).size).toBe(5);
      const streamEntries = ctx.redis.getStreamEntries('stream:atfx:xauusd');
      expect(streamEntries).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(streamEntries[i].fields.time).toBe(String(timestamp));
      }
    });

    it('T2.5: should enforce MAXLEN stream trimming when entry count exceeds limit', async () => {
      const streamKey = 'stream:vantage:trim_test';
      const maxLen = 20;

      for (let i = 0; i < 35; i++) {
        await ctx.redis.xadd(
          streamKey,
          'MAXLEN',
          '~',
          maxLen,
          '*',
          'seq',
          String(i),
          'bid',
          String(2730 + i)
        );
      }

      const length = await ctx.redis.xlen(streamKey);
      expect(length).toBeLessThanOrEqual(maxLen);

      const entries = ctx.redis.getStreamEntries(streamKey);
      expect(entries.length).toBeLessThanOrEqual(maxLen);

      // Verify the newest entries are preserved (e.g. sequence 34 is last)
      const lastEntry = entries[entries.length - 1];
      expect(lastEntry.fields.seq).toBe('34');
    });

    it('T2.6: should reject or sanitize malformed tick payloads gracefully', () => {
      for (const malformed of MALFORMED_TICKS) {
        const isValid =
          malformed.broker &&
          malformed.symbol &&
          !isNaN(malformed.bid) &&
          !isNaN(malformed.ask) &&
          malformed.ask >= malformed.bid &&
          malformed.time > 0;

        expect(isValid).toBeFalsy();
      }
    });

    it('T2.7: should support dynamic subscriber reconnects without message corruption', async () => {
      const channel = 'channel:ticks:vantage:xauusd';
      const sub = ctx.redis.duplicate();

      const batch1: any[] = [];
      await sub.subscribe(channel);
      sub.on('message', (_ch, msg) => batch1.push(JSON.parse(msg)));

      await ctx.injectTick({ broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2 });
      expect(batch1).toHaveLength(1);

      // Simulate disconnect & reconnect
      sub.disconnect();

      const sub2 = ctx.redis.duplicate();
      const batch2: any[] = [];
      await sub2.subscribe(channel);
      sub2.on('message', (_ch, msg) => batch2.push(JSON.parse(msg)));

      await ctx.injectTick({ broker: 'vantage', symbol: 'XAUUSD', bid: 2736.0, ask: 2736.2 });
      expect(batch2).toHaveLength(1);
      expect(batch2[0].bid).toBe(2736.0);

      sub2.disconnect();
    });
  });
});
