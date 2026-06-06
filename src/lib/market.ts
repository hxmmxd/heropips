import { computeIndicators } from './indicators';
import { getPlatformConfig } from './platformConfig';
import { recordApiCall, markUnconfigured } from './apiStats';
import { fetchYahooCandles } from './yahooFinance';
import { fullScan, type ScanReport } from './scanner';
import { getNewsSentiment, type SentimentResult } from './newsSentiment';
import { checkEconomicCalendar } from './econCalendar';
import { detectDivergence, type DivergenceResult } from './divergence';
import { checkCorrelation, type CorrelationResult } from './correlation';

const BASE_URL = 'https://api.twelvedata.com';

// ── Snapshot cache — 15 min TTL per symbol ─────────────────
// Prevents hammering the Twelve Data quota on repeated chat queries
const SNAPSHOT_CACHE = new Map<string, { snapshot: MarketSnapshot; expiresAt: number }>();
const SNAPSHOT_TTL_MS = 3 * 60 * 1000; // 3 minutes


export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Read API key — checks Supabase platform_config first, then env var
async function getApiKey(): Promise<string> {
  return getPlatformConfig('twelve_data_api_key', 'TWELVE_DATA_API_KEY');
}

// Supported symbol mappings (user-friendly → API format)
const SYMBOL_MAP: Record<string, string> = {
  'gold': 'XAU/USD',
  'xauusd': 'XAU/USD',
  'xau': 'XAU/USD',
  'eurusd': 'EUR/USD',
  'eur/usd': 'EUR/USD',
  'eur': 'EUR/USD',
  'gbpusd': 'GBP/USD',
  'gbp/usd': 'GBP/USD',
  'gbp': 'GBP/USD',
  'usdjpy': 'USD/JPY',
  'usd/jpy': 'USD/JPY',
  'jpy': 'USD/JPY',
  'btc': 'BTC/USD',
  'bitcoin': 'BTC/USD',
  'btcusd': 'BTC/USD',
  'eth': 'ETH/USD',
  'ethereum': 'ETH/USD',
  'ethusd': 'ETH/USD',
  'nas100': 'QQQ',
  'nasdaq': 'QQQ',
  'qqq': 'QQQ',
  'us30': 'DIA',
  'dow': 'DIA',
  'dia': 'DIA',
  'spy': 'SPY',
  's&p': 'SPY',
  'sp500': 'SPY',
  'usoil': 'USO',
  'oil': 'USO',
  'crude': 'USO',
};

// Clean symbol for display
const DISPLAY_MAP: Record<string, string> = {
  'QQQ': 'NAS100',
  'DIA': 'US30',
  'SPY': 'SP500',
  'USO': 'OIL',
};

export function displaySymbol(apiSymbol: string): string {
  return DISPLAY_MAP[apiSymbol] || apiSymbol.replace('/', '');
}

// Detect which asset the user is asking about (returns null if none detected)
export function detectSymbol(userMessage: string): string | null {
  const lower = userMessage.toLowerCase();
  for (const [keyword, symbol] of Object.entries(SYMBOL_MAP)) {
    if (lower.includes(keyword)) {
      return symbol;
    }
  }
  return null; // No specific asset mentioned
}

