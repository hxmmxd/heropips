/**
 * Smart Money Concepts (SMC) Scanner
 * Detects: BOS, ChoCH, FVG, Order Blocks, Liquidity Sweeps, Equal Highs/Lows
 * Scores setups by confluence and generates trade signals.
 */

// ── Types ───────────────────────────────────────────────────

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  time: string;
}

export interface FairValueGap {
  index: number;
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  midpoint: number;
  time: string;
  filled: boolean;
}

export interface OrderBlock {
  index: number;
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  time: string;
  mitigated: boolean;
}

export interface StructureBreak {
  index: number;
  type: 'BOS' | 'ChoCH';
  direction: 'bullish' | 'bearish';
  level: number;
  time: string;
}

export interface LiquiditySweep {
  index: number;
  direction: 'bullish' | 'bearish'; // bullish = swept lows then reversed up
  sweptLevel: number;
  reversalCandle: number;
  time: string;
}

export interface TradeSignal {
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  confluenceScore: number; // 1-10
  patterns: string[];
  timestamp: string;
}

// ── Swing Point Detection ───────────────────────────────────

export function findSwingPoints(candles: Candle[], lookback = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) isHigh = false;
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) isLow = false;
    }
    if (isHigh) swings.push({ index: i, price: candles[i].high, type: 'high', time: candles[i].time });
    if (isLow) swings.push({ index: i, price: candles[i].low, type: 'low', time: candles[i].time });
  }
  return swings;
}

// ── Break of Structure / Change of Character ────────────────

export function findStructureBreaks(candles: Candle[], swings: SwingPoint[]): StructureBreak[] {
  const breaks: StructureBreak[] = [];
  if (swings.length < 4) return breaks;

  let trend: 'bullish' | 'bearish' | null = null;
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');

  // Determine initial trend
  if (highs.length >= 2 && lows.length >= 2) {
    const lastTwoHighs = highs.slice(-2);
    const lastTwoLows = lows.slice(-2);
    if (lastTwoHighs[1].price > lastTwoHighs[0].price && lastTwoLows[1].price > lastTwoLows[0].price) {
      trend = 'bullish';
    } else if (lastTwoHighs[1].price < lastTwoHighs[0].price && lastTwoLows[1].price < lastTwoLows[0].price) {
      trend = 'bearish';
    }
  }

  // Scan for breaks
  for (let i = 3; i < candles.length; i++) {
    const candle = candles[i];
    // Check bullish BOS: close above last swing high
    const lastSwingHigh = [...highs].reverse().find(h => h.index < i);
    const lastSwingLow = [...lows].reverse().find(l => l.index < i);

    if (lastSwingHigh && candle.close > lastSwingHigh.price) {
      const type = trend === 'bearish' ? 'ChoCH' : 'BOS';
      if (!breaks.find(b => b.level === lastSwingHigh.price && Math.abs(b.index - i) < 3)) {
        breaks.push({ index: i, type, direction: 'bullish', level: lastSwingHigh.price, time: candle.time });
        trend = 'bullish';
      }
    }
    if (lastSwingLow && candle.close < lastSwingLow.price) {
      const type = trend === 'bullish' ? 'ChoCH' : 'BOS';
      if (!breaks.find(b => b.level === lastSwingLow.price && Math.abs(b.index - i) < 3)) {
        breaks.push({ index: i, type, direction: 'bearish', level: lastSwingLow.price, time: candle.time });
        trend = 'bearish';
      }
    }
  }
  return breaks;
}

// ── Fair Value Gap Detection ────────────────────────────────

export function findFVGs(candles: Candle[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];
    // Bullish FVG: candle 3 low > candle 1 high (gap up)
    if (c3.low > c1.high) {
      fvgs.push({
        index: i - 1, type: 'bullish',
        top: c3.low, bottom: c1.high,
        midpoint: (c3.low + c1.high) / 2,
        time: candles[i - 1].time, filled: false,
      });
    }
    // Bearish FVG: candle 3 high < candle 1 low (gap down)
    if (c3.high < c1.low) {
      fvgs.push({
        index: i - 1, type: 'bearish',
        top: c1.low, bottom: c3.high,
        midpoint: (c1.low + c3.high) / 2,
        time: candles[i - 1].time, filled: false,
      });
    }
  }
  // Check if FVGs got filled
  for (const fvg of fvgs) {
    for (let i = fvg.index + 2; i < candles.length; i++) {
      if (fvg.type === 'bullish' && candles[i].low <= fvg.bottom) { fvg.filled = true; break; }
      if (fvg.type === 'bearish' && candles[i].high >= fvg.top) { fvg.filled = true; break; }
    }
  }
  return fvgs;
}

// ── Order Block Detection ───────────────────────────────────

