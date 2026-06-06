/**
 * C1: VWAP (Volume Weighted Average Price)
 * Computed from existing 1H candle data — zero API cost.
 *
 * VWAP = Σ(Typical Price × Volume) / Σ(Volume)
 * Typical Price = (High + Low + Close) / 3
 *
 * Also computes:
 *  - VWAP bands (±1σ, ±2σ) for dynamic S/R
 *  - Session VWAP (reset at midnight UTC)
 */

export interface VWAPResult {
  vwap: number;
  upperBand1: number; // VWAP + 1σ
  lowerBand1: number; // VWAP - 1σ
  upperBand2: number; // VWAP + 2σ
  lowerBand2: number; // VWAP - 2σ
  priceRelation: 'above' | 'below' | 'at'; // price vs VWAP
  deviation: number; // % deviation from VWAP
  signal: 'bullish' | 'bearish' | 'neutral';
  detail: string;
  weight: number; // confluence contribution weight
}

export interface CandleWithVolume {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function computeVWAP(
  candles: CandleWithVolume[],
  currentPrice: number
): VWAPResult {
  if (candles.length < 10) {
    return {
      vwap: currentPrice,
      upperBand1: currentPrice * 1.001,
      lowerBand1: currentPrice * 0.999,
      upperBand2: currentPrice * 1.002,
      lowerBand2: currentPrice * 0.998,
      priceRelation: 'at',
      deviation: 0,
      signal: 'neutral',
      detail: 'Insufficient candle data for VWAP',
      weight: 15,
    };
  }

  // Use last 48 candles (2 sessions of 24H each) for session VWAP
  const sessionCandles = candles.slice(-48);

  let sumPV = 0;
  let sumV = 0;
  const typicalPrices: number[] = [];

  for (const c of sessionCandles) {
    const tp = (c.high + c.low + c.close) / 3;
    // If no volume data, use ATR-normalized proxy (high - low range)
    const vol = c.volume ?? (c.high - c.low);
    sumPV += tp * vol;
    sumV += vol;
    typicalPrices.push(tp);
  }

  const vwap = sumV > 0 ? sumPV / sumV : currentPrice;

  // Standard deviation bands
  let sumSqDev = 0;
  for (let i = 0; i < sessionCandles.length; i++) {
    const c = sessionCandles[i];
    const vol = c.volume ?? (c.high - c.low);
    const tp = typicalPrices[i];
    sumSqDev += vol * Math.pow(tp - vwap, 2);
  }
  const stdDev = sumV > 0 ? Math.sqrt(sumSqDev / sumV) : vwap * 0.001;

  const upperBand1 = vwap + stdDev;
  const lowerBand1 = vwap - stdDev;
  const upperBand2 = vwap + 2 * stdDev;
  const lowerBand2 = vwap - 2 * stdDev;

  const deviation = ((currentPrice - vwap) / vwap) * 100;
  const absPct = Math.abs(deviation);

  let priceRelation: 'above' | 'below' | 'at';
  let signal: 'bullish' | 'bearish' | 'neutral';
  let detail: string;

  if (deviation > 0.1) {
    priceRelation = 'above';
    if (currentPrice >= upperBand2) {
      signal = 'bearish';
      detail = `Price ${absPct.toFixed(2)}% above VWAP — at +2σ band, overbought vs VWAP`;
    } else if (currentPrice >= upperBand1) {
      signal = 'bearish';
      detail = `Price ${absPct.toFixed(2)}% above VWAP — at +1σ band, extended`;
    } else {
      signal = 'bullish';
      detail = `Price ${absPct.toFixed(2)}% above VWAP (${vwap.toFixed(2)}) — institutional bullish bias`;
    }
  } else if (deviation < -0.1) {
    priceRelation = 'below';
    if (currentPrice <= lowerBand2) {
      signal = 'bullish';
      detail = `Price ${absPct.toFixed(2)}% below VWAP — at -2σ band, oversold vs VWAP`;
    } else if (currentPrice <= lowerBand1) {
      signal = 'bullish';
      detail = `Price ${absPct.toFixed(2)}% below VWAP — at -1σ band, potential bounce`;
    } else {
      signal = 'bearish';
      detail = `Price ${absPct.toFixed(2)}% below VWAP (${vwap.toFixed(2)}) — institutional bearish bias`;
    }
  } else {
    priceRelation = 'at';
    signal = 'neutral';
    detail = `Price hugging VWAP (${vwap.toFixed(2)}) — equilibrium zone`;
  }

  return {
    vwap,
    upperBand1,
    lowerBand1,
    upperBand2,
    lowerBand2,
    priceRelation,
    deviation,
    signal,
    detail,
    weight: 15,
  };
}
