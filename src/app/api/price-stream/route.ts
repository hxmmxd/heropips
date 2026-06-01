import { getPlatformConfig } from '@/lib/platformConfig';
import { recordApiCall, markDisabled } from '@/lib/apiStats';
import { fetchYahooPrices } from '@/lib/yahooFinance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Source 1: Binance (BTC, ETH) ───────────────────────────
// Free, no API key, ~1200 weight/min limit — we use weight 2 per call
const BINANCE_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

async function fetchBinance(): Promise<Record<string, number>> {
  const t0 = Date.now();
  try {
    const encoded = encodeURIComponent(JSON.stringify(BINANCE_SYMBOLS));
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${encoded}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      recordApiCall('binance', false, Date.now() - t0, `HTTP ${res.status}`);
      return {};
    }
    const data: { symbol: string; price: string }[] = await res.json();
    const out: Record<string, number> = {};
    for (const item of data) {
      if (item.symbol === 'BTCUSDT') out['BTC/USD'] = parseFloat(item.price);
      if (item.symbol === 'ETHUSDT') out['ETH/USD'] = parseFloat(item.price);
    }
    recordApiCall('binance', true, Date.now() - t0);
    return out;
  } catch (err: any) {
    recordApiCall('binance', false, Date.now() - t0, err?.message);
    return {};
  }
}

// ─── Source 2: Twelve Data (everything else) ─────────────────
// 7 symbols × 1 credit = 7 credits per call.
// Grow plan: 55 credits/min → poll every 8s = 7.5 calls/min = 52.5 credits/min ✓
const TD_SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'QQQ', 'DIA', 'USO', 'SPY'];

async function getTwelveKey() {
  return getPlatformConfig('twelve_data_api_key', 'TWELVE_DATA_API_KEY');
}

async function fetchTwelveData(): Promise<Record<string, number>> {
  const key = await getTwelveKey();
  if (!key) return {};
  const t0 = Date.now();
  try {
    const url = `https://api.twelvedata.com/price?symbol=${TD_SYMBOLS.join(',')}&apikey=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      recordApiCall('twelve_data', false, Date.now() - t0, `HTTP ${res.status}`);
      return {};
    }
    const data = await res.json();
    const out: Record<string, number> = {};
    for (const sym of TD_SYMBOLS) {
      const entry = data[sym];
      if (entry?.price) out[sym] = parseFloat(entry.price);
    }
    recordApiCall('twelve_data', true, Date.now() - t0);
    return out;
  } catch (err: any) {
    recordApiCall('twelve_data', false, Date.now() - t0, err?.message);
    return {};
  }
}

// ─── Source 3: Yahoo Finance (optional fallback) ─────────────
// Free, no key. Enabled via platform_config key 'yahoo_finance_enabled'.
// Used as fallback when Twelve Data returns empty results.
const YF_SYMBOLS = [...TD_SYMBOLS]; // same set

async function isYahooEnabled(): Promise<boolean> {
  const val = await getPlatformConfig('yahoo_finance_enabled', '');
  return val !== 'false';
}

async function fetchYahooFallback(
  existingPrices: Record<string, number>
): Promise<Record<string, number>> {
  // Only fetch symbols that Twelve Data didn't return
  const missing = YF_SYMBOLS.filter(s => !(s in existingPrices));
  if (missing.length === 0) return {};
  const yfPrices = await fetchYahooPrices(missing);
  return yfPrices;
}

// ─── SSE Handler ─────────────────────────────────────────────
const BINANCE_POLL_MS = 2_000;   // crypto — Binance, free, unlimited
const TD_POLL_MS = 8_000;        // 7 symbols × 7.5 calls/min = 52.5 credits/min (Grow plan: 55/min ✓)

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

      // ── Fetch Twelve Data + Yahoo Finance fallback ──
      const fetchTdWithFallback = async () => {
        const tdPrices = await fetchTwelveData();
        const yahooEnabled = await isYahooEnabled();
        if (yahooEnabled) {
          // Fill missing symbols from Yahoo Finance
          const yfPrices = await fetchYahooFallback(tdPrices);
          return { ...yfPrices, ...tdPrices }; // TD wins on overlap
        }
        if (!yahooEnabled) markDisabled('yahoo_finance');
        return tdPrices;
      };

      // ── Initial tick — fetch all sources in parallel ──
      const [binanceInit, tdInit] = await Promise.all([
        fetchBinance(),
        fetchTdWithFallback(),
      ]);
      send({ ...tdInit, ...binanceInit });

      // ── Crypto: fast polling via Binance ──
      const binanceTimer = setInterval(async () => {
        if (closed) { clearInterval(binanceTimer); return; }
        send(await fetchBinance());
      }, BINANCE_POLL_MS);

      // ── Forex/Metals/ETFs: Twelve Data + Yahoo fallback ──
      const tdTimer = setInterval(async () => {
        if (closed) { clearInterval(tdTimer); return; }
        send(await fetchTdWithFallback());
      }, TD_POLL_MS);

      // Auto-close before Vercel's 4.5-min function limit
      setTimeout(() => {
        closed = true;
        clearInterval(binanceTimer);
        clearInterval(tdTimer);
        try { controller.close(); } catch { }
      }, 270_000);
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
