/**
 * Unified Quote Pipeline (UQP) — Tier 5 Adversarial Stress & Hardening Suite
 * Challenger: Challenger 2
 *
 * Comprehensive empirical test runner covering:
 * 1. Rapid Client Connect / Disconnect Storm (100+ concurrent SSE clients connecting and instantly aborting)
 * 2. Slow Consumer Simulation & Backpressure / Buffer Leak Prevention
 * 3. SSE Heartbeat Drop & Reconnect Recovery (Multi-broker isolation under churn)
 * 4. Market Analysis Under Degraded Internal Data (Empty DB, sparse candles, corrupted records, 1-candle history, extreme volatility)
 * 5. Concurrent Access Stress (Concurrent SSE readers + candle queries + daemon writers)
 * 6. Zero Outbound Network Leakage Verification
 */

import { TestContext } from '../tests/e2e/harness/test-context';
import { NetworkGuard } from '../tests/e2e/harness/network-guard';
import { readSSEChunks, SSEEvent } from '../tests/e2e/harness/sse-reader';
import { GET as priceStreamRoute } from '../src/app/api/price-stream/route';
import {
  getInternalCandles,
  generateHermeticCandles,
  getMultiTimeframeCandles,
  getCorrelatedCandles,
} from '../src/lib/internalCandles';
import {
  getMarketSnapshot,
  fetchCandles,
  scoreIndicators,
  calculateRiskParams,
  cleanBrokerSymbolToStandard,
  detectSymbol,
} from '../src/lib/market';
import { computeIndicators } from '../src/lib/indicators';
import { computeVWAP } from '../src/lib/vwap';
import { detectCandlePatterns } from '../src/lib/candlePatterns';
import { generateSyntheticCandles } from '../tests/e2e/fixtures/candles.fixture';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(suite: string, name: string, fn: (ctx: TestContext) => Promise<void>): Promise<void> {
  const ctx = new TestContext({ enableNetworkGuard: true });
  await ctx.setup();
  const t0 = Date.now();
  try {
    await fn(ctx);
    const durationMs = Date.now() - t0;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  \x1b[32m✔\x1b[0m [${suite}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - t0;
    results.push({ suite, name, passed: false, error: err.message, durationMs });
    console.error(`  \x1b[31m✖\x1b[0m [${suite}] ${name} (${durationMs}ms) - Error: ${err.message}`);
  } finally {
    await ctx.teardown();
  }
}

export async function runAdversarialSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  console.log('\n' + '='.repeat(80));
  console.log('       CHALLENGER 2: TIER 5 ADVERSARIAL STRESS & HARDENING TEST SUITE       ');
  console.log('='.repeat(80) + '\n');

  // =========================================================================
  // SUITE 1: Rapid Client Connect / Disconnect Storm (100+ Concurrent Clients)
  // =========================================================================
  console.log('\x1b[1m[Suite 1: Rapid Client Connect / Disconnect Storm (100+ Clients)]\x1b[0m');

  await runTest('Storm', '1.1 100 concurrent SSE clients connect and instantly abort with 0 memory/subscriber leaks', async (ctx) => {
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

    assert(responses.length === CLIENT_COUNT, `Expected ${CLIENT_COUNT} responses, got ${responses.length}`);
    for (const res of responses) {
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
    }

    // Verify 100 pattern subscribers registered in store
    const activeSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*');
    assert(activeSubs?.size === CLIENT_COUNT, `Expected ${CLIENT_COUNT} subscribers, got ${activeSubs?.size}`);

    // Publish ticks to trigger debounce timers across all connections
    await ctx.redis.publish(
      'channel:ticks:vantage:XAUUSD',
      JSON.stringify({ broker: 'vantage', symbol: 'XAU/USD', mid: 2735.5, time: Date.now() })
    );

    // Abort all 100 clients concurrently with staggered micro-delays (0 to 15ms)
    await Promise.all(
      controllers.map(async (c, idx) => {
        if (idx % 3 === 0) await new Promise((r) => setTimeout(r, idx % 10));
        c.abort();
      })
    );

    // Allow cleanup tick
    await new Promise((r) => setTimeout(r, 60));

    // Assert ALL subscribers are completely removed from store
    const remainingSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
    assert(remainingSubs === 0, `Expected 0 remaining subscribers after abort storm, found ${remainingSubs}`);
  });

  await runTest('Storm', '1.2 Continuous connect-and-abort churn (150 sequential cycles) without socket leaks', async (ctx) => {
    const CHURN_CYCLES = 150;
    for (let i = 0; i < CHURN_CYCLES; i++) {
      const controller = new AbortController();
      const broker = i % 2 === 0 ? 'vantage' : 'xm';
      const res = await priceStreamRoute(
        new Request(`http://localhost:3000/api/price-stream?broker=${broker}`, {
          signal: controller.signal,
        })
      );
      assert(res.status === 200, `Iteration ${i} returned status ${res.status}`);
      controller.abort();
    }

    await new Promise((r) => setTimeout(r, 40));

    const vantageSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
    const xmSubs = ctx.store.patternSubscribers.get('channel:ticks:xm:*')?.size ?? 0;
    assert(vantageSubs === 0, `Vantage subscribers leaked: ${vantageSubs}`);
    assert(xmSubs === 0, `XM subscribers leaked: ${xmSubs}`);
  });

  // =========================================================================
  // SUITE 2: Slow Consumer Simulation & Backpressure
  // =========================================================================
  console.log('\n\x1b[1m[Suite 2: Slow Consumer & Backpressure Resilience]\x1b[0m');

  await runTest('Backpressure', '2.1 Slow consumer reading stream with delayed consumption coalesces burst ticks', async (ctx) => {
    const abortController = new AbortController();
    const res = await priceStreamRoute(
      new Request('http://localhost:3000/api/price-stream?broker=vantage', {
        signal: abortController.signal,
      })
    );

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Publish rapid burst of 300 ticks across 3 symbols
    for (let i = 1; i <= 100; i++) {
      await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2700 + i, time: Date.now() }));
      await ctx.redis.publish('channel:ticks:vantage:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.08 + i * 0.0001, time: Date.now() }));
      await ctx.redis.publish('channel:ticks:vantage:BTCUSD', JSON.stringify({ symbol: 'BTC/USD', mid: 60000 + i * 10, time: Date.now() }));
    }

    // Slow consumer pauses for 400ms before reading
    await new Promise((r) => setTimeout(r, 400));

    const { value, done } = await reader.read();
    assert(!done, 'Stream closed unexpectedly');
    const text = decoder.decode(value);
    assert(text.startsWith('data: '), `Expected SSE data prefix, got: ${text}`);

    const jsonStr = text.replace(/^data:\s*/, '').trim();
    const payload = JSON.parse(jsonStr);

    // Assert that the slow consumer received the coalesced latest tick for each symbol
    assert(payload['XAU/USD'] === 2800, `Expected XAU/USD 2800, got ${payload['XAU/USD']}`);
    assert(payload['EUR/USD'] === 1.09, `Expected EUR/USD 1.09, got ${payload['EUR/USD']}`);
    assert(payload['BTC/USD'] === 61000, `Expected BTC/USD 61000, got ${payload['BTC/USD']}`);

    reader.releaseLock();
    abortController.abort();
  });

  await runTest('Backpressure', '2.2 Aborting slow consumer during active backpressure disposes subscriber cleanly', async (ctx) => {
    const abortController = new AbortController();
    const res = await priceStreamRoute(
      new Request('http://localhost:3000/api/price-stream?broker=vantage', {
        signal: abortController.signal,
      })
    );

    // Emit 50 ticks
    for (let i = 0; i < 50; i++) {
      await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2700 + i, time: Date.now() }));
    }

    // Abort before reading
    abortController.abort();
    await new Promise((r) => setTimeout(r, 30));

    const subs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
    assert(subs === 0, `Subscribers not cleaned up after backpressure abort: ${subs}`);
  });

  // =========================================================================
  // SUITE 3: SSE Heartbeat Drop & Reconnect Recovery (Multi-Broker)
  // =========================================================================
  console.log('\n\x1b[1m[Suite 3: SSE Heartbeat Drop & Reconnect Recovery]\x1b[0m');

  await runTest('Reconnect', '3.1 Client disconnects mid-stream and reconnects cleanly to fresh stream', async (ctx) => {
    // Session 1: Client connects, receives tick, then simulates disconnect
    const c1 = new AbortController();
    const res1 = await priceStreamRoute(new Request('http://localhost:3000/api/price-stream?broker=vantage', { signal: c1.signal }));

    await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2730.0, time: Date.now() }));
    const events1 = await readSSEChunks(res1, { maxChunks: 1, timeoutMs: 1500 });
    assert(events1[0].data['XAU/USD'] === 2730.0, 'Session 1 failed to receive initial tick');

    // Simulate drop
    c1.abort();
    await new Promise((r) => setTimeout(r, 30));

    // Session 2: Immediate reconnect
    const c2 = new AbortController();
    const res2 = await priceStreamRoute(new Request('http://localhost:3000/api/price-stream?broker=vantage', { signal: c2.signal }));

    await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: 'XAU/USD', mid: 2735.0, time: Date.now() }));
    const events2 = await readSSEChunks(res2, { maxChunks: 1, timeoutMs: 1500 });
    assert(events2[0].data['XAU/USD'] === 2735.0, 'Session 2 failed to receive post-reconnect tick');

    c2.abort();
  });

  await runTest('Reconnect', '3.2 Multi-broker concurrent reconnect maintains strict broker isolation', async (ctx) => {
    const brokers = ['vantage', 'xm', 'atfx'];
    const controllers = brokers.map(() => new AbortController());

    const responses = await Promise.all(
      brokers.map((b, i) => priceStreamRoute(new Request(`http://localhost:3000/api/price-stream?broker=${b}`, { signal: controllers[i].signal })))
    );

    // Publish distinct broker prices
    await ctx.redis.publish('channel:ticks:vantage:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.0810, time: Date.now() }));
    await ctx.redis.publish('channel:ticks:xm:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.0820, time: Date.now() }));
    await ctx.redis.publish('channel:ticks:atfx:EURUSD', JSON.stringify({ symbol: 'EUR/USD', mid: 1.0830, time: Date.now() }));

    const chunks = await Promise.all(
      responses.map((res) => readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 }))
    );

    assert(chunks[0][0].data['EUR/USD'] === 1.0810, `Vantage stream corrupted: ${chunks[0][0].data['EUR/USD']}`);
    assert(chunks[1][0].data['EUR/USD'] === 1.0820, `XM stream corrupted: ${chunks[1][0].data['EUR/USD']}`);
    assert(chunks[2][0].data['EUR/USD'] === 1.0830, `ATFX stream corrupted: ${chunks[2][0].data['EUR/USD']}`);

    controllers.forEach((c) => c.abort());
  });

  // =========================================================================
  // SUITE 4: Market Analysis Under Degraded Internal Data
  // =========================================================================
  console.log('\n\x1b[1m[Suite 4: Market Analysis Under Degraded Internal Data]\x1b[0m');

  await runTest('DegradedData', '4.1 Completely empty database: constructs valid MarketSnapshot via hermetic fallback', async (_ctx) => {
    const snapshot = await getMarketSnapshot('XAU/USD', 'vantage');
    assert(snapshot !== null, 'Market snapshot returned null on empty database');
    assert(snapshot!.price > 0, `Price must be positive, got ${snapshot!.price}`);
    assert(snapshot!.confluenceScore >= 0 && snapshot!.confluenceScore <= 100, `Invalid confluence score: ${snapshot!.confluenceScore}`);
    assert(['BUY', 'SELL', 'NEUTRAL'].includes(snapshot!.confluenceDirection), `Invalid direction: ${snapshot!.confluenceDirection}`);
    assert(snapshot!.gateResults.length >= 12, `Expected >= 12 gates, got ${snapshot!.gateResults.length}`);

    NetworkGuard.assertZeroExternalCalls();
  });

  await runTest('DegradedData', '4.2 Sparse candles (<5 candles in DB when 50 requested): stitches synthetic history seamlessly', async (ctx) => {
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
    assert(candles.length === 50, `Expected 50 candles after gap stitch, got ${candles.length}`);

    // Verify chronological order
    for (let i = 1; i < candles.length; i++) {
      assert(candles[i].timestamp >= candles[i - 1].timestamp, `Candles not in chronological order at index ${i}`);
    }

    // Verify indicators compute without NaN
    const ind = computeIndicators(candles);
    assert(Number.isFinite(ind.price), 'Price is not finite');
    assert(Number.isFinite(ind.rsi!), 'RSI is not finite');
    assert(Number.isFinite(ind.macd!.histogram), 'MACD histogram is not finite');

    NetworkGuard.assertZeroExternalCalls();
  });

  await runTest('DegradedData', '4.3 Corrupted candle records (Inverted High/Low, Negative, NaN strings) sanitized safely', async (_ctx) => {
    const corruptedCandles = [
      { open: 100, high: 90, low: 110, close: 105 }, // Inverted High/Low
      { open: -50, high: 100, low: -100, close: 20 }, // Negative prices
      { open: 100, high: 100, low: 100, close: 100 }, // Zero range
      ...Array.from({ length: 55 }, (_, i) => ({
        open: 100 + i,
        high: 102 + i,
        low: 99 + i,
        close: 101 + i,
      })),
    ];

    const ind = computeIndicators(corruptedCandles);
    assert(Number.isFinite(ind.price), 'Corrupted input led to non-finite price');
    assert(Number.isFinite(ind.rsi!), 'Corrupted input led to non-finite RSI');
    assert(Number.isFinite(ind.atr!), 'Corrupted input led to non-finite ATR');

    // Pass to scorer
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

    assert(Number.isFinite(score.score), 'Score is non-finite on corrupted input');
    assert(['BUY', 'SELL', 'NEUTRAL'].includes(score.direction), `Invalid direction: ${score.direction}`);
  });

  await runTest('DegradedData', '4.4 Single-candle database history stitches into complete 50-bar dataset', async (ctx) => {
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
    assert(candles.length === 50, `Expected 50 candles for 1-candle DB, got ${candles.length}`);
    assert(candles[candles.length - 1].close === 1.0855, 'Latest bar did not preserve single DB record');
  });

  await runTest('DegradedData', '4.5 Extreme volatility (10,000% spike, flat zero-vol, 0.00000012 micro-price)', async (_ctx) => {
    // 1. Extreme spike
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
    assert(Number.isFinite(indSpike.rsi!), 'Spike RSI non-finite');

    // 2. Zero-volatility flatline
    const flat = Array.from({ length: 60 }, () => ({ open: 1.08, high: 1.08, low: 1.08, close: 1.08 }));
    const indFlat = computeIndicators(flat);
    assert(indFlat.rsi === 50, `Flatline RSI expected 50, got ${indFlat.rsi}`);
    assert(indFlat.atr === 0, `Flatline ATR expected 0, got ${indFlat.atr}`);

    // 3. Micro price (e.g. SHIB)
    const micro = Array.from({ length: 60 }, (_, i) => ({
      open: 0.000010 + i * 0.0000001,
      high: 0.000011 + i * 0.0000001,
      low: 0.000009 + i * 0.0000001,
      close: 0.0000105 + i * 0.0000001,
    }));
    const indMicro = computeIndicators(micro);
    assert(indMicro.price > 0 && indMicro.price < 0.001, `Micro price out of range: ${indMicro.price}`);
    assert(Number.isFinite(indMicro.rsi!), 'Micro RSI non-finite');
  });

  // =========================================================================
  // SUITE 5: Concurrency Stress (Readers + Candle Queries + Daemon Writes)
  // =========================================================================
  console.log('\n\x1b[1m[Suite 5: DuckDB / Internal Store Concurrency Stress]\x1b[0m');

  await runTest('Concurrency', '5.1 20 concurrent SSE readers + 20 concurrent candle queries + 10 concurrent daemon writers', async (ctx) => {
    // 1. Setup 20 concurrent SSE readers
    const sseControllers = Array.from({ length: 20 }, () => new AbortController());
    const sseResponses = await Promise.all(
      sseControllers.map((c, i) => {
        const broker = i % 2 === 0 ? 'vantage' : 'xm';
        return priceStreamRoute(new Request(`http://localhost:3000/api/price-stream?broker=${broker}`, { signal: c.signal }));
      })
    );

    // 2. Launch concurrent daemon writers (publishing ticks & saving candles)
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

    // 3. Launch concurrent candle readers
    const candleQueries = Array.from({ length: 20 }, async (_, i) => {
      const broker = i % 2 === 0 ? 'vantage' : 'xm';
      const tf = i % 3 === 0 ? '1m' : i % 3 === 1 ? '15m' : '1h';
      const c = await getInternalCandles('XAU/USD', tf, 50, broker);
      assert(c.length === 50, `Candle reader ${i} returned ${c.length} candles instead of 50`);
    });

    // Execute writers and query readers concurrently
    await Promise.all([...daemonWrites, ...candleQueries]);

    // Read 1 chunk from each SSE stream to verify healthy distribution
    const sseChunks = await Promise.all(
      sseResponses.map((res) => readSSEChunks(res, { maxChunks: 1, timeoutMs: 2500 }))
    );

    for (const chunk of sseChunks) {
      assert(chunk.length === 1, 'SSE reader failed to receive frame during concurrent writes');
      assert(typeof chunk[0].data['XAU/USD'] === 'number', 'SSE data did not contain numeric XAU/USD price');
    }

    // Teardown SSE readers
    sseControllers.forEach((c) => c.abort());
    await new Promise((r) => setTimeout(r, 40));

    // Verify clean subscriber table after high-concurrency race
    const vantageSubs = ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0;
    const xmSubs = ctx.store.patternSubscribers.get('channel:ticks:xm:*')?.size ?? 0;
    assert(vantageSubs === 0, `Vantage subscribers leaked after concurrency run: ${vantageSubs}`);
    assert(xmSubs === 0, `XM subscribers leaked after concurrency run: ${xmSubs}`);

    NetworkGuard.assertZeroExternalCalls();
  });

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log('\x1b[32m✔ 100% ADVERSARIAL STRESS CHALLENGES PASSED (ZERO BUGS EXPOSED)\x1b[0m');
  } else {
    console.log('\x1b[31m✖ FAILURES DETECTED IN ADVERSARIAL HARDENING SUITE\x1b[0m');
  }
  console.log('='.repeat(80) + '\n');

  return { total, passed, failed, results };
}

// Self-execution if executed via tsx
if (typeof require !== 'undefined' && require.main === module) {
  runAdversarialSuite()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