export function findOrderBlocks(candles: Candle[], swings: SwingPoint[]): OrderBlock[] {
  const obs: OrderBlock[] = [];
  for (const swing of swings) {
    const i = swing.index;
    if (i < 1) continue;
    if (swing.type === 'low') {
      // Bullish OB: last bearish candle before the swing low (demand zone)
      for (let j = i; j >= Math.max(0, i - 3); j--) {
        if (candles[j].close < candles[j].open) {
          const mitigated = candles.slice(j + 1).some(c => c.low < candles[j].low);
          obs.push({ index: j, type: 'bullish', high: candles[j].high, low: candles[j].low, time: candles[j].time, mitigated });
          break;
        }
      }
    } else {
      // Bearish OB: last bullish candle before the swing high (supply zone)
      for (let j = i; j >= Math.max(0, i - 3); j--) {
        if (candles[j].close > candles[j].open) {
          const mitigated = candles.slice(j + 1).some(c => c.high > candles[j].high);
          obs.push({ index: j, type: 'bearish', high: candles[j].high, low: candles[j].low, time: candles[j].time, mitigated });
          break;
        }
      }
    }
  }
  return obs;
}

// ── Liquidity Sweep Detection ───────────────────────────────

export function findLiquiditySweeps(candles: Candle[], swings: SwingPoint[]): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');

  for (let i = 5; i < candles.length; i++) {
    // Bullish sweep: wick below previous swing low, close above it
    for (const sl of lows) {
      if (sl.index >= i - 1) continue;
      if (candles[i].low < sl.price && candles[i].close > sl.price) {
        if (!sweeps.find(s => Math.abs(s.index - i) < 2)) {
          sweeps.push({ index: i, direction: 'bullish', sweptLevel: sl.price, reversalCandle: i, time: candles[i].time });
        }
        break;
      }
    }
    // Bearish sweep: wick above previous swing high, close below it
    for (const sh of highs) {
      if (sh.index >= i - 1) continue;
      if (candles[i].high > sh.price && candles[i].close < sh.price) {
        if (!sweeps.find(s => Math.abs(s.index - i) < 2)) {
          sweeps.push({ index: i, direction: 'bearish', sweptLevel: sh.price, reversalCandle: i, time: candles[i].time });
        }
        break;
      }
    }
  }
  return sweeps;
}

// ── Equal Highs / Equal Lows ────────────────────────────────

export function findEqualLevels(swings: SwingPoint[], tolerance = 0.0005): { type: 'equal_highs' | 'equal_lows'; price: number; count: number }[] {
  const levels: { type: 'equal_highs' | 'equal_lows'; price: number; count: number }[] = [];
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');

  for (let i = 0; i < highs.length; i++) {
    let count = 1;
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i].price - highs[j].price) / highs[i].price < tolerance) count++;
    }
    if (count >= 2) levels.push({ type: 'equal_highs', price: highs[i].price, count });
  }
  for (let i = 0; i < lows.length; i++) {
    let count = 1;
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i].price - lows[j].price) / lows[i].price < tolerance) count++;
    }
    if (count >= 2) levels.push({ type: 'equal_lows', price: lows[i].price, count });
  }
  return levels;
}

// ── Confluence Scorer & Signal Generator ─────────────────────

