export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Source 1: Binance (BTC, ETH) ───────────────────────────
// Free, no API key, ~1200 weight/min limit — we use weight 2 per call
const BINANCE_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

async function fetchBinance(): Promise<Record<string, number>> {
  try {
    const encoded = encodeURIComponent(JSON.stringify(BINANCE_SYMBOLS));
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${encoded}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return {};
    const data: { symbol: string; price: string }[] = await res.json();
    const out: Record<string, number> = {};
    for (const item of data) {
      if (item.symbol === 'BTCUSDT') out['BTC/USD'] = parseFloat(item.price);
      if (item.symbol === 'ETHUSDT') out['ETH/USD'] = parseFloat(item.price);
    }
    return out;
  } catch {
    return {};
  }
}

// ─── Source 2: Twelve Data (everything else) ─────────────────
// 7 symbols × 1 credit = 7 credits per call.
// We poll every 15s → 4 calls/min → 28 credits/min (safe on basic plan)
const TD_SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'QQQ', 'DIA', 'USO', 'SPY'];

function getTwelveKey() {
  return process.env.TWELVE_DATA_API_KEY || '';
}

async function fetchTwelveData(): Promise<Record<string, number>> {
  const key = getTwelveKey();
  if (!key) return {};
  try {
    const url = `https://api.twelvedata.com/price?symbol=${TD_SYMBOLS.join(',')}&apikey=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    const out: Record<string, number> = {};
    for (const sym of TD_SYMBOLS) {
      const entry = data[sym];
      if (entry?.price) out[sym] = parseFloat(entry.price);
    }
    return out;
  } catch {
    return {};
  }
}

// ─── SSE Handler ─────────────────────────────────────────────
const BINANCE_POLL_MS  = 2_000;   // crypto updates every 2s
const TD_POLL_MS       = 15_000;  // rest updates every 15s

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (payload: Record<string, number>) => {
        if (closed || Object.keys(payload).length === 0) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // ── Initial tick — fetch both sources in parallel ──
      const [binanceInit, tdInit] = await Promise.all([fetchBinance(), fetchTwelveData()]);
      send({ ...tdInit, ...binanceInit });

      // ── Crypto: fast polling via Binance ──
      const binanceTimer = setInterval(async () => {
        if (closed) { clearInterval(binanceTimer); return; }
        send(await fetchBinance());
      }, BINANCE_POLL_MS);

      // ── Forex/Metals/ETFs: slower polling via Twelve Data ──
      const tdTimer = setInterval(async () => {
        if (closed) { clearInterval(tdTimer); return; }
        send(await fetchTwelveData());
      }, TD_POLL_MS);

      // Auto-close before Vercel's 4.5-min function limit
      setTimeout(() => {
        closed = true;
        clearInterval(binanceTimer);
        clearInterval(tdTimer);
        try { controller.close(); } catch {}
      }, 270_000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
