/**
 * B4: Correlated Asset Checker
 * Checks if correlated/inverse assets confirm or conflict with the signal.
 * - Gold ↔ DXY (inverse)
 * - BTC ↔ ETH (positive)
 * - EUR/USD ↔ GBP/USD (positive — USD cluster)
 * - Indices cluster: QQQ ↔ SPY (positive)
 */

import { fetchYahooCandles } from './yahooFinance';

// ── Types ───────────────────────────────────────────────
export interface CorrelationResult {
  confirmed: boolean;
  pairs: CorrelationPair[];
  detail: string;
  score: number; // -100 (strong conflict) to +100 (strong confirm)
}

export interface CorrelationPair {
  symbol: string;
  displayName: string;
  relationship: 'inverse' | 'positive';
  theirMomentum: 'bullish' | 'bearish' | 'neutral';
  agrees: boolean;
  detail: string;
}

// ── Correlation Map ─────────────────────────────────────
// Each asset maps to its correlated pairs with relationship type
export const CORRELATION_MAP: Record<string, { symbol: string; display: string; type: 'inverse' | 'positive' }[]> = {
  'XAU/USD': [
    { symbol: 'DX-Y.NYB', display: 'DXY', type: 'inverse' },       // Yahoo symbol for Dollar Index
  ],
  'BTC/USD': [
    { symbol: 'ETH-USD', display: 'ETH', type: 'positive' },
  ],
  'ETH/USD': [
    { symbol: 'BTC-USD', display: 'BTC', type: 'positive' },
  ],
  'EUR/USD': [
    { symbol: 'GBPUSD=X', display: 'GBP/USD', type: 'positive' },   // USD cluster
  ],
  'GBP/USD': [
    { symbol: 'EURUSD=X', display: 'EUR/USD', type: 'positive' },
  ],
  'USD/JPY': [
    { symbol: 'DX-Y.NYB', display: 'DXY', type: 'positive' },      // JPY weakens when DXY strengthens
  ],
  'QQQ': [
    { symbol: 'SPY', display: 'SPY', type: 'positive' },
  ],
  'SPY': [
    { symbol: 'QQQ', display: 'QQQ', type: 'positive' },
  ],
  'DIA': [
    { symbol: 'SPY', display: 'SPY', type: 'positive' },
  ],
  'USO': [
    { symbol: 'DX-Y.NYB', display: 'DXY', type: 'inverse' },       // Oil weakens when USD strengthens
  ],
};

