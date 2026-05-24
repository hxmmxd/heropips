// Market Data Engine — Multi-Indicator Confluence Analysis
// Fetches real-time prices and technical indicators from Twelve Data API

const BASE_URL = 'https://api.twelvedata.com';

// Read API key at call time (not module load time) to ensure env is loaded
function getApiKey(): string {
  return process.env.TWELVE_DATA_API_KEY || '';
}

// Supported symbol mappings (user-friendly → API format)
const SYMBOL_MAP: Record<string, string> = {
  'gold': 'XAU/USD',
  'xauusd': 'XAU/USD',
  'xau': 'XAU/USD',
  'eurusd': 'EUR/USD',
  'eur': 'EUR/USD',
  'gbpusd': 'GBP/USD',
  'gbp': 'GBP/USD',
  'usdjpy': 'USD/JPY',
  'jpy': 'USD/JPY',
  'btc': 'BTC/USD',
  'bitcoin': 'BTC/USD',
  'btcusd': 'BTC/USD',
  'eth': 'ETH/USD',
  'ethereum': 'ETH/USD',
  'ethusd': 'ETH/USD',
  'nas100': 'NAS100',
  'nasdaq': 'NAS100',
  'us30': 'US30',
  'dow': 'US30',
  'usoil': 'USO',
  'oil': 'USO',
};

// Clean symbol for display (remove slash)
export function displaySymbol(apiSymbol: string): string {
  return apiSymbol.replace('/', '');
}

// Detect which asset the user is asking about
export function detectSymbol(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const [keyword, symbol] of Object.entries(SYMBOL_MAP)) {
    if (lower.includes(keyword)) {
      return symbol;
    }
  }
  return 'XAU/USD'; // Default to Gold
}

// Contract specifications per instrument
// dollarPerPoint: how much $1 price movement is worth per 1.0 standard lot
// minSL: minimum realistic stop loss distance in price terms
const CONTRACT_SPECS: Record<string, { dollarPerPoint: number; minSL: number }> = {
  'XAU/USD': { dollarPerPoint: 100, minSL: 8 },     // 100 oz/lot, min $8 SL
  'EUR/USD': { dollarPerPoint: 100000, minSL: 0.0020 }, // 100k units, min 20 pips
  'GBP/USD': { dollarPerPoint: 100000, minSL: 0.0025 },
  'USD/JPY': { dollarPerPoint: 1000, minSL: 0.30 },     // per 1 yen move
  'BTC/USD': { dollarPerPoint: 1, minSL: 500 },       // 1 BTC/lot, min $500 SL
  'ETH/USD': { dollarPerPoint: 1, minSL: 40 },
  'NAS100':  { dollarPerPoint: 20, minSL: 50 },       // $20 per point per lot
  'US30':    { dollarPerPoint: 10, minSL: 80 },
};

// ── Position Sizing ────────────────────────────────────────

export function calculateRiskParams(
  price: number,
  atr: number | null,
  direction: 'BUY' | 'SELL',
  accountBalance: number = 10000,
  riskPercent: number = 1.5,
  symbol: string = 'XAU/USD'
) {
  const spec = CONTRACT_SPECS[symbol] || CONTRACT_SPECS['XAU/USD'];

  // Use ATR for SL distance, but enforce a minimum realistic distance
  const atrBasedSL = (atr || price * 0.005) * 1.5;
  const slDistance = Math.max(atrBasedSL, spec.minSL);
  const tpDistance = slDistance * 2.5; // 1:2.5 R:R

  const sl = direction === 'BUY' ? (price - slDistance) : (price + slDistance);
  const tp = direction === 'BUY' ? (price + tpDistance) : (price - tpDistance);

  // Position sizing: Risk$ / (SL distance × $ per point per lot)
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerLot = slDistance * spec.dollarPerPoint;
  const lotSize = Math.max(0.01, Math.min(2.0, riskAmount / riskPerLot));

  // Margin at ~100:1 leverage approximation
  const notionalValue = price * spec.dollarPerPoint * lotSize / (symbol.includes('USD') ? 1 : 100);
  const margin = notionalValue * 0.01;

  const projectedRisk = lotSize * slDistance * spec.dollarPerPoint;
  const projectedProfit = lotSize * tpDistance * spec.dollarPerPoint;
  const rrRatio = `1 : ${(tpDistance / slDistance).toFixed(1)}`;

  return {
    stopLoss: sl.toFixed(2),
    takeProfit: tp.toFixed(2),
    lotVolume: `${lotSize.toFixed(2)} Lots`,
    margin: margin.toFixed(2),
    risk: projectedRisk.toFixed(2),
    profit: projectedProfit.toFixed(2),
    rrRatio,
  };
}

