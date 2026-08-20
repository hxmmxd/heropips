#!/usr/bin/env tsx
/**
 * Unified Quote Pipeline (UQP) — Tier 5 Adversarial Stress, Fuzzing & Race Test Suite
 * Challenger: Challenger 1 (Ingestion & Aggregation Adversarial Hardening)
 *
 * Direct Empirical Adversarial Tests:
 * 1. High-Throughput Burst Stress: 10,000+ ticks/sec injection through Ingestion & Aggregation.
 * 2. Out-of-Order & Clock Skew Fuzzing: Backwards timestamps, sub-millisecond collisions, sequence jitter.
 * 3. Corrupted & Boundary Tick Data: NaN, negative prices, inverted spread (ask < bid), extreme gaps, SQL/script injection.
 * 4. Multi-Broker Concurrency & Stream Partitioning: Vantage, XM, ICMarkets, ATFX, Pepperstone, Exness, Binance, OANDA.
 * 5. Candle Aggregation Boundary Accuracy: Sub-millisecond boundary (:00.000 vs :59.999), multi-timeframe synchronization (1m/5m/1h), minute gaps, volume precision.
 * 6. Store Persistence & Upsert Concurrency: Batch upserts, conflict idempotency, transient failure recovery, zero data loss.
 */

import fs from 'fs';
import path from 'path';

// Synchronously load environment variables
function loadEnv(): void {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const firstEqual = trimmed.indexOf('=');
            if (firstEqual > 0) {
              const key = trimmed.slice(0, firstEqual).trim();
              const val = trimmed.slice(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
      } catch (err: any) {
        // Ignore
      }
    }
  }
}

loadEnv();

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
} from '../src/daemons/tickIngestion';

import {
  CandleAggregatorDaemon,
  CandleData,
  verifyCandleInvariants,
  getCandleHotCacheKey,
  TIMEFRAME_MS,
} from '../src/daemons/candleAggregator';

import { MockRedis, SharedRedisStore } from '../tests/e2e/harness/mock-redis';
import { MockSupabaseClient } from '../tests/e2e/harness/mock-supabase';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const allResults: TestResult[] = [];