// Contract specifications per instrument
// dollarPerPoint: how much $1 price movement is worth per 1.0 standard lot
// minSL: minimum realistic stop loss distance in price terms
const CONTRACT_SPECS: Record<string, { dollarPerPoint: number; minSL: number }> = {
  'XAU/USD': { dollarPerPoint: 100, minSL: 8 },
  'EUR/USD': { dollarPerPoint: 100000, minSL: 0.0020 },
  'GBP/USD': { dollarPerPoint: 100000, minSL: 0.0025 },
  'USD/JPY': { dollarPerPoint: 1000, minSL: 0.30 },
  'BTC/USD': { dollarPerPoint: 1, minSL: 500 },
  'ETH/USD': { dollarPerPoint: 1, minSL: 40 },
  'QQQ':     { dollarPerPoint: 100, minSL: 3 },       // ETF: ~$100/share, 100 shares/lot
  'DIA':     { dollarPerPoint: 100, minSL: 3 },
  'SPY':     { dollarPerPoint: 100, minSL: 3 },
  'USO':     { dollarPerPoint: 100, minSL: 1 },
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

// ── Gating Types ──────────────────────────────────────────

export type SignalOutcome = 'SIGNAL' | 'WATCH' | 'NO_TRADE';

export interface GateResult {
  name: string;
  passed: boolean;
  detail: string;
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
  // Phase A additions
  smcPatterns: string[];
  smcConfirmations: number;
  gateResults: GateResult[];
  signalOutcome: SignalOutcome;
  outcomeReason: string;
  // Phase B additions
  newsSentiment: SentimentResult;
  divergence: DivergenceResult;
  correlation: CorrelationResult;
}

// ── Fetch Helpers ──────────────────────────────────────────

async function fetchJSON(endpoint: string, params: Record<string, string>) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('[Market Engine] TWELVE_DATA_API_KEY is not set');
    markUnconfigured('twelve_data');
    return null;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('apikey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const t0 = Date.now();
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      recordApiCall('twelve_data', false, Date.now() - t0, `HTTP ${res.status}`);
      console.error(`[Market Engine] ${endpoint} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.status === 'error') {
      recordApiCall('twelve_data', false, Date.now() - t0, data.message || 'API error');
      console.error(`[Market Engine] ${endpoint} error:`, data.message);
      return null;
    }
    recordApiCall('twelve_data', true, Date.now() - t0);
    return data;
  } catch (err: any) {
    recordApiCall('twelve_data', false, Date.now() - t0, err?.message || 'Fetch failed');
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


// ── Session Filter ─────────────────────────────────────────

const SESSION_MAP: Record<string, string[]> = {
  'XAU/USD': ['london', 'newyork', 'overlap'],
  'EUR/USD': ['london', 'newyork', 'overlap'],
  'GBP/USD': ['london', 'newyork', 'overlap'],
  'USD/JPY': ['tokyo', 'london', 'overlap'],
  'BTC/USD': ['any'],
  'ETH/USD': ['any'],
  'QQQ':     ['newyork'],
  'DIA':     ['newyork'],
  'SPY':     ['newyork'],
  'USO':     ['newyork'],
};

function getCurrentSession(): string {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 0 && utcHour < 7) return 'tokyo';
  if (utcHour >= 7 && utcHour < 12) return 'london';
  if (utcHour >= 12 && utcHour < 16) return 'overlap'; // London+NY
  if (utcHour >= 16 && utcHour < 21) return 'newyork';
  return 'off-hours'; // 21-00 UTC
}

function isOptimalSession(symbol: string): { ok: boolean; session: string; detail: string } {
  const session = getCurrentSession();
  const allowed = SESSION_MAP[symbol] || ['any'];
  if (allowed.includes('any')) return { ok: true, session, detail: `${session} session (24h asset)` };
  const ok = allowed.includes(session);
  return { ok, session, detail: ok ? `${session} — optimal trading window` : `${session} — low liquidity for this pair` };
}

// ── Volatility Filter ──────────────────────────────────────

function checkVolatility(candles: { high: number; low: number; close: number }[]): { ok: boolean; ratio: number; detail: string } {
  if (candles.length < 21) return { ok: true, ratio: 1, detail: 'Not enough data' };
  // Current ATR vs 20-period average ATR
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  const currentATR = trs.slice(-1)[0] || 0;
  const avgATR = trs.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, trs.length);
  const ratio = avgATR > 0 ? currentATR / avgATR : 1;
  if (ratio < 0.5) return { ok: false, ratio, detail: `ATR ratio ${ratio.toFixed(2)} — dead market` };
  if (ratio > 2.5) return { ok: false, ratio, detail: `ATR ratio ${ratio.toFixed(2)} — extreme volatility` };
  return { ok: true, ratio, detail: `ATR ratio ${ratio.toFixed(2)} — normal volatility` };
}

// ── Signal Cooldown ────────────────────────────────────────

const COOLDOWN_MAP = new Map<string, number>();
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

function checkCooldown(symbol: string): { ok: boolean; detail: string } {
  const lastSignal = COOLDOWN_MAP.get(symbol);
  if (!lastSignal) return { ok: true, detail: 'No recent signal' };
  const elapsed = Date.now() - lastSignal;
  if (elapsed < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
    return { ok: false, detail: `Cooldown active — ${remaining} min remaining` };
  }
  return { ok: true, detail: 'Cooldown expired' };
}

export function markSignalFired(symbol: string) {
  COOLDOWN_MAP.set(symbol, Date.now());
}

// ── Main Market Snapshot Assembler ─────────────────────────

export async function getMarketSnapshot(symbol: string): Promise<MarketSnapshot | null> {
  // Return cached result if still fresh
  const cached = SNAPSHOT_CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[Market Engine] Cache hit for ${symbol} (expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
    return cached.snapshot;
  }

  try {
    console.log(`[Market Engine] Fetching snapshot for ${symbol}...`);

    // ── A2+A5: Fetch 200 candles for scanner depth ────────
    const candles = await fetchCandles(symbol, '1h', 200);
    if (candles.length < 50) {
      console.error('[Market Engine] Not enough candle data — aborting snapshot');
      return null;
    }

    // ── Compute indicators (TypeScript engine — works on Vercel)
    const results = computeIndicators(candles);
    if (!results || results.price === 0) {
      console.error('[Market Engine] Failed to compute indicators');
      return null;
    }

    const { price, rsi, macd, ema50, atr } = results;
    console.log(`[Market Engine] Price: $${price}`);
    console.log(`[Market Engine] Indicators — RSI: ${rsi}, MACD: ${macd ? 'ok' : 'null'}, EMA50: ${ema50}, ATR: ${atr}`);

    // ── A5: Higher Timeframe Bias (4H RSI) ────────────────
    const htfBias = await fetchHTFBias(symbol);

    // ── B1: Real News Sentiment ───────────────────────────
    const sentimentResult = await getNewsSentiment(symbol);

    // ── A3: Weighted 6-Indicator Scoring (replaces 3-vote) ─
    const macdForScorer = macd ? { macd: macd.value, signal: macd.signal, histogram: macd.histogram } : null;
    const scoring = scoreIndicators(price, rsi, macdForScorer, null, ema50, null, null, null, htfBias);
    const { score, direction, signals: indicatorSignals } = scoring;
    console.log(`[Market Engine] Weighted Confluence: ${score}% ${direction}`);
    console.log(`[Market Engine] Signals: ${indicatorSignals.map(s => `${s.name}:${s.direction}`).join(', ')}`);

    // ── A2: Wire SMC Scanner into Pipeline ────────────────
    const scanReport: ScanReport = fullScan(symbol, '1h', candles);
    const smcPatterns: string[] = [];
    let smcConfirmations = 0;

    if (scanReport.structureBreaks.length > 0) {
      const latest = scanReport.structureBreaks[scanReport.structureBreaks.length - 1];
      smcPatterns.push(`${latest.type} ${latest.direction}`);
      smcConfirmations++;
    }
    if (scanReport.fvgs.length > 0) {
      smcPatterns.push(`${scanReport.fvgs.length} active FVG(s)`);
      smcConfirmations++;
    }
    if (scanReport.orderBlocks.length > 0) {
      smcPatterns.push(`${scanReport.orderBlocks.length} Order Block(s)`);
      smcConfirmations++;
    }
    if (scanReport.liquiditySweeps.length > 0) {
      smcPatterns.push(`Liquidity Sweep detected`);
      smcConfirmations++;
    }
    console.log(`[Market Engine] SMC: ${smcConfirmations} confirmations — ${smcPatterns.join(', ') || 'none'}`);

    // ── B3: Divergence Detection ──────────────────────────
    const divResult = detectDivergence(candles);
    if (divResult.combined !== 'none') {
      smcPatterns.push(`${divResult.combined} divergence`);
      console.log(`[Market Engine] Divergence: ${divResult.detail}`);
    }

    // ── A1: 6-Gate System ─────────────────────────────────
    const gates: GateResult[] = [];

    // Gate 1: Confluence ≥ 65%
    gates.push({ name: 'Confluence', passed: score >= 65, detail: `${score}% (need ≥65%)` });

    // Gate 2: SMC Confirmation ≥ 1
    gates.push({ name: 'SMC Confirmation', passed: smcConfirmations >= 1, detail: `${smcConfirmations} pattern(s): ${smcPatterns.join(', ') || 'none'}` });

    // Gate 3: HTF Alignment
    const htfAligned = htfBias === 'neutral' || (direction === 'BUY' && htfBias === 'bullish') || (direction === 'SELL' && htfBias === 'bearish');
    gates.push({ name: 'Timeframe Alignment', passed: htfAligned, detail: `4H bias: ${htfBias}, Signal: ${direction}` });

    // Gate 4: Session Filter
    const sessionCheck = isOptimalSession(symbol);
    gates.push({ name: 'Session Filter', passed: sessionCheck.ok, detail: sessionCheck.detail });

    // Gate 5: Volatility Normal
    const volCheck = checkVolatility(candles);
    gates.push({ name: 'Volatility', passed: volCheck.ok, detail: volCheck.detail });

    // Gate 6: No Conflict (bull vs bear > 10% apart)
    const bullBear = indicatorSignals.reduce((acc, s) => {
      if (s.direction === 'bullish') acc.bull += s.weight;
      if (s.direction === 'bearish') acc.bear += s.weight;
      return acc;
    }, { bull: 0, bear: 0 });
    const totalW = bullBear.bull + bullBear.bear || 1;
    const spread = Math.abs(bullBear.bull - bullBear.bear) / totalW;
    gates.push({ name: 'No Conflict', passed: spread > 0.1, detail: `Bull/Bear spread: ${(spread * 100).toFixed(0)}% (need >10%)` });

    // Gate 7: Cooldown
    const cooldownCheck = checkCooldown(symbol);
    gates.push({ name: 'Cooldown', passed: cooldownCheck.ok, detail: cooldownCheck.detail });

    // Gate 8: Economic Calendar (B2) — block near high-impact events
    const calendarCheck = await checkEconomicCalendar(symbol);
    gates.push({ name: 'News Event', passed: !calendarCheck.blocked, detail: calendarCheck.reason });

    // Gate 9: Correlated Assets (B4) — check if related markets agree
    const correlationCheck = await checkCorrelation(symbol, direction);
    gates.push({ name: 'Correlation', passed: correlationCheck.confirmed, detail: correlationCheck.detail });

    // ── Determine Outcome ──────────────────────────────────
    const passedCount = gates.filter(g => g.passed).length;
    const criticalGates = ['Confluence', 'No Conflict', 'News Event'];
    const criticalFailed = gates.filter(g => criticalGates.includes(g.name) && !g.passed);

    let signalOutcome: SignalOutcome;
    let outcomeReason: string;

    if (criticalFailed.length > 0) {
      signalOutcome = 'NO_TRADE';
      outcomeReason = `Critical gate failed: ${criticalFailed.map(g => g.name).join(', ')}`;
    } else if (passedCount >= 6) {
      signalOutcome = 'SIGNAL';
      outcomeReason = `${passedCount}/${gates.length} gates passed — high-confluence setup`;
    } else if (passedCount >= 4) {
      signalOutcome = 'WATCH';
      const failed = gates.filter(g => !g.passed).map(g => g.name);
      outcomeReason = `${passedCount}/${gates.length} gates passed — watching: ${failed.join(', ')}`;
    } else {
      signalOutcome = 'NO_TRADE';
      outcomeReason = `Only ${passedCount}/${gates.length} gates passed — insufficient confluence`;
    }

    console.log(`[Market Engine] Outcome: ${signalOutcome} — ${outcomeReason}`);

    const snapshot: MarketSnapshot = {
      symbol,
      displaySymbol: displaySymbol(symbol),
      price,
      indicators: {
        rsi,
        macd: macd ? { macd: macd.value, signal: macd.signal, histogram: macd.histogram } : null,
        ema20: null, ema50, ema200: null, bbands: null, atr, stoch: null
      },
      htfBias,
      confluenceScore: score,
      confluenceDirection: direction,
      confidenceGrade: gradeConfidence(score),
      // Phase A additions
      smcPatterns,
      smcConfirmations,
      gateResults: gates,
      signalOutcome,
      outcomeReason,
      // Phase B additions
      newsSentiment: sentimentResult,
      divergence: divResult,
      correlation: correlationCheck,
    };

    // Store in cache
    SNAPSHOT_CACHE.set(symbol, { snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS });

    return snapshot;
  } catch (error) {
    console.error('[Market Engine] Failed to assemble snapshot:', error);
    return null;
  }
}

// ── Candle Data for Mini Charts ────────────────────────────

export async function fetchCandles(symbol: string, interval: string = '1h', outputsize: number = 50): Promise<CandleData[]> {
  try {
    const key = await getApiKey();
    if (!key) {
      console.warn('[Market Engine] No Twelve Data API key, falling back to Yahoo Finance for candles');
      return fetchYahooCandles(symbol, interval, outputsize);
    }
    const res = await fetch(
      `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${key}`
    );
    const data = await res.json();

    if (data.status === 'error' || !data.values) {
      console.warn(`[Market Engine] Twelve Data time_series error, falling back to Yahoo Finance:`, data.message || 'unknown');
      return fetchYahooCandles(symbol, interval, outputsize);
    }

    // Twelve Data returns newest first, reverse for chart
    return data.values
      .map((v: any) => ({
        time: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
      }))
      .reverse();
  } catch (error) {
    console.error('[Market Engine] Failed to fetch candles from Twelve Data, trying Yahoo Finance:', error);
    return fetchYahooCandles(symbol, interval, outputsize);
  }
}

// ── News Headlines Fetcher ────────────────────────────────
export async function fetchNewsHeadlines(limit: number = 5): Promise<string[]> {
  try {
    const res = await fetch('https://finance.yahoo.com/news/rssindex', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!res.ok) return [];

    const xmlText = await res.text();
    const headlines: string[] = [];

    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const content = match[1];
      const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
      const sourceMatch = content.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      if (titleMatch) {
        const title = titleMatch[1].trim()
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&apos;/g, "'");
        const source = sourceMatch ? sourceMatch[1].trim() : 'Yahoo Finance';
        headlines.push(`[${source}] ${title}`);
      }
      if (headlines.length >= limit) break;
    }

    return headlines;
  } catch (error) {
    console.error('[Market Engine] Failed to fetch news:', error);
    return [];
  }
}