export interface MarketSnapshot {
  symbol: string;
  displaySymbol: string;
  price: number;
  indicators: {
    rsi: number | null;
    macd: { macd: number; signal: number; histogram: number } | null;
    ema20: number | null;
    ema50: number | null;
    ema200: number | null;
    bbands: { upper: number; middle: number; lower: number } | null;
    atr: number | null;
    stoch: { k: number; d: number } | null;
  };
  htfBias: 'bullish' | 'bearish' | 'neutral';
  confluenceScore: number;
  confluenceDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  confidenceGrade: 'AAA' | 'AA' | 'A' | 'BBB';
}

// ── Fetch Helpers ──────────────────────────────────────────

async function fetchJSON(endpoint: string, params: Record<string, string>) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[Market Engine] TWELVE_DATA_API_KEY is not set');
    return null;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('apikey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[Market Engine] ${endpoint} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.status === 'error') {
      console.error(`[Market Engine] ${endpoint} error:`, data.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`[Market Engine] ${endpoint} fetch failed:`, err);
    return null;
  }
}

async function fetchPrice(symbol: string): Promise<number | null> {
  const data = await fetchJSON('/price', { symbol });
  return data?.price ? parseFloat(data.price) : null;
}

async function fetchRSI(symbol: string, interval: string = '1h'): Promise<number | null> {
  const data = await fetchJSON('/rsi', { symbol, interval, time_period: '14' });
  return data?.values?.[0]?.rsi ? parseFloat(data.values[0].rsi) : null;
}

async function fetchMACD(symbol: string, interval: string = '1h') {
  const data = await fetchJSON('/macd', { symbol, interval });
  if (!data?.values?.[0]) return null;
  const v = data.values[0];
  return {
    macd: parseFloat(v.macd),
    signal: parseFloat(v.macd_signal),
    histogram: parseFloat(v.macd_hist),
  };
}

async function fetchEMA(symbol: string, period: string, interval: string = '1h'): Promise<number | null> {
  const data = await fetchJSON('/ema', { symbol, interval, time_period: period });
  return data?.values?.[0]?.ema ? parseFloat(data.values[0].ema) : null;
}

async function fetchBBands(symbol: string, interval: string = '1h') {
  const data = await fetchJSON('/bbands', { symbol, interval, time_period: '20' });
  if (!data?.values?.[0]) return null;
  const v = data.values[0];
  return {
    upper: parseFloat(v.upper_band),
    middle: parseFloat(v.middle_band),
    lower: parseFloat(v.lower_band),
  };
}

async function fetchATR(symbol: string, interval: string = '1h'): Promise<number | null> {
  const data = await fetchJSON('/atr', { symbol, interval, time_period: '14' });
  return data?.values?.[0]?.atr ? parseFloat(data.values[0].atr) : null;
}

async function fetchStoch(symbol: string, interval: string = '1h') {
  const data = await fetchJSON('/stoch', { symbol, interval });
  if (!data?.values?.[0]) return null;
  const v = data.values[0];
  return {
    k: parseFloat(v.slow_k),
    d: parseFloat(v.slow_d),
  };
}

// ── Higher Timeframe Bias ──────────────────────────────────