// ── Cache (5-min TTL) ───────────────────────────────────
const MOMENTUM_CACHE = new Map<string, { momentum: 'bullish' | 'bearish' | 'neutral'; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ── Compute Short-Term Momentum ─────────────────────────
async function getMomentum(yahooSymbol: string): Promise<'bullish' | 'bearish' | 'neutral'> {
  // Check cache
  const cached = MOMENTUM_CACHE.get(yahooSymbol);
  if (cached && Date.now() < cached.expiresAt) return cached.momentum;

  try {
    // Map Yahoo symbol to our candle fetcher format
    let fetchSymbol = yahooSymbol;
    // Our Yahoo candle fetcher handles these formats
    if (yahooSymbol === 'DX-Y.NYB') fetchSymbol = 'DX-Y.NYB';
    if (yahooSymbol === 'ETH-USD') fetchSymbol = 'ETH/USD';
    if (yahooSymbol === 'BTC-USD') fetchSymbol = 'BTC/USD';
    if (yahooSymbol === 'EURUSD=X') fetchSymbol = 'EUR/USD';
    if (yahooSymbol === 'GBPUSD=X') fetchSymbol = 'GBP/USD';

    const candles = await fetchYahooCandles(fetchSymbol, '1h', 20);
    if (candles.length < 5) return 'neutral';

    // Simple momentum: compare last close to 5-period SMA
    const recent = candles.slice(-5);
    const sma5 = recent.reduce((s, c) => s + c.close, 0) / recent.length;
    const lastClose = candles[candles.length - 1].close;
    const prevClose = candles[candles.length - 5].close;

    // Also check the trend direction (are closes trending up or down?)
    const changePercent = ((lastClose - prevClose) / prevClose) * 100;

    let momentum: 'bullish' | 'bearish' | 'neutral';
    if (lastClose > sma5 && changePercent > 0.05) momentum = 'bullish';
    else if (lastClose < sma5 && changePercent < -0.05) momentum = 'bearish';
    else momentum = 'neutral';

    // Cache
    MOMENTUM_CACHE.set(yahooSymbol, { momentum, expiresAt: Date.now() + CACHE_TTL });
    return momentum;
  } catch (err) {
    console.warn(`[Correlation] Failed to get momentum for ${yahooSymbol}:`, err);
    return 'neutral';
  }
}

export async function checkCorrelation(
  symbol: string,
  signalDirection: 'BUY' | 'SELL' | 'NEUTRAL',
  preFetchedCandles?: Record<string, any[]>
): Promise<CorrelationResult> {
  const correlatedPairs = CORRELATION_MAP[symbol];

  if (!correlatedPairs || correlatedPairs.length === 0 || signalDirection === 'NEUTRAL') {
    return {
      confirmed: true,
      pairs: [],
      detail: 'No correlated assets to check',
      score: 0,
    };
  }

  const pairs: CorrelationPair[] = [];
  let agreeCount = 0;
  let totalChecked = 0;

  for (const pair of correlatedPairs) {
    try {
      let momentum: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      
      const pCandles = preFetchedCandles?.[pair.symbol];
      if (pCandles && pCandles.length >= 5) {
        const recent = pCandles.slice(-5);
        const sma5 = recent.reduce((s: number, c: any) => s + c.close, 0) / recent.length;
        const lastClose = pCandles[pCandles.length - 1].close;
        const prevClose = pCandles[pCandles.length - 5].close;
        const changePercent = ((lastClose - prevClose) / prevClose) * 100;
        if (lastClose > sma5 && changePercent > 0.05) momentum = 'bullish';
        else if (lastClose < sma5 && changePercent < -0.05) momentum = 'bearish';
      } else {
        momentum = await getMomentum(pair.symbol);
      }
      totalChecked++;

      // Determine if the correlated asset agrees
      let agrees = false;
      if (pair.type === 'positive') {
        // Positive correlation: both should move same direction
        agrees = (signalDirection === 'BUY' && momentum === 'bullish') ||
                 (signalDirection === 'SELL' && momentum === 'bearish') ||
                 momentum === 'neutral'; // neutral doesn't conflict
      } else {
        // Inverse correlation: should move opposite direction
        agrees = (signalDirection === 'BUY' && momentum === 'bearish') ||
                 (signalDirection === 'SELL' && momentum === 'bullish') ||
                 momentum === 'neutral';
      }

      if (agrees) agreeCount++;

      const arrow = momentum === 'bullish' ? '↑' : momentum === 'bearish' ? '↓' : '→';
      const relation = pair.type === 'inverse' ? 'inv' : 'pos';

      pairs.push({
        symbol: pair.symbol,
        displayName: pair.display,
        relationship: pair.type,
        theirMomentum: momentum,
        agrees,
        detail: `${pair.display} ${arrow} ${momentum} (${relation}) → ${agrees ? '✓ confirms' : '✗ conflicts'}`,
      });
    } catch (err) {
      console.warn(`[Correlation] Error checking ${pair.display}:`, err);
    }
  }

  const confirmed = totalChecked === 0 || agreeCount >= Math.ceil(totalChecked / 2);
  const score = totalChecked > 0
    ? Math.round(((agreeCount / totalChecked) * 2 - 1) * 100) // -100 to +100
    : 0;

  const detail = pairs.length > 0
    ? pairs.map(p => p.detail).join(' | ')
    : 'No correlation data';

  console.log(`[Correlation] ${symbol} ${signalDirection}: ${agreeCount}/${totalChecked} correlated assets agree (score: ${score})`);

  return { confirmed, pairs, detail, score };
}
