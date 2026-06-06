/**
 * C3: Candlestick Pattern Recognition
 * Detects high-probability reversal / continuation patterns on raw OHLCV candles.
 *
 * Patterns detected:
 *  - Bullish/Bearish Engulfing (strongest reversal signal)
 *  - Pin Bar / Hammer / Shooting Star (wick rejection)
 *  - Doji (indecision — context dependent)
 *  - Morning/Evening Star (3-candle reversal)
 *  - Inside Bar (compression before breakout)
 *
 * Patterns are weighted by reliability at SMC zones (OB/FVG).
 */

export interface CandleOHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PatternResult {
  patterns: string[];          // detected pattern names
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;            // 0-100
  detail: string;
  weight: number;              // confluence score weight
}

function bodySize(c: CandleOHLC): number {
  return Math.abs(c.close - c.open);
}

function totalRange(c: CandleOHLC): number {
  return c.high - c.low;
}

function upperWick(c: CandleOHLC): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: CandleOHLC): number {
  return Math.min(c.open, c.close) - c.low;
}

function isBullish(c: CandleOHLC): boolean {
  return c.close > c.open;
}

function isBearish(c: CandleOHLC): boolean {
  return c.close < c.open;
}

export function detectCandlePatterns(candles: CandleOHLC[]): PatternResult {
  if (candles.length < 3) {
    return { patterns: [], signal: 'neutral', strength: 0, detail: 'Not enough candles', weight: 10 };
  }

  const patterns: string[] = [];
  let bullScore = 0;
  let bearScore = 0;

  const c0 = candles[candles.length - 1]; // current
  const c1 = candles[candles.length - 2]; // previous
  const c2 = candles[candles.length - 3]; // two bars ago

  const body0 = bodySize(c0);
  const range0 = totalRange(c0);
  const upper0 = upperWick(c0);
  const lower0 = lowerWick(c0);

  const body1 = bodySize(c1);
  const range1 = totalRange(c1);

  // ── 1. Bullish Engulfing ────────────────────────────────
  if (
    isBearish(c1) &&
    isBullish(c0) &&
    c0.close > c1.open &&
    c0.open < c1.close &&
    body0 > body1 * 1.1
  ) {
    patterns.push('Bullish Engulfing');
    bullScore += 35;
  }

  // ── 2. Bearish Engulfing ────────────────────────────────
  if (
    isBullish(c1) &&
    isBearish(c0) &&
    c0.close < c1.open &&
    c0.open > c1.close &&
    body0 > body1 * 1.1
  ) {
    patterns.push('Bearish Engulfing');
    bearScore += 35;
  }

  // ── 3. Bullish Pin Bar / Hammer ─────────────────────────
  // Long lower wick (≥2× body), small upper wick, body in upper 1/3
  if (
    lower0 >= body0 * 2 &&
    upper0 <= body0 * 0.5 &&
    range0 > 0 &&
    (c0.close - c0.low) / range0 >= 0.6
  ) {
    patterns.push(isBullish(c0) ? 'Hammer' : 'Bullish Pin Bar');
    bullScore += 30;
  }

  // ── 4. Bearish Pin Bar / Shooting Star ──────────────────
  // Long upper wick (≥2× body), small lower wick, body in lower 1/3
  if (
    upper0 >= body0 * 2 &&
    lower0 <= body0 * 0.5 &&
    range0 > 0 &&
    (c0.high - c0.close) / range0 >= 0.6
  ) {
    patterns.push(isBearish(c0) ? 'Shooting Star' : 'Bearish Pin Bar');
    bearScore += 30;
  }

  // ── 5. Doji (indecision) ────────────────────────────────
  if (body0 <= range0 * 0.1 && range0 > 0) {
    patterns.push('Doji');
    // Doji context: after bearish trend = bullish reversal potential
    if (isBearish(c1) && isBearish(c2)) bullScore += 15;
    else if (isBullish(c1) && isBullish(c2)) bearScore += 15;
  }

  // ── 6. Morning Star (3-candle bullish reversal) ─────────
  if (
    isBearish(c2) && bodySize(c2) > range0 * 0.5 && // strong bearish candle
    bodySize(c1) <= range1 * 0.3 &&                   // small star
    isBullish(c0) &&                                   // bullish confirmation
    c0.close > (c2.open + c2.close) / 2              // closes above midpoint of c2
  ) {
    patterns.push('Morning Star');
    bullScore += 40;
  }

  // ── 7. Evening Star (3-candle bearish reversal) ─────────
  if (
    isBullish(c2) && bodySize(c2) > range0 * 0.5 &&
    bodySize(c1) <= range1 * 0.3 &&
    isBearish(c0) &&
    c0.close < (c2.open + c2.close) / 2
  ) {
    patterns.push('Evening Star');
    bearScore += 40;
  }

  // ── 8. Inside Bar (compression) ─────────────────────────
  if (
    c0.high < c1.high &&
    c0.low > c1.low
  ) {
    patterns.push('Inside Bar');
    // Direction neutral — breakout signal
    // Slight bias toward prior trend
    if (isBullish(c1)) bullScore += 10;
    else bearScore += 10;
  }

  // ── 9. Three White Soldiers ─────────────────────────────
  if (
    isBullish(c0) && isBullish(c1) && isBullish(c2) &&
    c0.close > c1.close && c1.close > c2.close &&
    body0 > range0 * 0.5 && body1 > range1 * 0.5
  ) {
    patterns.push('Three White Soldiers');
    bullScore += 35;
  }

  // ── 10. Three Black Crows ───────────────────────────────
  if (
    isBearish(c0) && isBearish(c1) && isBearish(c2) &&
    c0.close < c1.close && c1.close < c2.close &&
    body0 > range0 * 0.5 && body1 > range1 * 0.5
  ) {
    patterns.push('Three Black Crows');
    bearScore += 35;
  }

  // ── Determine overall signal ────────────────────────────
  const totalScore = bullScore + bearScore;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let strength: number;

  if (bullScore > bearScore && bullScore > 0) {
    signal = 'bullish';
    strength = Math.min(100, Math.round((bullScore / Math.max(totalScore, 35)) * 100));
  } else if (bearScore > bullScore && bearScore > 0) {
    signal = 'bearish';
    strength = Math.min(100, Math.round((bearScore / Math.max(totalScore, 35)) * 100));
  } else {
    signal = 'neutral';
    strength = 0;
  }

  const detail = patterns.length > 0
    ? `${patterns.join(' + ')} — ${signal} pattern confluence (strength ${strength}%)`
    : 'No significant candlestick patterns on last 3 candles';

  return { patterns, signal, strength, detail, weight: 10 };
}