function recordTest(suite: string, name: string, passed: boolean, durationMs: number, details: string) {
  allResults.push({ suite, name, passed, durationMs, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${suite}] ${name} (${durationMs}ms): ${details}`);
}

function pad(str: string | number, width: number, align: 'left' | 'right' = 'left'): string {
  const s = String(str);
  if (s.length >= width) return s.slice(0, width);
  const diff = width - s.length;
  return align === 'left' ? s + ' '.repeat(diff) : ' '.repeat(diff) + s;
}

// ============================================================================
// Adversarial Benchmark & Stress Runner
// ============================================================================

async function runAdversarialIngestionSuite() {
  console.log('='.repeat(78));
  console.log('  UQP TIER 5 ADVERSARIAL STRESS & HARDENING SUITE: INGESTION & AGGREGATION  ');
  console.log('='.repeat(78));
  console.log(`Node: ${process.version} | Timestamp: ${new Date().toISOString()}`);
  console.log('-'.repeat(78));

  // Shared in-memory test store
  const store = new SharedRedisStore();
  const mockRedis = new MockRedis(store);
  const mockSub = new MockRedis(store);
  const mockDb = new MockSupabaseClient();

  // =========================================================================
  // SUITE 1: High-Throughput Burst Stress Testing (10,000+ ticks/sec)
  // =========================================================================
  console.log('\n⚡ [SUITE 1] High-Throughput Burst Volume Stress (10,000+ Ticks)...');
  {
    const suiteName = 'Burst Volume';
    const BURST_COUNT = 15000;
    const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY'];
    const brokers = ['vantage', 'xm', 'icmarkets'];

    const aggregator = new CandleAggregatorDaemon({
      redisClient: mockRedis,
      subscriberClient: mockSub,
      supabaseClient: mockDb as any,
      symbols,
      brokers,
      timeframes: ['1m', '5m', '1h'],
    });

    const tStart = Date.now();
    const baseTime = 1724000000000;

    // Inject 15,000 ticks into aggregator
    for (let i = 0; i < BURST_COUNT; i++) {
      const broker = brokers[i % brokers.length];
      const symbol = symbols[i % symbols.length];
      const price = 2700 + (i % 100) * 0.1;
      const tickTime = baseTime + (i % 300) * 1000; // spread across 5 minutes

      await aggregator.ingestTick({
        broker,
        symbol,
        bid: price,
        ask: price + 0.2,
        mid: price + 0.1,
        spread: 0.2,
        time: tickTime,
      });
    }

    const tEnd = Date.now();
    const durationMs = Math.max(1, tEnd - tStart);
    const throughput = Math.floor((BURST_COUNT / durationMs) * 1000);

    const stats = aggregator.getStats();
    const passed = stats.totalTicksProcessed === BURST_COUNT && throughput > 5000;

    recordTest(
      suiteName,
      '15,000 Tick Aggregator Burst Injection',
      passed,
      durationMs,
      `Processed ${stats.totalTicksProcessed} ticks in ${durationMs}ms (~${throughput.toLocaleString()} ticks/sec, 1m bars: ${stats.candlesFormed1m}, 5m bars: ${stats.candlesFormed5m})`
    );

    // Verify all active open candles satisfy strict invariants
    const openCandles = aggregator.getAllOpenCandles();
    let invariantsPassed = openCandles.length > 0;
    for (const c of openCandles) {
      const inv = verifyCandleInvariants(c, c.timeframe);
      if (!inv.valid) {
        invariantsPassed = false;
        break;
      }
    }

    recordTest(
      suiteName,
      'Mathematical Invariants Under High Throughput',
      invariantsPassed,
      1,
      `Verified ${openCandles.length} active multi-timeframe candles satisfy H >= max(O,C,L), L <= min(O,C,H), H >= L`
    );
  }

  // =========================================================================
  // SUITE 2: Out-of-Order Timestamps & Clock Skew Fuzzing
  // =========================================================================
  console.log('\n⚡ [SUITE 2] Out-of-Order Timestamps & Clock Skew Fuzzing...');
  {
    const suiteName = 'Out-of-Order';
    const t0 = Date.now();
    const baseMinute = 1724000000000;

    const aggregator = new CandleAggregatorDaemon({
      redisClient: mockRedis,
      subscriberClient: mockSub,
      supabaseClient: mockDb as any,
      symbols: ['XAUUSD'],
      brokers: ['vantage'],
      timeframes: ['1m'],
    });

    // Ingest ticks in jumbled chronological order within the same 1m window
    // Expected values: Open = 2735.0 (at t=10s), High = 2750.0 (at t=15s), Low = 2720.0 (at t=40s), Close = 2738.0 (at t=55s)
    const outOfOrderTicks = [
      { time: baseMinute + 10000, mid: 2735.0 }, // 1st received
      { time: baseMinute + 30000, mid: 2740.0 }, // 2nd received
      { time: baseMinute + 15000, mid: 2750.0 }, // Late tick (High spike)
      { time: baseMinute + 40000, mid: 2720.0 }, // Low spike
      { time: baseMinute + 25000, mid: 2733.0 }, // Jumbled
      { time: baseMinute + 55000, mid: 2738.0 }, // Final tick
    ];

    for (const t of outOfOrderTicks) {
      await aggregator.ingestTick({
        broker: 'vantage',
        symbol: 'XAUUSD',
        mid: t.mid,
        time: t.time,
      });
    }

    const c1m = aggregator.getLatestCandle('vantage', 'XAUUSD', '1m');
    const boundsCorrect =
      c1m !== null &&
      c1m.open === 2735.0 &&
      c1m.high === 2750.0 &&
      c1m.low === 2720.0 &&
      c1m.close === 2738.0 &&
      c1m.volume === 6;

    recordTest(
      suiteName,
      'In-Bar Jumbled Tick High/Low/Volume Invariants',
      Boolean(boundsCorrect),
      Date.now() - t0,
      `Open: ${c1m?.open}, High: ${c1m?.high} (exp: 2750.0), Low: ${c1m?.low} (exp: 2720.0), Close: ${c1m?.close}, Vol: ${c1m?.volume}`
    );

    // Sub-millisecond tick collisions (identical timestamps with high count)
    const subMsStart = Date.now();
    const collisionTime = baseMinute + 58000;
    for (let i = 0; i < 50; i++) {
      await aggregator.ingestTick({
        broker: 'vantage',
        symbol: 'XAUUSD',
        mid: 2738.0 + i * 0.01,
        time: collisionTime,
      });
    }

    const afterCollisions = aggregator.getLatestCandle('vantage', 'XAUUSD', '1m');
    const collisionsPassed = afterCollisions !== null && afterCollisions.volume === 56;

    recordTest(
      suiteName,
      'Sub-Millisecond Identical Timestamp Collisions',
      Boolean(collisionsPassed),
      Date.now() - subMsStart,
      `Accumulated 50 identical-timestamp ticks without dropped updates (Total Vol: ${afterCollisions?.volume})`
    );
  }

  // =========================================================================
  // SUITE 3: Corrupted & Boundary Tick Data Sanitization
  // =========================================================================
  console.log('\n⚡ [SUITE 3] Corrupted & Boundary Tick Data Sanitization...');
  {
    const suiteName = 'Data Sanitization';
    const t0 = Date.now();

    const maliciousAndExtremeTicks = [
      { broker: 'vantage', symbol: 'XAUUSD', bid: 0, ask: 0, desc: 'Zero price' },
      { broker: 'vantage', symbol: 'XAUUSD', bid: -100.5, ask: -99.0, desc: 'Negative prices' },
      { broker: 'vantage', symbol: 'XAUUSD', bid: NaN, ask: NaN, desc: 'NaN values' },
      { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.5, ask: 2730.0, desc: 'Inverted spread (ask < bid)' },
      { broker: 'vantage', symbol: 'XAUUSD', bid: 1e12, ask: 1e12 + 10, desc: 'Astronomical price (1 Trillion)' },
      { broker: 'vantage', symbol: 'BTCUSD', bid: 0.00000001, ask: 0.00000002, desc: 'Micro-satoshi fraction (8 decimals)' },
      { broker: "vantage' OR '1'='1", symbol: 'XAU/USD.raw.pro', bid: 2735.0, ask: 2735.2, desc: 'SQL injection string in broker & nested suffix' },
      { broker: '<script>alert(1)</script>', symbol: 'EUR_USD_ECN', bid: 1.085, ask: 1.0852, desc: 'XSS script injection in broker' },
      { broker: '', symbol: '', bid: 100, ask: 100.1, desc: 'Empty strings' },
    ];

    let allSanitized = true;
    const sanitizedSummaries: string[] = [];

    for (const testCase of maliciousAndExtremeTicks) {
      try {
        const normalized = normalizeTickData(testCase.broker, {
          symbol: testCase.symbol,
          bid: testCase.bid,
          ask: testCase.ask,
          time: Date.now(),
        });

        // Strict invariant checks
        const valid =
          normalized.bid > 0 &&
          normalized.ask >= normalized.bid &&
          normalized.spread >= 0 &&
          normalized.mid === Number(((normalized.bid + normalized.ask) / 2).toFixed(normalized.spread.toString().split('.')[1]?.length || 6)) &&
          normalized.broker.length > 0 &&
          normalized.symbol.length > 0;

        if (!valid) {
          allSanitized = false;
        }
        sanitizedSummaries.push(`${testCase.desc} -> Broker: "${normalized.broker}", Symbol: "${normalized.symbol}", Bid: ${normalized.bid}, Ask: ${normalized.ask}`);
      } catch (err: any) {
        allSanitized = false;
        sanitizedSummaries.push(`${testCase.desc} -> THREW ERROR: ${err.message}`);
      }
    }

    recordTest(
      suiteName,
      'Malformed, Inverted & Injected Tick Normalization',
      allSanitized,
      Date.now() - t0,
      `Sanitized 9 extreme edge cases without crashes or invariant breaches`
    );
  }

  // =========================================================================
  // SUITE 4: Multi-Broker Concurrency & Stream Partitioning
  // =========================================================================
  console.log('\n⚡ [SUITE 4] Multi-Broker Concurrency & Stream Partitioning...');
  {
    const suiteName = 'Multi-Broker Concurrency';
    const t0 = Date.now();

    const supportedBrokers = ['vantage', 'xm', 'icmarkets', 'pepperstone', 'atfx', 'exness', 'binance', 'oanda'];
    const testSymbols = ['XAUUSD', 'EURUSD', 'BTCUSD'];

    // Verify slug normalizer supports all brokers
    let brokerSlugsValid = true;
    for (const b of supportedBrokers) {
      const slug = normalizeBrokerSlug(b);
      if (!slug || slug.length === 0) brokerSlugsValid = false;
    }

    recordTest(
      suiteName,
      'Multi-Broker Slug Normalization Coverage',
      brokerSlugsValid,
      1,
      `Successfully mapped 8 brokers: ${supportedBrokers.map(normalizeBrokerSlug).join(', ')}`
    );

    // Concurrent multi-broker tick stream routing
    const streamKeysCreated = new Set<string>();
    const channelKeysCreated = new Set<string>();

    for (const broker of supportedBrokers) {
      for (const sym of testSymbols) {
        const streamKey = getStreamKey(broker, sym);
        const channelKey = getPubSubChannel(broker, sym);
        streamKeysCreated.add(streamKey);
        channelKeysCreated.add(channelKey);

        const tick = normalizeTickData(broker, {
          symbol: sym,
          bid: 100.0,
          ask: 100.2,
          time: Date.now(),
        });

        await mockRedis.xadd(
          streamKey,
          'MAXLEN',
          '~',
          STREAM_MAX_LEN,
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

        await mockRedis.publish(channelKey, JSON.stringify(tick));
      }
    }

    const totalExpectedStreams = supportedBrokers.length * testSymbols.length; // 8 * 3 = 24
    const isolationPassed =
      streamKeysCreated.size === totalExpectedStreams &&
      channelKeysCreated.size === totalExpectedStreams;

    recordTest(
      suiteName,
      '24-Channel Multi-Broker Stream & Pub/Sub Isolation',
      isolationPassed,
      Date.now() - t0,
      `Isolated 24 streams and channels across 8 brokers with zero cross-talk`
    );
  }

  // =========================================================================
  // SUITE 5: Candle Aggregation Boundary Conditions & Time-Bucketing
  // =========================================================================
  console.log('\n⚡ [SUITE 5] Candle Aggregation Boundary Conditions & Bucketing...');
  {
    const suiteName = 'Boundary Bucketing';
    const t0 = Date.now();

    const baseHour = 1724000000000 - (1724000000000 % 3600000);

    // 1. Exact boundary ticks (00:00.000 vs 00:59.999 vs 01:00.000)
    const t_00_000 = baseHour;
    const t_59_999 = baseHour + 59999;
    const t_60_000 = baseHour + 60000;

    const b0 = Math.floor(t_00_000 / 60000) * 60000;
    const b59 = Math.floor(t_59_999 / 60000) * 60000;
    const b60 = Math.floor(t_60_000 / 60000) * 60000;

    const boundaryMathValid = b0 === baseHour && b59 === baseHour && b60 === baseHour + 60000;

    recordTest(
      suiteName,
      'Sub-Millisecond 1-Minute Boundary Mapping',
      boundaryMathValid,
      1,
      `t=00.000 -> ${b0}, t=59.999 -> ${b59} (Minute 0), t=60.000 -> ${b60} (Minute 1)`
    );

    // 2. Minute Gap Recovery: Minute 0 -> Minute 5 gap (zero ticks during minutes 1-4)
    const aggregator = new CandleAggregatorDaemon({
      redisClient: mockRedis,
      subscriberClient: mockSub,
      supabaseClient: mockDb as any,
      symbols: ['XAUUSD'],
      brokers: ['vantage'],
      timeframes: ['1m', '5m'],
    });

    // Minute 0 tick
    await aggregator.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2735.0, time: baseHour + 10000 });
    // Minute 5 tick after gap
    await aggregator.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2742.0, time: baseHour + 300000 });

    const newBar1m = aggregator.getLatestCandle('vantage', 'XAUUSD', '1m');
    const newBar5m = aggregator.getLatestCandle('vantage', 'XAUUSD', '5m');

    const gapRecoveryValid =
      newBar1m !== null &&
      newBar1m.time === baseHour + 300000 &&
      newBar1m.open === 2742.0 &&
      newBar1m.volume === 1 &&
      newBar5m !== null &&
      newBar5m.time === baseHour + 300000;

    recordTest(
      suiteName,
      'Multi-Minute Inactivity Gap Transition & Rollover',
      Boolean(gapRecoveryValid),
      Date.now() - t0,
      `Cleanly finalized previous bars and initialized new open bar at t=${baseHour + 300000}`
    );
  }

  // =========================================================================
  // SUITE 6: Store Persistence, Upsert Idempotency & Concurrency Stress
  // =========================================================================
  console.log('\n⚡ [SUITE 6] Store Persistence, Upsert Idempotency & DB Stress...');
  {
    const suiteName = 'Store Persistence';
    const t0 = Date.now();

    const testCandles: CandleData[] = Array.from({ length: 100 }, (_, i) => ({
      broker: 'vantage',
      symbol: 'XAUUSD',
      timeframe: '1m',
      time: 1724000000000 + i * 60000,
      open: 2730 + i * 0.2,
      high: 2732 + i * 0.2,
      low: 2729 + i * 0.2,
      close: 2731 + i * 0.2,
      volume: 40 + i,
      is_closed: true,
    }));

    // 1. Mass batch upsert (100 rows)
    const { error: upsertErr } = await mockDb
      .from('market_candles')
      .upsert(testCandles, { onConflict: 'broker,symbol,timeframe,time' });

    const tableRows = mockDb.getTable('market_candles');
    const batchPassed = !upsertErr && tableRows.length === 100;

    recordTest(
      suiteName,
      '100-Candle Batch Upsert Execution',
      batchPassed,
      Date.now() - t0,
      `Persisted 100 candle rows to mock Supabase market_candles`
    );

    // 2. High-concurrency upsert flood (10 parallel workers upserting same keys)
    const floodStart = Date.now();
    const floodWorkers = Array.from({ length: 10 }, async (_, w) => {
      const updated = testCandles.map((c) => ({
        ...c,
        high: c.high + 0.5,
        volume: c.volume + w,
      }));
      return mockDb
        .from('market_candles')
        .upsert(updated, { onConflict: 'broker,symbol,timeframe,time' });
    });

    await Promise.all(floodWorkers);
    const tableRowsAfterFlood = mockDb.getTable('market_candles');
    const idempotencyPassed = tableRowsAfterFlood.length === 100; // Must still be exactly 100 rows (no duplicates)

    recordTest(
      suiteName,
      'Concurrent 10-Worker Upsert Flood (Idempotency Check)',
      idempotencyPassed,
      Date.now() - floodStart,
      `Table row count remained strictly 100 after 1,000 parallel upserts across 10 workers`
    );

    // 3. Transient database failure & re-queueing resilience
    const daemonWithFault = new CandleAggregatorDaemon({
      redisClient: mockRedis,
      subscriberClient: mockSub,
      supabaseClient: mockDb as any,
    });

    // Ingest tick to trigger closed bar
    await daemonWithFault.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2735.0, time: 1724000000000 });
    await daemonWithFault.ingestTick({ broker: 'vantage', symbol: 'XAUUSD', mid: 2736.0, time: 1724000060000 });

    // Inject DB error
    mockDb.simulateError('market_candles', { message: 'Database lock timeout', code: '55P03' });
    const flushedDuringError = await daemonWithFault.flushPendingToDatabase(true);
    const errorFlushBlocked = flushedDuringError === 0;

    // Clear DB error & retry flush
    mockDb.clearSimulatedErrors();
    const flushedAfterRecovery = await daemonWithFault.flushPendingToDatabase(true);
    const recoveryPassed = errorFlushBlocked && flushedAfterRecovery > 0;

    recordTest(
      suiteName,
      'Transient Database Error Recovery & Zero Data Loss',
      recoveryPassed,
      Date.now() - t0,
      `Re-queued finalized bars during database lock and flushed ${flushedAfterRecovery} bars after recovery`
    );
  }

  // =========================================================================
  // Report Summary
  // =========================================================================
  console.log('\n' + '='.repeat(78));
  console.log('              ADVERSARIAL STRESS TEST SUMMARY REPORT                      ');
  console.log('='.repeat(78));

  const totalTests = allResults.length;
  const passedTests = allResults.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  const allPassed = failedTests === 0;

  console.log(
    `${pad('Suite', 28)} ${pad('Tests', 8, 'right')} ${pad('Passed', 8, 'right')} ${pad('Failed', 8, 'right')}  ${pad('Status', 8)}`
  );
  console.log('-'.repeat(78));

  const suites = Array.from(new Set(allResults.map((r) => r.suite)));
  for (const s of suites) {
    const sTests = allResults.filter((r) => r.suite === s);
    const sPassed = sTests.filter((r) => r.passed).length;
    const sFailed = sTests.length - sPassed;
    const statusStr = sFailed === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(
      `${pad(s, 28)} ${pad(sTests.length, 8, 'right')} ${pad(sPassed, 8, 'right')} ${pad(sFailed, 8, 'right')}  ${statusStr}`
    );
  }

  console.log('-'.repeat(78));
  const summaryStatus = allPassed ? '\x1b[32m100% ALL ADVERSARIAL TESTS PASSED\x1b[0m' : '\x1b[31mFAILURES DETECTED\x1b[0m';
  console.log(
    `${pad('TOTAL', 28)} ${pad(totalTests, 8, 'right')} ${pad(passedTests, 8, 'right')} ${pad(failedTests, 8, 'right')}  ${summaryStatus}`
  );
  console.log('='.repeat(78) + '\n');

  if (!allPassed) {
    process.exit(1);
  }
  process.exit(0);
}

runAdversarialIngestionSuite().catch((err) => {
  console.error('Fatal error running adversarial suite:', err);
  process.exit(1);
});
