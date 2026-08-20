import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Institutional Next.js SSE Price Streaming Route (UQP Milestone M3)
 * Consumes real-time broker ticks from Redis Pub/Sub (`channel:ticks:{broker}:*`)
 * and emits throttled SSE JSON price frames with a 250ms debounce window.
 *
 * Replaces legacy REST polling loops (Binance, Twelve Data, Yahoo Finance)
 * with zero outbound network calls and sub-100ms internal quote distribution.
 */
export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder();
  const { signal } = request;

  const url = new URL(request.url);
  const broker = url.searchParams.get('broker')?.toLowerCase() || 'vantage';
  const debounceMs = 250;
  const autoCloseMs = 270_000; // 4.5 minutes safety timeout

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let debounceTimer: NodeJS.Timeout | null = null;
      let autoCloseTimer: NodeJS.Timeout | null = null;
      let pendingPrices: Record<string, number> = {};

      const redisClient = (typeof globalThis !== 'undefined' && (globalThis as any).__mockRedis) || redis;
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
        try {
          subscriber.disconnect();
        } catch {
          // Ignore disconnection errors
        }
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
      subscriber.on('pmessage', (_pattern: string, _channel: string, message: string) => {
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

      try {
        await subscriber.psubscribe(`channel:ticks:${broker}:*`);
      } catch (err) {
        console.error('[Price Stream] Failed to subscribe to Redis tick channel:', err);
        cleanup();
        return;
      }

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
}