export function generateSignals(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  lookback = 3
): TradeSignal[] {
  if (candles.length < 20) return [];

  const swings = findSwingPoints(candles, lookback);
  const breaks = findStructureBreaks(candles, swings);
  const fvgs = findFVGs(candles);
  const obs = findOrderBlocks(candles, swings);
  const sweeps = findLiquiditySweeps(candles, swings);
  const equalLevels = findEqualLevels(swings);
  const signals: TradeSignal[] = [];
  const lastCandle = candles[candles.length - 1];
  const price = lastCandle.close;

  // Look for recent confluence (last 10 candles)
  const recentWindow = candles.length - 10;
  const recentBreaks = breaks.filter(b => b.index >= recentWindow);
  const recentFVGs = fvgs.filter(f => !f.filled && f.index >= recentWindow - 5);
  const recentSweeps = sweeps.filter(s => s.index >= recentWindow);
  const recentOBs = obs.filter(o => !o.mitigated && o.index >= recentWindow - 10);

  // Build bullish signals
  const bullishPatterns: string[] = [];
  let bullishScore = 0;

  const bullBOS = recentBreaks.find(b => b.direction === 'bullish');
  if (bullBOS) { bullishScore += bullBOS.type === 'ChoCH' ? 3 : 2; bullishPatterns.push(bullBOS.type); }

  const bullFVG = recentFVGs.find(f => f.type === 'bullish' && price >= f.bottom && price <= f.top);
  if (bullFVG) { bullishScore += 2; bullishPatterns.push('FVG'); }
  else if (recentFVGs.find(f => f.type === 'bullish')) { bullishScore += 1; bullishPatterns.push('FVG nearby'); }

  const bullSweep = recentSweeps.find(s => s.direction === 'bullish');
  if (bullSweep) { bullishScore += 2; bullishPatterns.push('Liquidity Sweep'); }

  const bullOB = recentOBs.find(o => o.type === 'bullish' && price >= o.low && price <= o.high);
  if (bullOB) { bullishScore += 2; bullishPatterns.push('Order Block'); }
  else if (recentOBs.find(o => o.type === 'bullish')) { bullishScore += 1; bullishPatterns.push('OB nearby'); }

  const eqLows = equalLevels.find(e => e.type === 'equal_lows' && e.price < price);
  if (eqLows) { bullishScore += 1; bullishPatterns.push(`Equal Lows (${eqLows.count}x)`); }

  if (bullishScore >= 4 && bullishPatterns.length >= 2) {
    const atr = calculateATR(candles, 14);
    const sl = price - atr * 1.5;
    const tp = price + atr * 3;
    signals.push({
      symbol, timeframe, direction: 'BUY',
      entry: Math.round(price * 100000) / 100000,
      stopLoss: Math.round(sl * 100000) / 100000,
      takeProfit: Math.round(tp * 100000) / 100000,
      riskReward: Math.round((tp - price) / (price - sl) * 10) / 10,
      confluenceScore: Math.min(10, bullishScore),
      patterns: bullishPatterns,
      timestamp: lastCandle.time,
    });
  }

  // Build bearish signals
  const bearishPatterns: string[] = [];
  let bearishScore = 0;

  const bearBOS = recentBreaks.find(b => b.direction === 'bearish');
  if (bearBOS) { bearishScore += bearBOS.type === 'ChoCH' ? 3 : 2; bearishPatterns.push(bearBOS.type); }

  const bearFVG = recentFVGs.find(f => f.type === 'bearish' && price <= f.top && price >= f.bottom);
  if (bearFVG) { bearishScore += 2; bearishPatterns.push('FVG'); }
  else if (recentFVGs.find(f => f.type === 'bearish')) { bearishScore += 1; bearishPatterns.push('FVG nearby'); }

  const bearSweep = recentSweeps.find(s => s.direction === 'bearish');
  if (bearSweep) { bearishScore += 2; bearishPatterns.push('Liquidity Sweep'); }

  const bearOB = recentOBs.find(o => o.type === 'bearish' && price >= o.low && price <= o.high);
  if (bearOB) { bearishScore += 2; bearishPatterns.push('Order Block'); }
  else if (recentOBs.find(o => o.type === 'bearish')) { bearishScore += 1; bearishPatterns.push('OB nearby'); }

  const eqHighs = equalLevels.find(e => e.type === 'equal_highs' && e.price > price);
  if (eqHighs) { bearishScore += 1; bearishPatterns.push(`Equal Highs (${eqHighs.count}x)`); }

  if (bearishScore >= 4 && bearishPatterns.length >= 2) {
    const atr = calculateATR(candles, 14);
    const sl = price + atr * 1.5;
    const tp = price - atr * 3;
    signals.push({
      symbol, timeframe, direction: 'SELL',
      entry: Math.round(price * 100000) / 100000,
      stopLoss: Math.round(sl * 100000) / 100000,
      takeProfit: Math.round(tp * 100000) / 100000,
      riskReward: Math.round((price - tp) / (sl - price) * 10) / 10,
      confluenceScore: Math.min(10, bearishScore),
      patterns: bearishPatterns,
      timestamp: lastCandle.time,
    });
  }

  return signals;
}

// ── ATR Calculation ─────────────────────────────────────────

function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return candles[candles.length - 1].high - candles[candles.length - 1].low;
  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    atrSum += tr;
  }
  return atrSum / period;
}

// ── Full Scan Report ────────────────────────────────────────

export interface ScanReport {
  symbol: string;
  timeframe: string;
  timestamp: string;
  swingPoints: SwingPoint[];
  structureBreaks: StructureBreak[];
  fvgs: FairValueGap[];
  orderBlocks: OrderBlock[];
  liquiditySweeps: LiquiditySweep[];
  equalLevels: { type: string; price: number; count: number }[];
  signals: TradeSignal[];
  marketBias: 'bullish' | 'bearish' | 'neutral';
}

export function fullScan(symbol: string, timeframe: string, candles: Candle[]): ScanReport {
  const swings = findSwingPoints(candles);
  const breaks = findStructureBreaks(candles, swings);
  const fvgs = findFVGs(candles);
  const obs = findOrderBlocks(candles, swings);
  const sweeps = findLiquiditySweeps(candles, swings);
  const eqLevels = findEqualLevels(swings);
  const signals = generateSignals(symbol, timeframe, candles);

  // Determine bias from recent structure
  const recentBreaks = breaks.slice(-3);
  const bullCount = recentBreaks.filter(b => b.direction === 'bullish').length;
  const bearCount = recentBreaks.filter(b => b.direction === 'bearish').length;
  const marketBias = bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';

  return {
    symbol, timeframe,
    timestamp: candles[candles.length - 1]?.time || new Date().toISOString(),
    swingPoints: swings,
    structureBreaks: breaks,
    fvgs: fvgs.filter(f => !f.filled),
    orderBlocks: obs.filter(o => !o.mitigated),
    liquiditySweeps: sweeps,
    equalLevels: eqLevels,
    signals,
    marketBias,
  };
}
