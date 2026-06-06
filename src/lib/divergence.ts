/**
 * B3: RSI/MACD Divergence Detection
 * Detects bullish and bearish divergences between price and oscillators.
 * Bullish divergence: price makes lower low, RSI/MACD makes higher low → reversal up
 * Bearish divergence: price makes higher high, RSI/MACD makes lower high → reversal down
 */

export type DivergenceType = 'bullish' | 'bearish' | 'none';

export interface DivergenceResult {
  rsiDivergence: DivergenceType;
  macdDivergence: DivergenceType;
  combined: DivergenceType;
  detail: string;
  strength: number; // 0-100, higher = stronger divergence signal
}

interface PivotPoint {
  index: number;
  price: number;
  value: number; // RSI or MACD value at that point
}

// ── Pivot Detection (swing highs/lows) ──────────────────
function findSwingLows(data: number[], lookback: number = 3): number[] {
  const lows: number[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i] >= data[i - j] || data[i] >= data[i + j]) {
        isLow = false;
        break;
      }
    }
    if (isLow) lows.push(i);
  }
  return lows;
}

function findSwingHighs(data: number[], lookback: number = 3): number[] {
  const highs: number[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i] <= data[i - j] || data[i] <= data[i + j]) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) highs.push(i);
  }
  return highs;
}

// ── Core Divergence Check ───────────────────────────────
function checkBullishDivergence(
  closes: number[],
  indicator: number[],
  lookback: number = 3,
  maxBars: number = 30
): { found: boolean; strength: number } {
  const recentCloses = closes.slice(-maxBars);
  const recentInd = indicator.slice(-maxBars);

  const priceLows = findSwingLows(recentCloses, lookback);
  const indLows = findSwingLows(recentInd, lookback);

  if (priceLows.length < 2 || indLows.length < 2) return { found: false, strength: 0 };

  // Compare last two swing lows
  const pl1 = priceLows[priceLows.length - 2];
  const pl2 = priceLows[priceLows.length - 1];

  // Find corresponding indicator lows (closest index)
  const il1 = indLows.reduce((prev, curr) => Math.abs(curr - pl1) < Math.abs(prev - pl1) ? curr : prev);
  const il2 = indLows.reduce((prev, curr) => Math.abs(curr - pl2) < Math.abs(prev - pl2) ? curr : prev);

  // Bullish: Price lower low + indicator higher low
  if (recentCloses[pl2] < recentCloses[pl1] && recentInd[il2] > recentInd[il1]) {
    const priceChange = Math.abs((recentCloses[pl2] - recentCloses[pl1]) / recentCloses[pl1]);
    const indChange = Math.abs((recentInd[il2] - recentInd[il1]) / (recentInd[il1] || 1));
    const strength = Math.min(100, Math.round((priceChange + indChange) * 500));
    return { found: true, strength: Math.max(30, strength) };
  }

  return { found: false, strength: 0 };
}

function checkBearishDivergence(
  closes: number[],
  indicator: number[],
  lookback: number = 3,
  maxBars: number = 30
): { found: boolean; strength: number } {
  const recentCloses = closes.slice(-maxBars);
  const recentInd = indicator.slice(-maxBars);

  const priceHighs = findSwingHighs(recentCloses, lookback);
  const indHighs = findSwingHighs(recentInd, lookback);

  if (priceHighs.length < 2 || indHighs.length < 2) return { found: false, strength: 0 };

  const ph1 = priceHighs[priceHighs.length - 2];
  const ph2 = priceHighs[priceHighs.length - 1];

  const ih1 = indHighs.reduce((prev, curr) => Math.abs(curr - ph1) < Math.abs(prev - ph1) ? curr : prev);
  const ih2 = indHighs.reduce((prev, curr) => Math.abs(curr - ph2) < Math.abs(prev - ph2) ? curr : prev);

  // Bearish: Price higher high + indicator lower high
  if (recentCloses[ph2] > recentCloses[ph1] && recentInd[ih2] < recentInd[ih1]) {
    const priceChange = Math.abs((recentCloses[ph2] - recentCloses[ph1]) / recentCloses[ph1]);
    const indChange = Math.abs((recentInd[ih2] - recentInd[ih1]) / (recentInd[ih1] || 1));
    const strength = Math.min(100, Math.round((priceChange + indChange) * 500));
    return { found: true, strength: Math.max(30, strength) };
  }

  return { found: false, strength: 0 };
}

