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

export function getYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (YAHOO_SYMBOL_MAP[upper]) return YAHOO_SYMBOL_MAP[upper];
  if (YAHOO_SYMBOL_MAP[symbol]) return YAHOO_SYMBOL_MAP[symbol];
  
  if (upper.includes('/')) {
    const parts = upper.split('/');
    if (parts.length === 2) {
      const [base, quote] = parts;
      const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'LTC', 'LINK'];
      if (cryptos.includes(base) || (upper.endsWith('/USD') && (base.length > 4 || base === 'BTC' || base === 'ETH'))) {
        return `${base}-${quote}`;
      }
      return `${base}${quote}=X`;
    }
  }
  
  return upper;
}

/**
 * Fetch current prices for an array of TradeGPT symbols from Yahoo Finance.
 * Returns a map of symbol → price. Missing symbols are omitted.
 */
export async function fetchYahooPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const symbolMap: Record<string, string> = {};
  const yahooSymbols = symbols
    .map(s => {
      const ySym = YAHOO_SYMBOL_MAP[s] || YAHOO_SYMBOL_MAP[s.toUpperCase()] || getYahooSymbol(s);
      if (ySym) {
        symbolMap[ySym] = s;
      }
      return ySym;
    })
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });

    if (!res.ok) {
      recordApiCall('yahoo_finance', false, Date.now() - t0, `HTTP ${res.status}`);
      return {};
    }

    const data = await res.json();
    const out: Record<string, number> = {};

    // Format 1: Direct key-mapped response (e.g. { "QQQ": { "close": [...] } })
    if (data && typeof data === 'object' && !('spark' in data)) {
      for (const [yahooSym, entry] of Object.entries(data)) {
        if (entry && typeof entry === 'object') {
          const closes = (entry as any).close || [];
          const price = closes.filter((v: any) => v != null).pop();
          if (price != null) {
            const tradeSymbol = symbolMap[yahooSym];
            if (tradeSymbol) out[tradeSymbol] = price;
          }
        }
      }
    } else {
      // Format 2: Array under spark.result
      const spark = data?.spark?.result ?? [];
      for (const item of spark) {
        const yahooSym: string = item.symbol;
        const closes: number[] | undefined = item.response?.[0]?.indicators?.quote?.[0]?.close;
        const price = closes?.filter((v: number | null) => v != null).pop();
        if (price == null) continue;

        const tradeSymbol = symbolMap[yahooSym];
        if (tradeSymbol) out[tradeSymbol] = price;
      }
    }

    recordApiCall('yahoo_finance', true, Date.now() - t0);
    return out;
  } catch (err: any) {
    recordApiCall('yahoo_finance', false, Date.now() - t0, err?.message);
    return {};
  }
}

/**
 * Fetch historical candles from Yahoo Finance as a robust fallback for Twelve Data
 */
export async function fetchYahooCandles(
  symbol: string,
  interval: string = '1h',
  outputsize: number = 50
): Promise<{ time: string; open: number; high: number; low: number; close: number }[]> {
  const yahooSym = YAHOO_SYMBOL_MAP[symbol] || YAHOO_SYMBOL_MAP[symbol.toLowerCase()] || getYahooSymbol(symbol);
  if (!yahooSym) return [];

  let yfInterval = '1h';
  let yfRange = '5d';

  if (interval === '1m') {
    yfInterval = '1m';
    yfRange = '1d';
  } else if (interval === '5m') {
    yfInterval = '5m';
    yfRange = '2d';
  } else if (interval === '15m') {
    yfInterval = '15m';
    yfRange = '3d';
  } else if (interval === '30m') {
    yfInterval = '30m';
    yfRange = '5d';
  } else if (interval === '1h') {
    yfInterval = '1h';
    yfRange = outputsize > 100 ? '15d' : '7d';
  } else if (interval === '4h') {
    yfInterval = '1h'; // Fallback to 1h since YF does not support 4h directly
    yfRange = outputsize > 100 ? '30d' : '15d';
  } else if (interval === '1d') {
    yfInterval = '1d';
    yfRange = outputsize > 100 ? '1y' : '6mo';
  } else if (interval === '1wk') {
    yfInterval = '1wk';
    yfRange = '2y';
  }

  const t0 = Date.now();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${yfInterval}&range=${yfRange}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });

    if (!res.ok) {
      recordApiCall('yahoo_finance', false, Date.now() - t0, `Candles HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] != null &&
        highs[i] != null &&
        lows[i] != null &&
        closes[i] != null
      ) {
        const date = new Date(timestamps[i] * 1000);
        const datetimeStr = date.toISOString().replace('T', ' ').slice(0, 19);
        candles.push({
          time: datetimeStr,
          open: Number(opens[i]),
          high: Number(highs[i]),
          low: Number(lows[i]),
          close: Number(closes[i]),
        });
      }
    }

    const sliced = candles.slice(-outputsize);
    recordApiCall('yahoo_finance', true, Date.now() - t0);
    return sliced;
  } catch (err: any) {
    recordApiCall('yahoo_finance', false, Date.now() - t0, err?.message);
    return [];
  }
}

/**
 * Fetch a single symbol's current price from Yahoo Finance.
 * Uses the /v8/finance/chart endpoint for a single ticker.
 */
export async function fetchYahooPrice(symbol: string): Promise<number | null> {
  const yahooSym = YAHOO_SYMBOL_MAP[symbol] || YAHOO_SYMBOL_MAP[symbol.toLowerCase()] || getYahooSymbol(symbol);
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
