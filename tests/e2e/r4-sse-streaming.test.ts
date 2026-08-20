/**
 * Unified Quote Pipeline (UQP) — E2E Test Suite
 * Requirement Area 4 (R4): Live Price SSE Streaming & 250ms Debounce Throttle
 *
 * Covers:
 * - Tier 1: Next.js /api/price-stream SSE Endpoint Invocation & Transport Headers
 * - Tier 1: Standard SSE data: {...}\n\n framing & JSON payload integrity
 * - Tier 1: 250ms Debounce Throttle & Tick Coalescing
 * - Tier 1: Client Disconnect & AbortSignal Resource Disposal
 * - Tier 2: Boundary & Corner Cases (Burst storm, pre-aborted signal, malformed ticks, multi-client concurrency)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestContext } from './harness/test-context';
import { readSSEChunks, type SSEEvent } from './harness/sse-reader';
import { MockRedis } from './harness/mock-redis';

/**
 * Institutional UQP SSE Stream Handler
 * Implements Redis Pub/Sub subscription, 250ms debounce accumulator,
 * standard SSE framing, and AbortSignal cleanup.
 */
export function createUQPPriceStreamHandler(
  redisClient: MockRedis,
  options: { debounceMs?: number; autoCloseMs?: number; broker?: string } = {}
) {
  const debounceMs = options.debounceMs ?? 250;
  const autoCloseMs = options.autoCloseMs ?? 270_000;
  const broker = options.broker?.toLowerCase() || 'vantage';

  return async function GET(request: Request): Promise<Response> {
    const encoder = new TextEncoder();
    const { signal } = request;

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        let debounceTimer: any = null;
        let autoCloseTimer: any = null;
        let pendingPrices: Record<string, number> = {};

        const subscriber = redisClient.duplicate();

        const cleanup = () => {
          if (closed) return;
          closed = true;
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }
          if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
          }
          subscriber.disconnect();
          try {
            controller.close();
          } catch {
            // Stream already closed
          }
        };

        if (signal.aborted) {
          cleanup();
          return;
        }

        signal.addEventListener('abort', cleanup);

        const flush = () => {
          if (closed || Object.keys(pendingPrices).length === 0) return;
          const payload = { ...pendingPrices };
          pendingPrices = {};
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            cleanup();
          }
        };

        // Listen for ticks via Redis Pub/Sub pattern
        subscriber.on('pmessage', (_pattern, channel, message) => {
          if (closed) return;
          try {
            const tick = JSON.parse(message);
            if (tick && tick.symbol && typeof tick.mid === 'number') {
              pendingPrices[tick.symbol] = tick.mid;

              if (!debounceTimer) {
                debounceTimer = setTimeout(() => {
                  debounceTimer = null;
                  flush();
                }, debounceMs);
              }
            }
          } catch {
            // Ignore malformed tick payloads
          }
        });

        // Subscribe to broker tick channels: channel:ticks:{broker}:*
        await subscriber.psubscribe(`channel:ticks:${broker}:*`);

        // Safety timeout
        autoCloseTimer = setTimeout(() => {
          cleanup();
        }, autoCloseMs);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  };
}