// ── Compute RSI Series from Candles ─────────────────────
function computeRSISeries(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return [];

  const rsiValues: number[] = new Array(period).fill(0);
  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiValues.push(100 - (100 / (1 + rs)));

  // Smoothed RSI
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rsCurr = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rsCurr)));
  }

  return rsiValues;
}

// ── Compute MACD Histogram Series ───────────────────────
function computeMACDSeries(closes: number[], fast: number = 12, slow: number = 26, signal: number = 9): number[] {
  if (closes.length < slow + signal) return [];

  function ema(data: number[], period: number): number[] {
    const result: number[] = [];
    const mult = 2 / (period + 1);
    result.push(data.slice(0, period).reduce((s, v) => s + v, 0) / period);
    for (let i = period; i < data.length; i++) {
      result.push((data[i] - result[result.length - 1]) * mult + result[result.length - 1]);
    }
    return result;
  }

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  // Align arrays (emaSlow starts later)
  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }

  const signalLine = ema(macdLine, signal);
  const sigOffset = signal - 1;

  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + sigOffset] - signalLine[i]);
  }

  // Pad to match closes length
  const padLength = closes.length - histogram.length;
  return new Array(Math.max(0, padLength)).fill(0).concat(histogram);
}

// ── Main Public API ─────────────────────────────────────
export function detectDivergence(
  candles: { close: number }[]
): DivergenceResult {
  const closes = candles.map(c => c.close);

  if (closes.length < 50) {
    return { rsiDivergence: 'none', macdDivergence: 'none', combined: 'none', detail: 'Insufficient data', strength: 0 };
  }

  // Compute indicator series
  const rsiSeries = computeRSISeries(closes);
  const macdHist = computeMACDSeries(closes);

  // Check RSI divergence
  let rsiDivergence: DivergenceType = 'none';
  let rsiStrength = 0;

  const rsiBullish = checkBullishDivergence(closes, rsiSeries);
  const rsiBearish = checkBearishDivergence(closes, rsiSeries);

  if (rsiBullish.found) { rsiDivergence = 'bullish'; rsiStrength = rsiBullish.strength; }
  else if (rsiBearish.found) { rsiDivergence = 'bearish'; rsiStrength = rsiBearish.strength; }

  // Check MACD divergence
  let macdDivergence: DivergenceType = 'none';
  let macdStrength = 0;

  if (macdHist.length >= 30) {
    const macdBullish = checkBullishDivergence(closes, macdHist);
    const macdBearish = checkBearishDivergence(closes, macdHist);

    if (macdBullish.found) { macdDivergence = 'bullish'; macdStrength = macdBullish.strength; }
    else if (macdBearish.found) { macdDivergence = 'bearish'; macdStrength = macdBearish.strength; }
  }

  // Combined assessment
  let combined: DivergenceType = 'none';
  let strength = 0;
  const details: string[] = [];

  if (rsiDivergence !== 'none') {
    details.push(`RSI ${rsiDivergence} div (${rsiStrength}%)`);
    combined = rsiDivergence;
    strength = rsiStrength;
  }
  if (macdDivergence !== 'none') {
    details.push(`MACD ${macdDivergence} div (${macdStrength}%)`);
    if (combined === 'none') {
      combined = macdDivergence;
      strength = macdStrength;
    } else if (combined === macdDivergence) {
      // Double divergence — very strong signal
      strength = Math.min(100, Math.round((rsiStrength + macdStrength) * 0.75));
    } else {
      // Conflicting divergences cancel out
      combined = 'none';
      strength = 0;
      details.push('(conflicting — cancelled)');
    }
  }

  if (details.length === 0) details.push('No divergence detected');

  return {
    rsiDivergence,
    macdDivergence,
    combined,
    detail: details.join(' | '),
    strength,
  };
}
