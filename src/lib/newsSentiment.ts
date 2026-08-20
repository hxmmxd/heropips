/**
 * B1: News Sentiment Scoring Engine
 * Uses Finnhub API for financial news + keyword-based sentiment analysis.
 * Falls back to free RSS/Yahoo if no Finnhub key.
 */

import { getPlatformConfig } from './platformConfig';

// ── Sentiment Cache (10-min TTL) ────────────────────────
const SENTIMENT_CACHE = new Map<string, { result: SentimentResult; expiresAt: number }>();
const SENTIMENT_TTL = 10 * 60 * 1000;

export interface SentimentResult {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;       // -100 to +100
  headlines: number;   // how many headlines analyzed
  source: string;      // 'finnhub' | 'yahoo' | 'fallback'
}

// Finnhub symbol mapping (they use different tickers)
const FINNHUB_SYMBOL_MAP: Record<string, string> = {
  'XAU/USD': 'OANDA:XAU_USD',
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  'EUR/USD': 'OANDA:EUR_USD',
  'GBP/USD': 'OANDA:GBP_USD',
  'USD/JPY': 'OANDA:USD_JPY',
  'QQQ': 'QQQ',
  'DIA': 'DIA',
  'SPY': 'SPY',
  'USO': 'USO',
};

// General keyword search terms for Yahoo News fallback
const YAHOO_SEARCH_MAP: Record<string, string> = {
  'XAU/USD': 'gold+price',
  'BTC/USD': 'bitcoin+price',
  'ETH/USD': 'ethereum+price',
  'EUR/USD': 'eurusd+forex',
  'GBP/USD': 'gbpusd+forex',
  'USD/JPY': 'usdjpy+forex',
  'QQQ': 'nasdaq+stock+market',
  'DIA': 'dow+jones+stock',
  'SPY': 'sp500+stock+market',
  'USO': 'crude+oil+price',
};

// ── Bullish / Bearish Keyword Dictionaries ──────────────
const BULLISH_WORDS = [
  'surge', 'rally', 'bullish', 'soar', 'jump', 'gain', 'rise', 'climb',
  'breakout', 'all-time high', 'ath', 'outperform', 'upgrade', 'beat',
  'strong', 'boom', 'recovery', 'upside', 'positive', 'optimistic',
  'buy', 'long', 'accumulate', 'support', 'demand', 'momentum',
  'higher', 'record', 'boost', 'advance', 'expand', 'growth',
  'dovish', 'rate cut', 'stimulus', 'easing', 'inflow',
];

const BEARISH_WORDS = [
  'crash', 'plunge', 'bearish', 'drop', 'fall', 'decline', 'slump',
  'breakdown', 'sell-off', 'selloff', 'downgrade', 'miss', 'weak',
  'recession', 'fear', 'panic', 'risk-off', 'negative', 'pessimistic',
  'sell', 'short', 'dump', 'resistance', 'overhead', 'correction',
  'lower', 'loss', 'collapse', 'contraction', 'shrink', 'deflation',
  'hawkish', 'rate hike', 'tightening', 'tapering', 'outflow',
];

function scoreSentiment(headlines: string[]): { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; score: number } {
  if (headlines.length === 0) return { sentiment: 'NEUTRAL', score: 0 };

  let bullCount = 0;
  let bearCount = 0;

  for (const headline of headlines) {
    const lower = headline.toLowerCase();
    for (const word of BULLISH_WORDS) {
      if (lower.includes(word)) { bullCount++; break; }
    }
    for (const word of BEARISH_WORDS) {
      if (lower.includes(word)) { bearCount++; break; }
    }
  }

  const total = bullCount + bearCount || 1;
  const rawScore = ((bullCount - bearCount) / total) * 100;
  const score = Math.round(Math.max(-100, Math.min(100, rawScore)));

  if (score >= 20) return { sentiment: 'BULLISH', score };
  if (score <= -20) return { sentiment: 'BEARISH', score };
  return { sentiment: 'NEUTRAL', score };
}

// ── Finnhub Fetcher ─────────────────────────────────────
async function fetchFinnhubSentiment(symbol: string): Promise<SentimentResult | null> {
  try {
    const apiKey = await getPlatformConfig('finnhub_api_key', 'FINNHUB_API_KEY');
    if (!apiKey) return null;

    const finnSymbol = FINNHUB_SYMBOL_MAP[symbol] || symbol;
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;

    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(finnSymbol)}&from=${new Date(dayAgo * 1000).toISOString().split('T')[0]}&to=${new Date(now * 1000).toISOString().split('T')[0]}&token=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const headlines = data.slice(0, 20).map((n: any) => `${n.headline} ${n.summary || ''}`);
    const { sentiment, score } = scoreSentiment(headlines);

    return { sentiment, score, headlines: headlines.length, source: 'finnhub' };
  } catch (err) {
    console.warn('[Sentiment] Finnhub fetch failed:', err);
    return null;
  }
}

// ── Yahoo Finance News Fallback ─────────────────────────
async function fetchYahooSentiment(symbol: string): Promise<SentimentResult | null> {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const query = YAHOO_SEARCH_MAP[symbol] || symbol.replace('/', '+');
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${query}&region=US&lang=en-US`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const text = await res.text();
    // Extract titles from RSS XML
    const titleMatches = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
    const headlines = titleMatches
      .map(m => m.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, ''))
      .slice(0, 15);

    if (headlines.length === 0) return null;

    const { sentiment, score } = scoreSentiment(headlines);
    return { sentiment, score, headlines: headlines.length, source: 'yahoo' };
  } catch (err) {
    console.warn('[Sentiment] Yahoo RSS fallback failed:', err);
    return null;
  }
}

// ── Public API ──────────────────────────────────────────
export async function getNewsSentiment(symbol: string): Promise<SentimentResult> {
  // Check cache
  const cached = SENTIMENT_CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  // Try Finnhub first, then Yahoo fallback
  let result = await fetchFinnhubSentiment(symbol);
  if (!result) {
    result = await fetchYahooSentiment(symbol);
  }
  if (!result) {
    result = { sentiment: 'NEUTRAL', score: 0, headlines: 0, source: 'fallback' };
  }

  console.log(`[Sentiment] ${symbol}: ${result.sentiment} (score: ${result.score}, ${result.headlines} headlines via ${result.source})`);

  // Cache result
  SENTIMENT_CACHE.set(symbol, { result, expiresAt: Date.now() + SENTIMENT_TTL });
  return result;
}
