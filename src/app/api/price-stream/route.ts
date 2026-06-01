import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// All watchlist symbols → Twelve Data format
const SYMBOLS = [
  'XAU/USD',
  'BTC/USD',
  'ETH/USD',
  'EUR/USD',
  'GBP/USD',
  'QQQ',
  'DIA',
  'USO',
  'SPY',
];

// How often we poll Twelve Data (ms). Free tier: 8 calls/min per key.
// 9 symbols × 1 = 9 calls. We batch via /prices endpoint.
const POLL_MS = 2000; // 2 s — responsive enough without hammering quota

function getApiKey() {
  return process.env.TWELVE_DATA_API_KEY || '';
}

// Fetch all prices in ONE batch call using /prices?symbol=A,B,C
async function fetchBatch(): Promise<Record<string, number>> {
  const key = getApiKey();
  if (!key) return {};
  try {
    const url = `https://api.twelvedata.com/price?symbol=${SYMBOLS.map(encodeURIComponent).join(',')}&apikey=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();

    const out: Record<string, number> = {};

    // If single symbol, Twelve Data returns { price: "..." }
    // If multiple, returns { "XAU/USD": { price: "..." }, ... }
    if (typeof data?.price === 'string') {
      // shouldn't happen with multiple but guard it
      out[SYMBOLS[0]] = parseFloat(data.price);
    } else {
      for (const sym of SYMBOLS) {
        const entry = data[sym];
        if (entry?.price) out[sym] = parseFloat(entry.price);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Immediately send first tick
      const initial = await fetchBatch();
      send(JSON.stringify(initial));

      // Then poll every POLL_MS
      const timer = setInterval(async () => {
        if (closed) {
          clearInterval(timer);
          return;
        }
        const prices = await fetchBatch();
        if (Object.keys(prices).length > 0) {
          send(JSON.stringify(prices));
        }
      }, POLL_MS);

      // Clean up when client disconnects
      const cleanup = () => {
        closed = true;
        clearInterval(timer);
        try { controller.close(); } catch {}
      };

      // Signal cleanup after 5 minutes (Vercel 5-min limit) — client will reconnect
      setTimeout(cleanup, 290_000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
