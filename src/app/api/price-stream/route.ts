export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Yahoo Finance symbol map — completely free, no API key, no rate limits
// key = our internal watchlist key (matches useLivePrices SYMBOL_TO_KEY values)
const YF_SYMBOLS: Record<string, string> = {
  'XAU/USD': 'GC=F',       // Gold futures
  'BTC/USD': 'BTC-USD',    // Bitcoin
  'ETH/USD': 'ETH-USD',    // Ethereum
  'EUR/USD': 'EURUSD=X',   // EUR/USD forex
  'GBP/USD': 'GBPUSD=X',   // GBP/USD forex
  'QQQ':     'QQQ',        // Nasdaq ETF
  'DIA':     'DIA',        // Dow ETF
  'USO':     'USO',        // Oil ETF
  'SPY':     'SPY',        // S&P 500 ETF
};

const INTERNAL_KEYS = Object.keys(YF_SYMBOLS);
const YF_TICKERS   = Object.values(YF_SYMBOLS).join(',');

// Poll every 3 s — Yahoo Finance has no enforced rate limit for this endpoint
const POLL_MS = 3000;

async function fetchBatch(): Promise<Record<string, number>> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(YF_TICKERS)}&fields=regularMarketPrice`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        // Mimic a browser so Yahoo doesn't block the request
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return {};
    const data = await res.json();
    const results: any[] = data?.quoteResponse?.result ?? [];

    // Build reverse map: yf ticker → internal key
    const reverseMap: Record<string, string> = {};
    for (const [internal, yf] of Object.entries(YF_SYMBOLS)) {
      reverseMap[yf] = internal;
    }

    const out: Record<string, number> = {};
    for (const item of results) {
      const internal = reverseMap[item.symbol];
      if (internal && item.regularMarketPrice) {
        out[internal] = item.regularMarketPrice;
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

      // Send first tick immediately
      const initial = await fetchBatch();
      if (Object.keys(initial).length > 0) send(JSON.stringify(initial));

      // Then poll every POLL_MS
      const timer = setInterval(async () => {
        if (closed) { clearInterval(timer); return; }
        const prices = await fetchBatch();
        if (Object.keys(prices).length > 0) send(JSON.stringify(prices));
      }, POLL_MS);

      // Auto-close after ~4.5 min so Vercel doesn't kill the response abruptly
      setTimeout(() => {
        closed = true;
        clearInterval(timer);
        try { controller.close(); } catch {}
      }, 270_000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