async function fetchHTFBias(symbol: string): Promise<'bullish' | 'bearish' | 'neutral'> {
  // Check 4H RSI for higher timeframe directional bias
  const rsi4h = await fetchRSI(symbol, '4h');
  if (rsi4h === null) return 'neutral';
  if (rsi4h < 45) return 'bearish';
  if (rsi4h > 55) return 'bullish';
  return 'neutral';
}

// ── Confluence Scoring Engine ──────────────────────────────

interface IndicatorSignal {
  name: string;
  weight: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  detail: string;
}

function scoreIndicators(
  price: number,
  rsi: number | null,
  macd: { macd: number; signal: number; histogram: number } | null,
  ema20: number | null,
  ema50: number | null,
  ema200: number | null,
  bbands: { upper: number; middle: number; lower: number } | null,
  stoch: { k: number; d: number } | null,
  htfBias: 'bullish' | 'bearish' | 'neutral'
): { score: number; direction: 'BUY' | 'SELL' | 'NEUTRAL'; signals: IndicatorSignal[] } {
  const signals: IndicatorSignal[] = [];

  // 1. RSI (15%)
  if (rsi !== null) {
    if (rsi < 35) {
      signals.push({ name: 'RSI(14)', weight: 15, direction: 'bullish', detail: `${rsi.toFixed(1)} — Oversold` });
    } else if (rsi > 65) {
      signals.push({ name: 'RSI(14)', weight: 15, direction: 'bearish', detail: `${rsi.toFixed(1)} — Overbought` });
    } else {
      signals.push({ name: 'RSI(14)', weight: 15, direction: 'neutral', detail: `${rsi.toFixed(1)} — Neutral zone` });
    }
  }

  // 2. MACD (20%)
  if (macd !== null) {
    if (macd.histogram > 0 && macd.macd > macd.signal) {
      signals.push({ name: 'MACD', weight: 20, direction: 'bullish', detail: `Bullish crossover, histogram +${macd.histogram.toFixed(4)}` });
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
      signals.push({ name: 'MACD', weight: 20, direction: 'bearish', detail: `Bearish crossover, histogram ${macd.histogram.toFixed(4)}` });
    } else {
      signals.push({ name: 'MACD', weight: 20, direction: 'neutral', detail: 'No clear crossover' });
    }
  }

  // 3. EMA Alignment (20%)
  if (ema20 !== null && ema50 !== null && ema200 !== null) {
    if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
      signals.push({ name: 'EMA Stack', weight: 20, direction: 'bullish', detail: `Price > EMA20 > EMA50 > EMA200 — Perfect bullish alignment` });
    } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
      signals.push({ name: 'EMA Stack', weight: 20, direction: 'bearish', detail: `Price < EMA20 < EMA50 < EMA200 — Perfect bearish alignment` });
    } else {
      signals.push({ name: 'EMA Stack', weight: 20, direction: 'neutral', detail: 'Mixed EMA alignment — no trend conviction' });
    }
  }

  // 4. Bollinger Bands (15%)
  if (bbands !== null) {
    const bandWidth = bbands.upper - bbands.lower;
    if (price <= bbands.lower) {
      signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'bullish', detail: `Price at lower band (${bbands.lower.toFixed(2)}) — potential bounce` });
    } else if (price >= bbands.upper) {
      signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'bearish', detail: `Price at upper band (${bbands.upper.toFixed(2)}) — potential rejection` });
    } else {
      signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'neutral', detail: `Mid-range (band width: ${bandWidth.toFixed(2)})` });
    }
  }

  // 5. Stochastic (10%)
  if (stoch !== null) {
    if (stoch.k < 20 && stoch.k > stoch.d) {
      signals.push({ name: 'Stochastic', weight: 10, direction: 'bullish', detail: `%K=${stoch.k.toFixed(1)} — Oversold bullish crossover` });
    } else if (stoch.k > 80 && stoch.k < stoch.d) {
      signals.push({ name: 'Stochastic', weight: 10, direction: 'bearish', detail: `%K=${stoch.k.toFixed(1)} — Overbought bearish crossover` });
    } else {
      signals.push({ name: 'Stochastic', weight: 10, direction: 'neutral', detail: `%K=${stoch.k.toFixed(1)}, %D=${stoch.d.toFixed(1)}` });
    }
  }

  // 6. Multi-Timeframe Alignment (20%)
  if (htfBias !== 'neutral') {
    signals.push({ name: '4H Timeframe Bias', weight: 20, direction: htfBias, detail: `4H RSI confirms ${htfBias} bias` });
  } else {
    signals.push({ name: '4H Timeframe Bias', weight: 20, direction: 'neutral', detail: '4H timeframe shows no directional conviction' });
  }

  // Calculate weighted confluence
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;

  for (const sig of signals) {
    totalWeight += sig.weight;
    if (sig.direction === 'bullish') bullishScore += sig.weight;
    if (sig.direction === 'bearish') bearishScore += sig.weight;
  }

  const maxScore = Math.max(bullishScore, bearishScore);
  const confluencePercent = totalWeight > 0 ? Math.round((maxScore / totalWeight) * 100) : 0;
  const direction = bullishScore > bearishScore ? 'BUY' : bearishScore > bullishScore ? 'SELL' : 'NEUTRAL';

  return { score: confluencePercent, direction, signals };
}