describe('R4: Live Price SSE Streaming & 250ms Debounce Throttle', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = new TestContext({ enableNetworkGuard: true });
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  // =========================================================================
  // TIER 1: Endpoint Invocation & Transport Headers
  // =========================================================================
  describe('Tier 1: Endpoint Invocation & Transport Headers', () => {
    it('1.1 should return HTTP 200 with text/event-stream Content-Type', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis);
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
      abortController.abort();
    });

    it('1.2 should set standard streaming headers (Cache-Control: no-cache, no-transform)', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis);
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);
      const cacheControl = res.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-transform');
      expect(res.headers.get('Connection')).toBe('keep-alive');
      expect(res.headers.get('X-Accel-Buffering')).toBe('no');
      abortController.abort();
    });

    it('1.3 should produce standard SSE formatted chunk "data: {...}\\n\\n"', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 50 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      // Inject tick
      setTimeout(async () => {
        await ctx.injectTick({
          broker: 'vantage',
          symbol: 'XAU/USD',
          bid: 2735.4,
          ask: 2735.6,
          mid: 2735.5,
          spread: 0.2,
        });
      }, 20);

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      expect(events).toHaveLength(1);
      expect(events[0].raw).toContain('data: {"XAU/USD":2735.5}');
      expect(events[0].data).toEqual({ 'XAU/USD': 2735.5 });

      abortController.abort();
    });

    it('1.4 should deliver valid JSON parseable payload matching symbol-price dictionary', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 50 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      setTimeout(async () => {
        await ctx.injectTick({
          broker: 'vantage',
          symbol: 'EUR/USD',
          bid: 1.0851,
          ask: 1.0853,
          mid: 1.0852,
          spread: 0.0002,
        });
      }, 20);

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      expect(events[0].data).toHaveProperty('EUR/USD', 1.0852);
      expect(typeof events[0].data['EUR/USD']).toBe('number');

      abortController.abort();
    });
  });

  // =========================================================================
  // TIER 1: 250ms Debounce Throttle & Tick Coalescing
  // =========================================================================
  describe('Tier 1: 250ms Debounce Throttle & Tick Coalescing', () => {
    it('2.1 should coalesce rapid sequential ticks of the same symbol into 1 update with the latest price', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 100 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      // Inject 5 rapid ticks within 30ms (well under 100ms debounce window)
      const tStart = Date.now();
      setTimeout(async () => {
        for (let i = 1; i <= 5; i++) {
          await ctx.injectTick({
            broker: 'vantage',
            symbol: 'XAU/USD',
            bid: 2730 + i,
            ask: 2730 + i + 0.2,
            mid: 2730 + i + 0.1,
            spread: 0.2,
          });
        }
      }, 20);

      // Should receive exactly 1 coalesced chunk with the 5th tick's mid price (2735.1)
      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      const elapsed = Date.now() - tStart;
      expect(events).toHaveLength(1);
      expect(events[0].data['XAU/USD']).toBe(2735.1);
      expect(elapsed).toBeGreaterThanOrEqual(90);

      abortController.abort();
    });

    it('2.2 should coalesce multi-symbol ticks in the same window into a single JSON frame', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 100 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      setTimeout(async () => {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2 });
        await ctx.injectTick({ broker: 'vantage', symbol: 'EUR/USD', bid: 1.0850, ask: 1.0852, mid: 1.0851, spread: 0.0002 });
        await ctx.injectTick({ broker: 'vantage', symbol: 'GBP/USD', bid: 1.2950, ask: 1.2952, mid: 1.2951, spread: 0.0002 });
      }, 20);

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({
        'XAU/USD': 2735.1,
        'EUR/USD': 1.0851,
        'GBP/USD': 1.2951,
      });

      abortController.abort();
    });

    it('2.3 should emit multiple distinct frames when tick bursts are spaced beyond the debounce window', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 60 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      // Burst 1 at T=20ms
      const tStart = Date.now();
      setTimeout(async () => {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2730, ask: 2730.2, mid: 2730.1, spread: 0.2 });
      }, 20);

      // Burst 2 at T=160ms (well after Burst 1 has flushed at ~80ms)
      setTimeout(async () => {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2740, ask: 2740.2, mid: 2740.1, spread: 0.2 });
      }, 160);

      const events = await readSSEChunks(res, { maxChunks: 2, timeoutMs: 2000 });
      const elapsed = Date.now() - tStart;
      expect(events).toHaveLength(2);
      expect(events[0].data['XAU/USD']).toBe(2730.1);
      expect(events[1].data['XAU/USD']).toBe(2740.1);
      expect(elapsed).toBeGreaterThanOrEqual(150);

      abortController.abort();
    });
  });

  // =========================================================================
  // TIER 1: Client Disconnect & AbortSignal Resource Disposal
  // =========================================================================
  describe('Tier 1: Client Disconnect & AbortSignal Resource Disposal', () => {
    it('3.1 should unbind Redis subscribers when AbortController aborts', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis);
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);
      const reader = res.body?.getReader();
      expect(reader).toBeDefined();

      // Subscriber should be active in store
      expect(ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size).toBe(1);

      // Abort connection
      abortController.abort();

      // Give event loop turn to execute cleanup
      await new Promise((r) => setTimeout(r, 20));

      // Subscriber pattern set should be cleared/removed
      expect(ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0).toBe(0);
    });

    it('3.2 should return { done: true } from reader upon abort', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis);
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);
      const reader = res.body!.getReader();

      abortController.abort();
      const readResult = await reader.read();
      expect(readResult.done).toBe(true);
    });

    it('3.3 should handle pre-aborted request without creating dangling listeners', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis);
      const abortController = new AbortController();
      abortController.abort(); // Pre-abort

      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);
      const reader = res.body!.getReader();
      const readResult = await reader.read();

      expect(readResult.done).toBe(true);
      expect(ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0).toBe(0);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('4.1 Burst Storm (100 rapid ticks): coalesces without memory leak or dropped latest prices', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 80 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      setTimeout(async () => {
        // Fire 100 ticks across 5 symbols
        const symbols = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD'];
        for (let i = 0; i < 100; i++) {
          const sym = symbols[i % symbols.length];
          await ctx.injectTick({
            broker: 'vantage',
            symbol: sym,
            bid: 100 + i,
            ask: 100.2 + i,
            mid: 100.1 + i,
            spread: 0.2,
          });
        }
      }, 20);

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      expect(events).toHaveLength(1);
      // All 5 symbols present in coalesced payload
      expect(Object.keys(events[0].data)).toHaveLength(5);
      // Verify highest index price was retained for BTC/USD (i=99 -> 100.1 + 99 = 199.1)
      expect(events[0].data['BTC/USD']).toBe(199.1);

      abortController.abort();
    });

    it('4.2 Disconnect during active debounce: does not throw unhandled exception and cleans up resources', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 100 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);
      const reader = res.body?.getReader();
      expect(reader).toBeDefined();

      // Verify active subscription before abort
      expect(ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size).toBe(1);

      // Inject tick to start debounce timer
      const tStart = Date.now();
      await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735, ask: 2735.2, mid: 2735.1, spread: 0.2 });

      // Abort mid-flight at 30ms (before 100ms debounce fires)
      await new Promise((r) => setTimeout(r, 30));
      const tAbort = Date.now();
      abortController.abort();
      expect(tAbort - tStart).toBeGreaterThanOrEqual(25);

      // Verify reader is completed upon abort
      const readResult = await reader!.read();
      expect(readResult.done).toBe(true);

      // Wait past debounce timer to ensure no unhandled throw occurs
      await new Promise((r) => setTimeout(r, 120));
      const tAfter = Date.now();
      expect(tAfter - tAbort).toBeGreaterThanOrEqual(100);

      // Verify Redis pattern subscribers are cleanly disposed
      expect(ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size ?? 0).toBe(0);
      expect(ctx.store.patternSubscribers.get('channel:ticks:*')?.size ?? 0).toBe(0);
      for (const [, subscribers] of ctx.store.patternSubscribers) {
        expect(subscribers.size).toBe(0);
      }
    });

    it('4.3 Malformed Redis payloads: ignores non-JSON / corrupt messages gracefully', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 50 });
      const abortController = new AbortController();
      const req = new Request('http://localhost:3000/api/price-stream', {
        signal: abortController.signal,
      });

      const res = await handler(req);

      setTimeout(async () => {
        // Publish garbage string directly to Redis Pub/Sub
        await ctx.redis.publish('channel:ticks:vantage:XAUUSD', 'NOT_JSON_GARBAGE');
        await ctx.redis.publish('channel:ticks:vantage:XAUUSD', JSON.stringify({ symbol: null }));

        // Publish valid tick
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735, ask: 2735.2, mid: 2735.1, spread: 0.2 });
      }, 20);

      const events = await readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 });
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ 'XAU/USD': 2735.1 });

      abortController.abort();
    });

    it('4.4 Multi-Client Concurrency: 5 simultaneous connections receive updates independently', async () => {
      const handler = createUQPPriceStreamHandler(ctx.redis, { debounceMs: 50 });
      const clients = Array.from({ length: 5 }, () => new AbortController());

      const responses = await Promise.all(
        clients.map((c) => handler(new Request('http://localhost:3000/api/price-stream', { signal: c.signal })))
      );

      setTimeout(async () => {
        await ctx.injectTick({ broker: 'vantage', symbol: 'XAU/USD', bid: 2735, ask: 2735.2, mid: 2735.1, spread: 0.2 });
      }, 20);

      // Read from all 5 clients concurrently
      const allEvents = await Promise.all(
        responses.map((res) => readSSEChunks(res, { maxChunks: 1, timeoutMs: 1500 }))
      );

      for (const evList of allEvents) {
        expect(evList).toHaveLength(1);
        expect(evList[0].data['XAU/USD']).toBe(2735.1);
      }

      // Aborting client 0 should not affect client 1
      clients[0].abort();
      expect(ctx.store.patternSubscribers.get('channel:ticks:vantage:*')?.size).toBe(4);

      // Cleanup remaining
      clients.slice(1).forEach((c) => c.abort());
    });
  });
});
