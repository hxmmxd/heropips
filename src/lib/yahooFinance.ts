/**
 * yahooFinance.ts
 * Lightweight Yahoo Finance price fetcher using the public v8 quote endpoint.
 * No API key required. Unofficial endpoint — soft rate-limited.
 *
 * Symbol mapping:
 *   XAU/USD  → GC=F   (Gold futures)
 *   EUR/USD  → EURUSD=X
 *   GBP/USD  → GBPUSD=X
 *   BTC/USD  → BTC-USD
 *   ETH/USD  → ETH-USD
 *   QQQ      → QQQ
 *   SPY      → SPY
 *   DIA      → DIA
 *   USO      → USO
 */

import { recordApiCall } from './apiStats';

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  'XAU/USD': 'GC=F',
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
  'QQQ':     'QQQ',
  'SPY':     'SPY',
  'DIA':     'DIA',
  'USO':     'USO',
};

/**
 * Fetch current prices for an array of TradeGPT symbols from Yahoo Finance.
 * Returns a map of symbol → price. Missing symbols are omitted.
 */
export async function fetchYahooPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const yahooSymbols = symbols
    .map(s => YAHOO_SYMBOL_MAP[s])
    .filter(Boolean);

  if (yahooSymbols.length === 0) return {};

  const t0 = Date.now();
  try {
    const joined = yahooSymbols.join(',');
    const url =
      `https://query1.finance.yahoo.com/v8/finance/spark` +
      `?symbols=${encodeURIComponent(joined)}&range=1d&interval=1d`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      recordApiCall('yahoo_finance', false, Date.now() - t0, `HTTP ${res.status}`);
      return {};
    }

    const data = await res.json();
    const spark = data?.spark?.result ?? [];
    const out: Record<string, number> = {};

    for (const item of spark) {
      const yahooSym: string = item.symbol;
      const closes: number[] | undefined = item.response?.[0]?.indicators?.quote?.[0]?.close;
      const price = closes?.filter((v: number | null) => v != null).pop();
      if (price == null) continue;

      // Reverse-map yahoo symbol → TradeGPT symbol
      const tradeSymbol = Object.entries(YAHOO_SYMBOL_MAP).find(
        ([, v]) => v === yahooSym
      )?.[0];
      if (tradeSymbol) out[tradeSymbol] = price;
    }

    recordApiCall('yahoo_finance', true, Date.now() - t0);
    return out;
  } catch (err: any) {
    recordApiCall('yahoo_finance', false, Date.now() - t0, err?.message);
    return {};
  }
}

/**
 * Fetch a single symbol's current price from Yahoo Finance.
 * Uses the /v8/finance/chart endpoint for a single ticker.
 */
export async function fetchYahooPrice(symbol: string): Promise<number | null> {
  const yahooSym = YAHOO_SYMBOL_MAP[symbol];
  if (!yahooSym) return null;

  const t0 = Date.now();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      recordApiCall('yahoo_finance', false, Date.now() - t0, `HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;

    if (price == null) {
      recordApiCall('yahoo_finance', false, Date.now() - t0, 'No price in response');
      return null;
    }

    recordApiCall('yahoo_finance', true, Date.now() - t0);
    return price;
  } catch (err: any) {
    recordApiCall('yahoo_finance', false, Date.now() - t0, err?.message);
    return null;
  }
}