function gradeConfidence(score: number): 'AAA' | 'AA' | 'A' | 'BBB' {
  if (score >= 90) return 'AAA';
  if (score >= 80) return 'AA';
  if (score >= 70) return 'A';
  return 'BBB';
}


// ── Main Market Snapshot Assembler ─────────────────────────

export async function getMarketSnapshot(symbol: string): Promise<MarketSnapshot | null> {
  try {
    console.log(`[Market Engine] Fetching snapshot for ${symbol}...`);

    // Fetch price first to validate connectivity
    const price = await fetchPrice(symbol);
    if (price === null) {
      console.error('[Market Engine] Failed to fetch price — aborting snapshot');
      return null;
    }
    console.log(`[Market Engine] Price: $${price}`);

    // Fetch 4 core indicators (5 total API calls incl. price)
    // Stays within Twelve Data free tier of 8 credits/min
    const [rsi, macd, ema50, atr] = await Promise.all([
      fetchRSI(symbol, '1h'),
      fetchMACD(symbol, '1h'),
      fetchEMA(symbol, '50', '1h'),
      fetchATR(symbol, '1h'),
    ]);

    console.log(`[Market Engine] Indicators — RSI: ${rsi}, MACD: ${macd ? 'ok' : 'null'}, EMA50: ${ema50}, ATR: ${atr}`);

    // Simplified directional bias using available indicators
    let bullish = 0;
    let bearish = 0;

    if (rsi !== null) {
      if (rsi < 50) bearish++;
      else bullish++;
    }
    if (macd !== null) {
      if (macd.histogram > 0) bullish++;
      else bearish++;
    }
    if (ema50 !== null) {
      if (price > ema50) bullish++;
      else bearish++;
    }

    const direction: 'BUY' | 'SELL' = bullish >= bearish ? 'BUY' : 'SELL';
    const total = bullish + bearish;
    const score = total > 0 ? Math.round((Math.max(bullish, bearish) / total) * 100) : 50;

    console.log(`[Market Engine] Confluence: ${score}% ${direction} (Grade: ${gradeConfidence(score)})`);

    return {
      symbol,
      displaySymbol: displaySymbol(symbol),
      price,
      indicators: { rsi, macd, ema20: null, ema50, ema200: null, bbands: null, atr, stoch: null },
      htfBias: direction === 'BUY' ? 'bullish' : 'bearish',
      confluenceScore: score,
      confluenceDirection: direction,
      confidenceGrade: gradeConfidence(score),
    };
  } catch (error) {
    console.error('[Market Engine] Failed to assemble snapshot:', error);
    return null;
  }
}

