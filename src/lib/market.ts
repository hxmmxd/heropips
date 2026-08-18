import { computeIndicators } from './indicators';
import { getPlatformConfig, getConfigCache } from './platformConfig';

function parseNum(val: any, fallback: number): number {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
}

function parseBool(val: any, fallback: boolean): boolean {
  if (val === undefined || val === null || val === '') return fallback;
  return val === 'true' || val === true;
}

export async function getGatingConfig() {
  try {
    const cache = await getConfigCache();
    return {
      gate_confluence_min_score: parseNum(cache.gate_confluence_min_score, 50),
      gate_smc_min_confirmations: parseNum(cache.gate_smc_min_confirmations, 1),
      gate_spread_min: parseNum(cache.gate_spread_min, 0.25),
      gate_volatility_min: parseNum(cache.gate_volatility_min, 0.5),
      gate_volatility_max: parseNum(cache.gate_volatility_max, 2.5),
      gate_cooldown_minutes: parseNum(cache.gate_cooldown_minutes, 60),
      gate_news_buffer_minutes: parseNum(cache.gate_news_buffer_minutes, 15),
      gate_confluence_enabled: parseBool(cache.gate_confluence_enabled, true),
      gate_smc_enabled: parseBool(cache.gate_smc_enabled, true),
      gate_spread_enabled: parseBool(cache.gate_spread_enabled, true),
      gate_volatility_enabled: parseBool(cache.gate_volatility_enabled, true),
      gate_cooldown_enabled: parseBool(cache.gate_cooldown_enabled, true),
      gate_news_enabled: parseBool(cache.gate_news_enabled, true),
      gate_htf_enabled: parseBool(cache.gate_htf_enabled, true),
      gate_session_enabled: parseBool(cache.gate_session_enabled, true),
      gate_correlation_enabled: parseBool(cache.gate_correlation_enabled, true),
      gate_mtf_enabled: parseBool(cache.gate_mtf_enabled, true),
      gate_vwap_enabled: parseBool(cache.gate_vwap_enabled, true),
      gate_candle_enabled: parseBool(cache.gate_candle_enabled, true),

    };
  } catch (err: any) {
    console.warn('[Market Engine] Failed to load gating config:', err.message);
    return {
      gate_confluence_min_score: 60,
      gate_smc_min_confirmations: 1,
      gate_spread_min: 0.25,
      gate_volatility_min: 0.5,
      gate_volatility_max: 2.5,
      gate_cooldown_minutes: 60,
      gate_news_buffer_minutes: 15,
      gate_confluence_enabled: true,
      gate_smc_enabled: true,
      gate_spread_enabled: true,
      gate_volatility_enabled: true,
      gate_cooldown_enabled: true,
      gate_news_enabled: true,
      gate_htf_enabled: true,
      gate_session_enabled: true,
      gate_correlation_enabled: true,
      gate_mtf_enabled: true,
      gate_vwap_enabled: true,
      gate_candle_enabled: true,
    };
  }
}

import { recordApiCall, markUnconfigured } from './apiStats';
import { fetchYahooCandles } from './yahooFinance';
import { fullScan, type ScanReport } from './scanner';
import { getNewsSentiment, type SentimentResult } from './newsSentiment';
import { checkEconomicCalendar } from './econCalendar';
import { detectDivergence, type DivergenceResult } from './divergence';
import { checkCorrelation, CORRELATION_MAP, type CorrelationResult } from './correlation';
// Phase C imports
import { computeVWAP, type VWAPResult } from './vwap';
import { getMTFBias, type MTFBias } from './mtfBias';
import { detectCandlePatterns, type PatternResult } from './candlePatterns';
import { computeKellySizing, type KellyResult } from './kellyCriterion';

// Phase E: Risk Management (Gates 13–15)
import {
  evaluateAllRiskGates,
  getRiskState,
  saveRiskState,
  createInitialRiskState,
  type RiskMultipliers,
  type RiskGateResult,
} from './riskGovernor';

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

export function cleanBrokerSymbolToStandard(symbol: string): string {
  const s = symbol.toUpperCase().split('.')[0].replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('EURUSD')) return 'EUR/USD';
  if (s.startsWith('GBPUSD')) return 'GBP/USD';
  if (s.startsWith('USDJPY')) return 'USD/JPY';
  if (s.startsWith('XAUUSD') || s.startsWith('GOLD')) return 'XAU/USD';
  if (s.startsWith('BTCUSD') || s.startsWith('BTC')) return 'BTC/USD';
  if (s.startsWith('ETHUSD') || s.startsWith('ETH')) return 'ETH/USD';
  
  // Generic 6-letter forex pair formatter (e.g. AUDPLN -> AUD/PLN)
  if (s.length === 6 && /^[A-Z]{6}$/.test(s)) {
    const nonForex6 = ['NAS100', 'US30', 'SP500', 'USOIL', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'XAGUSD'];
    if (!nonForex6.includes(s)) {
      return `${s.slice(0, 3)}/${s.slice(3)}`;
    }
  }
  
  return symbol.split('.')[0];
}

export function isStockSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  if (s.includes('/') || s.includes('USD') || s.includes('EUR') || s.includes('GBP') || s.includes('JPY')) {
    const nonStocks = ['GOLD', 'XAU', 'XTI', 'XAG', 'USO', 'OIL', 'QQQ', 'DIA', 'SPY', 'NAS100', 'US30', 'SP500', 'USOIL'];
    if (nonStocks.some(ns => s.includes(ns))) return false;
    return false;
  }
  return true;
}

export function isForexSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length === 6 && /^[A-Z]{6}$/.test(s)) {
    const nonForex6 = ['NAS100', 'US30', 'SP500', 'USOIL', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'XAGUSD'];
    return !nonForex6.includes(s);
  }
  if (symbol.includes('/')) {
    const parts = symbol.toUpperCase().split('/');
    if (parts.length === 2 && parts[0].length === 3 && parts[1].length === 3) {
      return true;
    }
  }
  return false;
}

const COMMON_WORDS_BLACKLIST = new Set([
  'can', 'all', 'now', 'it', 'or', 'am', 'be', 'go', 'do', 'by', 'on', 'at', 'if', 'so',
  'no', 'us', 'me', 'key', 'out', 'get', 'see', 'run', 'buy', 'sell', 'new', 'job', 'has',
  'but', 'any', 'for', 'are', 'who', 'you', 'why', 'how', 'the', 'and', 'for', 'that',
  'i', 'we', 'they', 'he', 'she', 'him', 'her', 'them', 'his', 'hers', 'their', 'our',
  'us', 'to', 'in', 'of', 'with', 'about', 'from', 'into', 'over', 'after', 'before'
]);

// Detect which asset the user is asking about (returns null if none detected)
export function detectSymbol(userMessage: string, allowedSymbols?: string[]): string | null {
  const lower = userMessage.toLowerCase();
  
  // 1. Try hardcoded mappings first
  for (const [keyword, symbol] of Object.entries(SYMBOL_MAP)) {
    if (lower.includes(keyword)) {
      // If the keyword is a blacklisted common word, check if it's explicitly prefixed with a dollar sign or quoted
      if (COMMON_WORDS_BLACKLIST.has(keyword)) {
        const hasDollarPrefix = new RegExp(`\\$${keyword}\\b`, 'i').test(userMessage);
        const hasQuotes = new RegExp(`['"]${keyword}['"]`, 'i').test(userMessage);
        if (!hasDollarPrefix && !hasQuotes) {
          continue; // Skip false positive common word match
        }
      }
      return symbol;
    }
  }
  
  // 2. Try allowed symbols from the active broker if available
  if (allowedSymbols && allowedSymbols.length > 0) {
    // Sort symbols by length descending to match longer symbols first
    const sortedAllowed = [...allowedSymbols].sort((a, b) => b.length - a.length);
    for (const sym of sortedAllowed) {
      const standardSym = cleanBrokerSymbolToStandard(sym);
      const cleanSym = sym.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanStandard = standardSym.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanMsg = userMessage.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      const words = userMessage.toUpperCase().split(/[^A-Z0-9]/);
      if (words.includes(cleanStandard) || words.includes(cleanSym) || cleanMsg === cleanStandard || cleanMsg === cleanSym) {
        // If the matched symbol is a blacklisted common word, require explicit ticker formatting ($SYMBOL or "SYMBOL")
        const lowerSym = sym.toLowerCase();
        if (COMMON_WORDS_BLACKLIST.has(lowerSym)) {
          const hasDollarPrefix = new RegExp(`\\$${lowerSym}\\b`, 'i').test(userMessage);
          const hasQuotes = new RegExp(`['"]${lowerSym}['"]`, 'i').test(userMessage);
          if (!hasDollarPrefix && !hasQuotes) {
            continue; // Skip false positive common word match
          }
        }
        return standardSym;
      }
    }
  }
  
  return null; // No specific asset mentioned
}

// Contract specifications per instrument
// dollarPerPoint: how much $1 price movement is worth per 1.0 standard lot
// minSL: minimum realistic stop loss distance in price terms
export const CONTRACT_SPECS: Record<string, { dollarPerPoint: number; minSL: number }> = {
  'XAU/USD': { dollarPerPoint: 100, minSL: 3.0 },
  'EUR/USD': { dollarPerPoint: 100000, minSL: 0.0008 },
  'GBP/USD': { dollarPerPoint: 100000, minSL: 0.0010 },
  'USD/JPY': { dollarPerPoint: 1000, minSL: 0.08 },
  'BTC/USD': { dollarPerPoint: 1, minSL: 200 },
  'ETH/USD': { dollarPerPoint: 1, minSL: 12 },
  'QQQ':     { dollarPerPoint: 100, minSL: 1.0 },       // ETF: ~$100/share, 100 shares/lot
  'DIA':     { dollarPerPoint: 100, minSL: 1.0 },
  'SPY':     { dollarPerPoint: 100, minSL: 1.0 },
  'USO':     { dollarPerPoint: 100, minSL: 0.3 },
};

// ── Position Sizing ────────────────────────────────────────

export function calculateRiskParams(
  price: number,
  atr: number | null,
  direction: 'BUY' | 'SELL',
  accountBalance: number = 10000,
  riskPercent: number = 1.5,
  symbol: string = 'XAU/USD',
  tpMode: 'quick_scalp' | 'dynamic_atr' = 'quick_scalp',
  customTpDist?: number
) {
  let spec = CONTRACT_SPECS[symbol];
  if (!spec) {
    if (isStockSymbol(symbol)) {
      spec = { dollarPerPoint: 100, minSL: 0.5 };
    } else if (isForexSymbol(symbol)) {
      spec = symbol.toUpperCase().includes('JPY')
        ? { dollarPerPoint: 1000, minSL: 0.08 }
        : { dollarPerPoint: 100000, minSL: 0.0008 };
    } else {
      spec = CONTRACT_SPECS['XAU/USD'];
    }
  }

  // Use ATR for SL distance, but enforce a minimum realistic distance
  const atrBasedSL = (atr || price * 0.005) * 1.5;
  const slDistance = Math.max(atrBasedSL, spec.minSL);

  // Compute TP Distance: quick_scalp mode uses tight intraday targets ($10 on Gold) for fast execution
  let tpDistance: number;
  if (customTpDist && customTpDist > 0) {
    tpDistance = customTpDist;
  } else if (tpMode === 'quick_scalp') {
    const s = symbol.toUpperCase();
    if (s.includes('XAU') || s.includes('GOLD')) {
      tpDistance = 10.0; // Strict $10 TP move on Gold for fast intraday capture!
    } else if (s.includes('EUR') || s.includes('GBP')) {
      tpDistance = 0.0015; // 15 pips quick scalp on Forex
    } else if (s.includes('JPY')) {
      tpDistance = 0.25; // 25 pips on JPY pairs
    } else if (s.includes('BTC')) {
      tpDistance = 400.0; // $400 move on Bitcoin
    } else {
      tpDistance = Math.min(slDistance * 1.2, 10.0);
    }
  } else {
    tpDistance = slDistance * 2.5; // Dynamic 1:2.5 ATR trend mode
  }

  const sl = direction === 'BUY' ? (price - slDistance) : (price + slDistance);
  const tp = direction === 'BUY' ? (price + tpDistance) : (price - tpDistance);

  // Position sizing: Risk$ / (SL distance × $ per point per lot)
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerLot = slDistance * spec.dollarPerPoint;
  const rawLotSize = riskAmount / riskPerLot;
  // Floor to 0.01 lot step resolution so actual risk is strictly <= riskAmount (Risk < target cap)
  const lotSize = Math.max(0.01, Math.min(50.0, Math.floor(rawLotSize * 100) / 100));

  // Margin at ~100:1 leverage approximation
  const notionalValue = price * spec.dollarPerPoint * lotSize / (symbol.includes('USD') ? 1 : 100);
  const margin = notionalValue * 0.01;

  // Dynamic precision for formatting SL / TP
  const precision = price < 10 ? 5 : (symbol.toUpperCase().includes('JPY') ? 3 : 2);

  const slStr = sl.toFixed(precision);
  const tpStr = tp.toFixed(precision);

  // Use actual rounded distance between entry price and rounded SL/TP so displayed risk/profit math matches 100%
  const actualSlDist = Math.abs(price - parseFloat(slStr));
  const actualTpDist = Math.abs(parseFloat(tpStr) - price);

  const projectedRisk = lotSize * actualSlDist * spec.dollarPerPoint;
  const projectedProfit = lotSize * actualTpDist * spec.dollarPerPoint;
  const rrRatio = `1 : ${(actualTpDist / (actualSlDist || 1)).toFixed(1)}`;

  return {
    stopLoss: slStr,
    takeProfit: tpStr,
    lotVolume: `${lotSize.toFixed(2)} Lots`,
    margin: margin.toFixed(2),
    risk: projectedRisk.toFixed(2),
    profit: projectedProfit.toFixed(2),
    rrRatio,
  };
}

// ── Gating Types ──────────────────────────────────────────

export type SignalOutcome = 'SIGNAL' | 'WATCH' | 'NO_TRADE' | 'SHADOW';

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
  // Phase C additions
  vwap: VWAPResult;
  mtfBias: MTFBias;
  candlePatterns: PatternResult;
  kellySizing: KellyResult;
  // Phase D additions

  // Phase E: Risk Management (Gates 13–15)
  riskGates?: GateResult[];
  riskMultipliers?: RiskMultipliers;
  riskSummary?: string;
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

async function fetchRSI(symbol: string, interval: string = '15m'): Promise<number | null> {
  const data = await fetchJSON('/rsi', { symbol, interval, time_period: '14' });
  return data?.values?.[0]?.rsi ? parseFloat(data.values[0].rsi) : null;
}

async function fetchMACD(symbol: string, interval: string = '15m') {
  const data = await fetchJSON('/macd', { symbol, interval });
  if (!data?.values?.[0]) return null;
  const v = data.values[0];
  return {
    macd: parseFloat(v.macd),
    signal: parseFloat(v.macd_signal),
    histogram: parseFloat(v.macd_hist),
  };
}

async function fetchEMA(symbol: string, period: string, interval: string = '15m'): Promise<number | null> {
  const data = await fetchJSON('/ema', { symbol, interval, time_period: period });
  return data?.values?.[0]?.ema ? parseFloat(data.values[0].ema) : null;
}

async function fetchBBands(symbol: string, interval: string = '15m') {
  const data = await fetchJSON('/bbands', { symbol, interval, time_period: '20' });
  if (!data?.values?.[0]) return null;
  const v = data.values[0];
  return {
    upper: parseFloat(v.upper_band),
    middle: parseFloat(v.middle_band),
    lower: parseFloat(v.lower_band),
  };
}

async function fetchATR(symbol: string, interval: string = '15m'): Promise<number | null> {
  const data = await fetchJSON('/atr', { symbol, interval, time_period: '14' });
  return data?.values?.[0]?.atr ? parseFloat(data.values[0].atr) : null;
}

async function fetchStoch(symbol: string, interval: string = '15m') {
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
  // Check 1H RSI for higher timeframe directional bias
  const rsi1h = await fetchRSI(symbol, '1h');
  if (rsi1h === null) return 'neutral';
  if (rsi1h < 45) return 'bearish';
  if (rsi1h > 55) return 'bullish';
  return 'neutral';
}

// ── Confluence Scoring Engine ──────────────────────────────

export interface IndicatorSignal {
  name: string;
  weight: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  detail: string;
}

export function scoreIndicators(
  price: number,
  rsi: number | null,
  macd: { macd: number; signal: number; histogram: number } | null,
  ema20: number | null,
  ema50: number | null,
  ema200: number | null,
  bbands: { upper: number; middle: number; lower: number; width?: number; percentB?: number } | null,
  stoch: { k: number; d: number } | null,
  htfBias: 'bullish' | 'bearish' | 'neutral',
  // Phase C optional additions
  vwap?: { signal: 'bullish' | 'bearish' | 'neutral'; detail: string; weight: number } | null,
  mtf?: { signal: 'bullish' | 'bearish' | 'neutral'; detail: string; weight: number } | null,
  pattern?: { signal: 'bullish' | 'bearish' | 'neutral'; detail: string; weight: number } | null,
  // Phase D: Adaptive context
  atrRatio?: number | null,
  prevHistogram?: number | null,
): { score: number; direction: 'BUY' | 'SELL' | 'NEUTRAL'; signals: IndicatorSignal[] } {
  const signals: IndicatorSignal[] = [];
  const volRegime = (atrRatio ?? 1);

  // 1. RSI (15%) — FIXED: Adaptive thresholds based on ATR regime
  if (rsi !== null) {
    // Trending market (ATR ratio > 1.5): widen neutral zone to avoid false counter-trend signals
    // Ranging market (ATR ratio < 0.7): tighten thresholds, require stronger extremes
    const bullThreshold = volRegime > 1.5 ? 40 : volRegime < 0.7 ? 30 : 35;
    const bearThreshold = volRegime > 1.5 ? 60 : volRegime < 0.7 ? 70 : 65;

    if (rsi < bullThreshold) {
      signals.push({ name: 'RSI(14)', weight: 15, direction: 'bullish', detail: `${rsi.toFixed(1)} — Oversold (threshold: ${bullThreshold}, ATR regime: ${volRegime.toFixed(2)})` });
    } else if (rsi > bearThreshold) {
      signals.push({ name: 'RSI(14)', weight: 15, direction: 'bearish', detail: `${rsi.toFixed(1)} — Overbought (threshold: ${bearThreshold}, ATR regime: ${volRegime.toFixed(2)})` });
    } else {
      signals.push({ name: 'RSI(14)', weight: 15, direction: 'neutral', detail: `${rsi.toFixed(1)} — Neutral (adaptive zone ${bullThreshold}–${bearThreshold})` });
    }
  }

  // 2. MACD (20%) — FIXED: Histogram momentum check (expanding = strong, contracting = weak)
  if (macd !== null) {
    const histExpanding = prevHistogram !== null && prevHistogram !== undefined
      ? (macd.histogram > 0 ? macd.histogram > prevHistogram : macd.histogram < prevHistogram)
      : true; // If no previous data, assume momentum is fine
    const aboveZero = macd.macd > 0;

    if (macd.histogram > 0 && macd.macd > macd.signal && histExpanding) {
      signals.push({ name: 'MACD', weight: 20, direction: 'bullish', detail: `Bullish crossover + expanding histogram +${macd.histogram.toFixed(4)}${aboveZero ? ' (above zero)' : ''}` });
    } else if (macd.histogram < 0 && macd.macd < macd.signal && histExpanding) {
      signals.push({ name: 'MACD', weight: 20, direction: 'bearish', detail: `Bearish crossover + expanding histogram ${macd.histogram.toFixed(4)}${!aboveZero ? ' (below zero)' : ''}` });
    } else if (macd.histogram > 0 && macd.macd > macd.signal) {
      // Crossover present but histogram contracting — weak signal, still directional
      signals.push({ name: 'MACD', weight: 20, direction: 'bullish', detail: `Bullish crossover but momentum fading (histogram contracting)` });
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
      signals.push({ name: 'MACD', weight: 20, direction: 'bearish', detail: `Bearish crossover but momentum fading (histogram contracting)` });
    } else {
      signals.push({ name: 'MACD', weight: 20, direction: 'neutral', detail: 'No clear crossover' });
    }
  }

  // 3. EMA Alignment (20%) — FIXED: Allows pullback touches with 0.3% tolerance
  if (ema20 !== null && ema50 !== null) {
    const pctFromEma20 = ((price - ema20) / ema20) * 100;
    const nearEma20 = Math.abs(pctFromEma20) < 0.3; // Within 0.3% counts as "at" EMA20

    if (ema200 !== null) {
      // Full stack available — use tolerance-based alignment
      const bullishStack = (price > ema20 || nearEma20) && ema20 > ema50 && ema50 > ema200;
      const bearishStack = (price < ema20 || nearEma20) && ema20 < ema50 && ema50 < ema200;
      // Partial alignment: price above EMA50 and EMA50 above EMA200 (pullback to EMA20)
      const partialBull = price > ema50 && ema50 > ema200 && nearEma20;
      const partialBear = price < ema50 && ema50 < ema200 && nearEma20;

      if (bullishStack) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bullish', detail: `Price > EMA20 > EMA50 > EMA200 — Bullish alignment` });
      } else if (bearishStack) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bearish', detail: `Price < EMA20 < EMA50 < EMA200 — Bearish alignment` });
      } else if (partialBull) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bullish', detail: `Pullback to EMA20 in uptrend (${pctFromEma20.toFixed(2)}% from EMA20)` });
      } else if (partialBear) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bearish', detail: `Pullback to EMA20 in downtrend (${pctFromEma20.toFixed(2)}% from EMA20)` });
      } else {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'neutral', detail: 'Mixed EMA alignment — no trend conviction' });
      }
    } else {
      // No EMA200 — use EMA20/50 pair
      if (price > ema20 && ema20 > ema50) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bullish', detail: `Price > EMA20 > EMA50 — Bullish (no EMA200 data)` });
      } else if (price < ema20 && ema20 < ema50) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bearish', detail: `Price < EMA20 < EMA50 — Bearish (no EMA200 data)` });
      } else if (nearEma20 && price > ema50) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bullish', detail: `Pullback to EMA20 (${pctFromEma20.toFixed(2)}%), above EMA50` });
      } else if (nearEma20 && price < ema50) {
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'bearish', detail: `Pullback to EMA20 (${pctFromEma20.toFixed(2)}%), below EMA50` });
      } else {
        const pctFromEma50 = ((price - ema50) / ema50) * 100;
        signals.push({ name: 'EMA Stack', weight: 20, direction: 'neutral', detail: `Mixed alignment (${pctFromEma50.toFixed(2)}% from EMA50)` });
      }
    }
  } else if (ema50 !== null) {
    // Fallback: single EMA50 trend filter
    const pctFromEma = ((price - ema50) / ema50) * 100;
    if (pctFromEma > 0.15) {
      signals.push({ name: 'EMA(50)', weight: 20, direction: 'bullish', detail: `Price ${pctFromEma.toFixed(2)}% above EMA50 — uptrend` });
    } else if (pctFromEma < -0.15) {
      signals.push({ name: 'EMA(50)', weight: 20, direction: 'bearish', detail: `Price ${Math.abs(pctFromEma).toFixed(2)}% below EMA50 — downtrend` });
    } else {
      signals.push({ name: 'EMA(50)', weight: 20, direction: 'neutral', detail: `Price within 0.15% of EMA50 — consolidating` });
    }
  }

  // 4. Bollinger Bands (15%) — FIXED: %B + Band Width logic instead of naive mean-reversion
  if (bbands !== null) {
    const percentB = bbands.percentB ?? ((price - bbands.lower) / ((bbands.upper - bbands.lower) || 1));
    const bWidth = bbands.width ?? ((bbands.upper - bbands.lower) / bbands.middle);
    const bandExpanding = bWidth > 0.02; // Normalized width > 2% = breakout regime

    if (bandExpanding) {
      // BREAKOUT regime: Band Walk is trend continuation, NOT reversal
      if (percentB > 0.8) {
        signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'bullish', detail: `Band Walk — %B=${(percentB*100).toFixed(0)}%, expanding bands (trend continuation UP)` });
      } else if (percentB < 0.2) {
        signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'bearish', detail: `Band Walk — %B=${(percentB*100).toFixed(0)}%, expanding bands (trend continuation DOWN)` });
      } else {
        signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'neutral', detail: `%B=${(percentB*100).toFixed(0)}%, bands expanding (width: ${(bWidth*100).toFixed(1)}%)` });
      }
    } else {
      // SQUEEZE/RANGE regime: mean-reversion logic applies
      if (percentB < 0.15) {
        signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'bullish', detail: `Squeeze — %B=${(percentB*100).toFixed(0)}%, near lower band (mean-reversion bounce)` });
      } else if (percentB > 0.85) {
        signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'bearish', detail: `Squeeze — %B=${(percentB*100).toFixed(0)}%, near upper band (mean-reversion rejection)` });
      } else {
        signals.push({ name: 'Bollinger Bands', weight: 15, direction: 'neutral', detail: `Squeeze — %B=${(percentB*100).toFixed(0)}%, mid-range (width: ${(bWidth*100).toFixed(1)}%)` });
      }
    }
  }

  // 5. Stochastic (10%) — FIXED: Confirmation filter, not signal generator
  //    Confirms if there's "room to run" in the primary direction
  if (stoch !== null) {
    // Determine primary direction from accumulated signals so far
    let primaryBull = 0;
    let primaryBear = 0;
    for (const s of signals) {
      if (s.direction === 'bullish') primaryBull += s.weight;
      if (s.direction === 'bearish') primaryBear += s.weight;
    }
    const primaryDir = primaryBull > primaryBear ? 'bullish' : primaryBear > primaryBull ? 'bearish' : 'neutral';

    if (primaryDir === 'bullish') {
      if (stoch.k < 50) {
        signals.push({ name: 'Stochastic', weight: 10, direction: 'bullish', detail: `%K=${stoch.k.toFixed(1)} — Room to run upward (confirms bullish)` });
      } else if (stoch.k > 80) {
        signals.push({ name: 'Stochastic', weight: 10, direction: 'bearish', detail: `%K=${stoch.k.toFixed(1)} — Overbought (conflicts with bullish signal)` });
      } else {
        signals.push({ name: 'Stochastic', weight: 10, direction: 'neutral', detail: `%K=${stoch.k.toFixed(1)} — Mid-range, no confirmation` });
      }
    } else if (primaryDir === 'bearish') {
      if (stoch.k > 50) {
        signals.push({ name: 'Stochastic', weight: 10, direction: 'bearish', detail: `%K=${stoch.k.toFixed(1)} — Room to fall (confirms bearish)` });
      } else if (stoch.k < 20) {
        signals.push({ name: 'Stochastic', weight: 10, direction: 'bullish', detail: `%K=${stoch.k.toFixed(1)} — Oversold (conflicts with bearish signal)` });
      } else {
        signals.push({ name: 'Stochastic', weight: 10, direction: 'neutral', detail: `%K=${stoch.k.toFixed(1)} — Mid-range, no confirmation` });
      }
    } else {
      signals.push({ name: 'Stochastic', weight: 10, direction: 'neutral', detail: `%K=${stoch.k.toFixed(1)}, %D=${stoch.d.toFixed(1)} — No primary direction to confirm` });
    }
  }

  // 6. Multi-Timeframe Alignment (15% — reduced since MTF has its own gate now)
  if (htfBias !== 'neutral') {
    signals.push({ name: '1H Timeframe Bias', weight: 15, direction: htfBias, detail: `1H RSI confirms ${htfBias} bias` });
  } else {
    signals.push({ name: '1H Timeframe Bias', weight: 15, direction: 'neutral', detail: '1H timeframe shows no directional conviction' });
  }

  // 7. VWAP (C1 — 15%)
  if (vwap && vwap.signal !== 'neutral') {
    signals.push({ name: 'VWAP', weight: vwap.weight, direction: vwap.signal, detail: vwap.detail });
  } else if (vwap) {
    signals.push({ name: 'VWAP', weight: vwap.weight, direction: 'neutral', detail: vwap.detail });
  }

  // 8. MTF Stack (C2 — 20%)
  if (mtf && mtf.signal !== 'neutral') {
    signals.push({ name: 'MTF Stack', weight: mtf.weight, direction: mtf.signal, detail: mtf.detail });
  } else if (mtf) {
    signals.push({ name: 'MTF Stack', weight: mtf.weight, direction: 'neutral', detail: mtf.detail });
  }

  // 9. Candle Patterns (C3 — 10%)
  if (pattern && pattern.signal !== 'neutral') {
    signals.push({ name: 'Candle Pattern', weight: pattern.weight, direction: pattern.signal, detail: pattern.detail });
  } else if (pattern) {
    signals.push({ name: 'Candle Pattern', weight: pattern.weight, direction: 'neutral', detail: pattern.detail });
  }

  // Calculate weighted confluence
  // Only use directional (non-neutral) weight in denominator so neutral
  // indicators don't dilute the score when data is partial.
  let bullishScore = 0;
  let bearishScore = 0;
  let directionalWeight = 0;

  for (const sig of signals) {
    if (sig.direction === 'bullish') { bullishScore += sig.weight; directionalWeight += sig.weight; }
    else if (sig.direction === 'bearish') { bearishScore += sig.weight; directionalWeight += sig.weight; }
    // neutral signals don't add to denominator
  }

  const maxScore = Math.max(bullishScore, bearishScore);
  // If no directional signal at all, fall back to total weight to avoid NaN
  const denominator = directionalWeight > 0 ? directionalWeight : signals.reduce((s, sig) => s + sig.weight, 0);
  const confluencePercent = denominator > 0 ? Math.round((maxScore / denominator) * 100) : 0;
  const direction = bullishScore > bearishScore ? 'BUY' : bearishScore > bullishScore ? 'SELL' : 'NEUTRAL';

  return { score: confluencePercent, direction, signals };
}

function gradeConfidence(score: number): 'AAA' | 'AA' | 'A' | 'BBB' {
  if (score >= 90) return 'AAA';
  if (score >= 80) return 'AA';
  if (score >= 70) return 'A';
  return 'BBB';
}


// ── Kill Zone Session Filter ──────────────────────────────
// FIXED: Replaced broad session windows with institutional Kill Zones.
// Grade A = highest probability windows (London Open, NY Open)
// Grade B = decent windows (Asian, London Close)
// Grade C = low probability (mid-session, off-hours)

type KillZoneQuality = 'A' | 'B' | 'C';

interface KillZoneInfo {
  zone: string;
  quality: KillZoneQuality;
  session: string;
}

const SYMBOL_SESSIONS: Record<string, string[]> = {
  'XAU/USD': ['london_open', 'ny_open', 'london_close'],
  'EUR/USD': ['london_open', 'ny_open', 'london_close'],
  'GBP/USD': ['london_open', 'ny_open', 'london_close'],
  'USD/JPY': ['asian', 'london_open', 'ny_open'],
  'BTC/USD': ['any'],
  'ETH/USD': ['any'],
  'QQQ':     ['ny_open', 'ny_mid'],
  'DIA':     ['ny_open', 'ny_mid'],
  'SPY':     ['ny_open', 'ny_mid'],
  'USO':     ['ny_open', 'ny_mid'],
};

function getKillZone(): KillZoneInfo {
  const utcHour = new Date().getUTCHours();
  const utcMin = new Date().getUTCMinutes();
  const time = utcHour + utcMin / 60;

  if (time >= 7.0 && time < 9.0)  return { zone: 'london_open',  quality: 'A', session: 'London Open Kill Zone (07:00–09:00 UTC)' };
  if (time >= 12.0 && time < 14.0) return { zone: 'ny_open',      quality: 'A', session: 'New York Open Kill Zone (12:00–14:00 UTC)' };
  if (time >= 15.0 && time < 16.0) return { zone: 'london_close', quality: 'B', session: 'London Close (15:00–16:00 UTC)' };
  if (time >= 0.0 && time < 3.0)   return { zone: 'asian',        quality: 'B', session: 'Asian Kill Zone (00:00–03:00 UTC)' };
  if (time >= 9.0 && time < 12.0)  return { zone: 'london_mid',   quality: 'C', session: 'London Mid-Session (09:00–12:00 UTC)' };
  if (time >= 14.0 && time < 15.0) return { zone: 'ny_mid',       quality: 'C', session: 'NY Mid-Session (14:00–15:00 UTC)' };
  if (time >= 16.0 && time < 21.0) return { zone: 'ny_late',      quality: 'C', session: 'NY Late Session (16:00–21:00 UTC)' };
  if (time >= 3.0 && time < 7.0)   return { zone: 'asian_late',   quality: 'C', session: 'Asian Late / Pre-London (03:00–07:00 UTC)' };
  return { zone: 'off_hours', quality: 'C', session: 'Off-Hours (21:00–00:00 UTC)' };
}

function isOptimalSession(symbol: string): { ok: boolean; session: string; detail: string; killZoneQuality: KillZoneQuality } {
  const kz = getKillZone();
  const allowedZones = SYMBOL_SESSIONS[symbol] || (isStockSymbol(symbol) ? ['ny_open', 'ny_mid'] : ['any']);

  if (allowedZones.includes('any')) {
    return { ok: true, session: kz.session, detail: `${kz.session} (24h asset, grade ${kz.quality})`, killZoneQuality: kz.quality };
  }

  const inKillZone = allowedZones.includes(kz.zone);
  if (inKillZone && kz.quality === 'A') {
    return { ok: true, session: kz.session, detail: `🟢 ${kz.session} — Grade A kill zone (highest probability)`, killZoneQuality: 'A' };
  } else if (inKillZone && kz.quality === 'B') {
    return { ok: true, session: kz.session, detail: `🟡 ${kz.session} — Grade B window (good probability)`, killZoneQuality: 'B' };
  } else if (inKillZone) {
    return { ok: true, session: kz.session, detail: `⚪ ${kz.session} — Grade C window (reduced probability)`, killZoneQuality: 'C' };
  } else {
    return { ok: false, session: kz.session, detail: `🔴 ${kz.session} — Outside kill zones for ${symbol}`, killZoneQuality: kz.quality };
  }
}

// ── Volatility Filter ──────────────────────────────────────

function checkVolatility(
  candles: { high: number; low: number; close: number }[],
  minVal = 0.5,
  maxVal = 2.5
): { ok: boolean; ratio: number; detail: string } {
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
  if (ratio < minVal) return { ok: false, ratio, detail: `ATR ratio ${ratio.toFixed(2)} — dead market (need ≥${minVal})` };
  if (ratio > maxVal) return { ok: false, ratio, detail: `ATR ratio ${ratio.toFixed(2)} — extreme volatility (need ≤${maxVal})` };
  return { ok: true, ratio, detail: `ATR ratio ${ratio.toFixed(2)} — normal volatility` };
}

// ── Signal Cooldown ────────────────────────────────────────

const COOLDOWN_MAP = new Map<string, number>();

function checkCooldown(symbol: string, cooldownMins = 60): { ok: boolean; detail: string } {
  const lastSignal = COOLDOWN_MAP.get(symbol);
  if (!lastSignal) return { ok: true, detail: 'No recent signal' };
  const elapsed = Date.now() - lastSignal;
  const cooldownMs = cooldownMins * 60 * 1000;
  if (elapsed < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
    return { ok: false, detail: `Cooldown active — ${remaining} min remaining` };
  }
  return { ok: true, detail: 'Cooldown expired' };
}

export function markSignalFired(symbol: string) {
  COOLDOWN_MAP.set(symbol, Date.now());
}

// ── Main Market Snapshot Assembler ─────────────────────────

export async function getMarketSnapshot(symbol: string): Promise<MarketSnapshot | null> {
  const cacheKey = `${symbol}:normal`;
  // Return cached result if still fresh
  const cached = SNAPSHOT_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[Market Engine] Cache hit for ${cacheKey} (expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
    return cached.snapshot;
  }

  try {
    console.log(`[Market Engine] Fetching parallel snapshot components for ${symbol}...`);

    // ── Prepare all concurrent network requests ──
    const candlesPromise = fetchCandles(symbol, '15m', 200);
    const htfBiasPromise = fetchHTFBias(symbol);
    const sentimentPromise = getNewsSentiment(symbol);
    const calendarPromise = checkEconomicCalendar(symbol);
    const mtfWeeklyPromise = fetchYahooCandles(symbol, '1wk').catch(() => []);
    const mtfDailyPromise = fetchYahooCandles(symbol, '1d').catch(() => []);

    // Get correlated tickers momentum candles
    const upperSym = symbol.toUpperCase();
    const correlationPairs = CORRELATION_MAP[symbol] || CORRELATION_MAP[upperSym] || [];
    const correlationCandlesPromises = correlationPairs.map(async (pair) => {
      let fetchSymbol = pair.symbol;
      if (pair.symbol === 'DX-Y.NYB') fetchSymbol = 'DX-Y.NYB';
      if (pair.symbol === 'ETH-USD') fetchSymbol = 'ETH/USD';
      if (pair.symbol === 'BTC-USD') fetchSymbol = 'BTC/USD';
      if (pair.symbol === 'EURUSD=X') fetchSymbol = 'EUR/USD';
      if (pair.symbol === 'GBPUSD=X') fetchSymbol = 'GBP/USD';
      const c = await fetchYahooCandles(fetchSymbol, '1h', 20).catch(() => []);
      return { key: pair.symbol, candles: c };
    });

    // Resolve all HTTP fetches in a single parallel thread pool execution!
    const [
      candles,
      htfBias,
      sentimentResult,
      calendarCheckResult,
      weeklyCandles,
      dailyCandles,
      corrCandlesArray
    ] = await Promise.all([
      candlesPromise,
      htfBiasPromise,
      sentimentPromise,
      calendarPromise,
      mtfWeeklyPromise,
      mtfDailyPromise,
      Promise.all(correlationCandlesPromises)
    ]);

    if (!candles || candles.length < 50) {
      console.error('[Market Engine] Not enough candle data — aborting snapshot');
      return null;
    }

    const corrCandlesMap: Record<string, any[]> = {};
    for (const item of corrCandlesArray) {
      corrCandlesMap[item.key] = item.candles;
    }

    // ── Compute indicators in-memory (instant) ──
    const results = computeIndicators(candles);
    if (!results || results.price === 0) {
      console.error('[Market Engine] Failed to compute indicators');
      return null;
    }

    const { price, rsi, macd, prevHistogram, ema20, ema50, ema200, atr, atrRatio, bbands, stoch } = results;
    console.log(`[Market Engine] Price: $${price}`);
    console.log(`[Market Engine] Indicators — RSI: ${rsi?.toFixed(1)}, MACD: ${macd ? 'ok' : 'null'}, EMA20: ${ema20?.toFixed(2)}, EMA50: ${ema50?.toFixed(2)}, EMA200: ${ema200?.toFixed(2) ?? 'N/A'}, ATR: ${atr?.toFixed(4)}, ATR Ratio: ${atrRatio?.toFixed(2)}`);
    if (bbands) console.log(`[Market Engine] BBands — Upper: ${bbands.upper.toFixed(2)}, Lower: ${bbands.lower.toFixed(2)}, %B: ${(bbands.percentB*100).toFixed(0)}%, Width: ${(bbands.width*100).toFixed(1)}%`);
    if (stoch) console.log(`[Market Engine] Stochastic — %K: ${stoch.k.toFixed(1)}, %D: ${stoch.d.toFixed(1)}`);

    // ── C1: VWAP (in-memory)
    const vwapResult = computeVWAP(candles, price);
    console.log(`[Market Engine] VWAP: ${vwapResult.vwap.toFixed(2)} | ${vwapResult.detail}`);

    // ── C2: MTF Bias (in-memory) — resolves instantly using pre-fetched candles
    const mtfResult = await getMTFBias(symbol, htfBias, weeklyCandles, dailyCandles);
    console.log(`[Market Engine] MTF: ${mtfResult.detail}`);

    // ── C3: Candlestick Patterns
    const patternResult = detectCandlePatterns(candles.slice(-3));
    if (patternResult.patterns.length > 0) {
      console.log(`[Market Engine] Patterns: ${patternResult.detail}`);
    }

    // ── C4: Kelly Sizer
    const kellyResult = await computeKellySizing(symbol, 10000, 0.02);
    console.log(`[Market Engine] Kelly: ${kellyResult.detail}`);

    // ── A3: Weighted Scoring (now includes all indicators + adaptive context) ─
    const macdForScorer = macd ? { macd: macd.value, signal: macd.signal, histogram: macd.histogram } : null;
    const bbandsForScorer = bbands ? { upper: bbands.upper, middle: bbands.middle, lower: bbands.lower, width: bbands.width, percentB: bbands.percentB } : null;
    const scoring = scoreIndicators(price, rsi, macdForScorer, ema20, ema50, ema200, bbandsForScorer, stoch, htfBias, vwapResult, mtfResult, patternResult, atrRatio, prevHistogram);
    const { score, direction, signals: indicatorSignals } = scoring;
    console.log(`[Market Engine] Weighted Confluence: ${score}% ${direction}`);
    console.log(`[Market Engine] Signals: ${indicatorSignals.map(s => `${s.name}:${s.direction}`).join(', ')}`);

    // ── A2: Wire SMC Scanner into Pipeline ────────────────
    const scanReport: ScanReport = fullScan(symbol, '15m', candles);
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
    // Load dynamic gating thresholds
    const gatingConfig = await getGatingConfig();

    const gates: GateResult[] = [];

    // Gate 1: Confluence
    gates.push({
      name: 'Confluence',
      passed: !gatingConfig.gate_confluence_enabled || score >= gatingConfig.gate_confluence_min_score,
      detail: gatingConfig.gate_confluence_enabled
        ? `${score}% (need ≥${gatingConfig.gate_confluence_min_score}%)`
        : `Bypassed (${score}%)`
    });

    // Gate 2: SMC Confirmation
    gates.push({
      name: 'SMC Confirmation',
      passed: !gatingConfig.gate_smc_enabled || smcConfirmations >= gatingConfig.gate_smc_min_confirmations,
      detail: gatingConfig.gate_smc_enabled
        ? `${smcConfirmations} pattern(s) (need ≥${gatingConfig.gate_smc_min_confirmations}): ${smcPatterns.join(', ') || 'none'}`
        : `Bypassed (${smcConfirmations} pattern(s))`
    });

    // Gate 3: HTF Alignment
    const htfAligned = htfBias === 'neutral' || (direction === 'BUY' && htfBias === 'bullish') || (direction === 'SELL' && htfBias === 'bearish');
    gates.push({
      name: 'Timeframe Alignment',
      passed: !gatingConfig.gate_htf_enabled || htfAligned,
      detail: gatingConfig.gate_htf_enabled ? `1H bias: ${htfBias}, Signal: ${direction}` : `Bypassed (${htfBias} bias)`
    });

    // Gate 4: Session Filter
    const sessionCheck = isOptimalSession(symbol);
    gates.push({
      name: 'Session Filter',
      passed: !gatingConfig.gate_session_enabled || sessionCheck.ok,
      detail: gatingConfig.gate_session_enabled ? sessionCheck.detail : `Bypassed (${sessionCheck.detail})`
    });

    // Gate 5: Volatility Normal
    const volCheck = checkVolatility(candles, gatingConfig.gate_volatility_min, gatingConfig.gate_volatility_max);
    gates.push({
      name: 'Volatility',
      passed: !gatingConfig.gate_volatility_enabled || volCheck.ok,
      detail: gatingConfig.gate_volatility_enabled ? volCheck.detail : `Bypassed (${volCheck.detail})`
    });

    // Gate 6: No Conflict
    const bullBear = indicatorSignals.reduce((acc, s) => {
      if (s.direction === 'bullish') acc.bull += s.weight;
      if (s.direction === 'bearish') acc.bear += s.weight;
      return acc;
    }, { bull: 0, bear: 0 });
    const totalW = bullBear.bull + bullBear.bear || 1;
    const spread = Math.abs(bullBear.bull - bullBear.bear) / totalW;
    gates.push({
      name: 'No Conflict',
      passed: !gatingConfig.gate_spread_enabled || spread > gatingConfig.gate_spread_min,
      detail: gatingConfig.gate_spread_enabled
        ? `Bull/Bear spread: ${(spread * 100).toFixed(0)}% (need >${(gatingConfig.gate_spread_min * 100).toFixed(0)}%)`
        : `Bypassed (${(spread * 100).toFixed(0)}% spread)`
    });

    // Gate 7: Cooldown
    const cooldownCheck = checkCooldown(symbol, gatingConfig.gate_cooldown_minutes);
    gates.push({
      name: 'Cooldown',
      passed: !gatingConfig.gate_cooldown_enabled || cooldownCheck.ok,
      detail: gatingConfig.gate_cooldown_enabled ? cooldownCheck.detail : 'Bypassed'
    });

    // Gate 8: Economic Calendar (B2) — block near high-impact events
    const calendarCheck = calendarCheckResult;
    gates.push({
      name: 'News Event',
      passed: !gatingConfig.gate_news_enabled || !calendarCheck.blocked,
      detail: gatingConfig.gate_news_enabled ? calendarCheck.reason : `Bypassed`
    });

    // Gate 9: Correlated Assets (B4) — check if related markets agree (in-memory)
    const correlationCheck = await checkCorrelation(symbol, direction, corrCandlesMap);
    gates.push({
      name: 'Correlation',
      passed: !gatingConfig.gate_correlation_enabled || correlationCheck.confirmed,
      detail: gatingConfig.gate_correlation_enabled ? correlationCheck.detail : `Bypassed (${correlationCheck.detail})`
    });

    // Gate 10: MTF Stack (C2) — at least 2/3 timeframes aligned
    gates.push({
      name: 'MTF Stack',
      passed: !gatingConfig.gate_mtf_enabled || mtfResult.aligned,
      detail: gatingConfig.gate_mtf_enabled ? mtfResult.detail : `Bypassed (${mtfResult.detail})`
    });

    // Gate 11: VWAP (C1) — price not at extreme band (overbought/oversold vs VWAP)
    const vwapGatePassed = vwapResult.signal !== 'neutral' || vwapResult.priceRelation === 'at';
    gates.push({
      name: 'VWAP',
      passed: !gatingConfig.gate_vwap_enabled || vwapGatePassed,
      detail: gatingConfig.gate_vwap_enabled ? vwapResult.detail : `Bypassed (${vwapResult.detail})`
    });

    // Gate 12: Candle Pattern (C3) — optional boost gate (passes if no conflicting pattern)
    const patternConflict = patternResult.signal !== 'neutral' && patternResult.signal !== direction.toLowerCase() as 'bullish' | 'bearish';
    gates.push({
      name: 'Candle Pattern',
      passed: !gatingConfig.gate_candle_enabled || !patternConflict,
      detail: gatingConfig.gate_candle_enabled ? patternResult.detail : `Bypassed (${patternResult.detail})`
    });



    // ── Determine Outcome ────────────────
    const passedCount = gates.filter(g => g.passed).length;
    const totalGates = gates.length;
    const criticalGates = ['News Event'];
    const criticalFailed = gates.filter(g => criticalGates.includes(g.name) && !g.passed);

    let signalOutcome: SignalOutcome;
    let outcomeReason: string;

    const confidenceGrade = gradeConfidence(score);

    if (criticalFailed.length > 0) {
      signalOutcome = 'NO_TRADE';
      outcomeReason = `Critical gate failed: ${criticalFailed.map(g => g.name).join(', ')}`;
    } else {
      // Standard 12-gate logic
      if (passedCount >= 8 || score >= 65) {
        signalOutcome = 'SIGNAL';
        outcomeReason = `${passedCount}/${totalGates} gates passed — ${score}% ${confidenceGrade} High-confluence setup`;
      } else if (passedCount >= 5 || score >= 50) {
        signalOutcome = 'SIGNAL';
        outcomeReason = `${passedCount}/${totalGates} gates passed — ${score}% ${confidenceGrade} Moderate-confidence setup`;
      } else {
        signalOutcome = 'NO_TRADE';
        outcomeReason = `Only ${passedCount}/${totalGates} gates passed — insufficient confluence`;
      }
    }

    console.log(`[Market Engine] Outcome: ${signalOutcome} — ${outcomeReason}`);

    // ── Phase E: Risk Management Gates 13–15 ────────────────
    // Fetch risk state from Supabase for the first connected broker
    let riskGatesArr: GateResult[] = [];
    let riskMults: RiskMultipliers | undefined;
    try {
      // Try to find an active account — use env var, or auto-detect from broker_accounts
      let accountId = process.env.PRIMARY_MT5_ACCOUNT || null;
      console.log(`[Risk Governor] ENV PRIMARY_MT5_ACCOUNT = ${accountId ?? 'not set'}`);

      if (!accountId) {
        // Auto-detect: query Supabase for the first connected broker account
        try {
          const { createClient: createSC } = await import('@/lib/supabase/server');
          const sb = createSC();
          const { data: accts, error: acctErr } = await sb.from('broker_accounts').select('mt5_login,equity,balance,user_id').limit(1).single();
          console.log(`[Risk Governor] Auto-detect query result:`, accts, acctErr?.message || 'no error');
          if (accts?.mt5_login) accountId = String(accts.mt5_login);
        } catch (detectErr: any) {
          console.warn(`[Risk Governor] Auto-detect failed: ${detectErr.message}`);
        }
      }

      console.log(`[Risk Governor] Resolved accountId = ${accountId ?? 'null'}`);

      if (accountId) {
        let riskState = await getRiskState(accountId);
        console.log(`[Risk Governor] getRiskState returned: ${riskState ? 'found' : 'null'}`);

        // Auto-create initial risk state if table exists but no row for this account
        if (!riskState) {
          try {
            const { createClient: createSC } = await import('@/lib/supabase/server');
            const sb = createSC();
            // Get broker equity/balance for the initial risk state
            const { data: broker } = await sb.from('broker_accounts').select('equity,balance,user_id').eq('mt5_login', accountId).single();
            const userId = broker?.user_id || 'system';
            const equity = Number(broker?.equity) || 10000;
            const balance = Number(broker?.balance) || 10000;
            console.log(`[Risk Governor] Auto-create with userId=${userId}, equity=${equity}, balance=${balance}`);
            const initial = createInitialRiskState(accountId, userId, equity, balance);
            await saveRiskState(initial);
            riskState = initial;
            console.log(`[Risk Governor] Auto-created initial risk state for account ${accountId}`);
          } catch (initErr: any) {
            console.warn(`[Risk Governor] Could not auto-create risk state: ${initErr.message}`);
          }
        }

        if (riskState) {
          const { multipliers, gates: rGates } = await evaluateAllRiskGates(riskState, kellyResult.tradeCount);
          riskMults = multipliers;
          riskGatesArr = rGates.map(g => ({
            name: g.gate,
            passed: g.passed,
            detail: g.detail,
          }));

          // Log risk state
          console.log(`[Risk Governor] ${multipliers.riskSummary}`);
          for (const g of rGates) {
            console.log(`[Risk Governor] ${g.gate}: ${g.passed ? '✅' : '❌'} ${g.detail}`);
          }

          // Override outcomes based on risk gates
          if (multipliers.shouldLiquidate) {
            signalOutcome = 'NO_TRADE';
            outcomeReason = `🚨 RISK GOVERNOR: ${multipliers.riskSummary}`;
          } else if (multipliers.shouldShadowTrade && signalOutcome === 'SIGNAL') {
            signalOutcome = 'SHADOW';
            outcomeReason = `📋 Equity Curve RED — signal logged as shadow trade | ${outcomeReason}`;
          } else if (multipliers.shouldHalt && signalOutcome === 'SIGNAL') {
            signalOutcome = 'NO_TRADE';
            outcomeReason = `⛔ Risk halt active — ${multipliers.riskSummary} | ${outcomeReason}`;
          }
        }
      } else {
        console.log(`[Risk Governor] No account found — skipping Gates 13–15`);
      }
    } catch (riskErr: any) {
      console.warn(`[Risk Governor] Skipped — ${riskErr.message}`);
    }

    let finalLots = kellyResult.recommendedLots;
    let finalDetail = kellyResult.detail;


    // Apply risk multipliers to Kelly sizing
    if (riskMults && riskMults.combinedMultiplier < 1.0) {
      const prevLots = finalLots;
      finalLots = Math.max(0.01, parseFloat((finalLots * riskMults.combinedMultiplier).toFixed(2)));
      finalDetail = `${finalDetail} | Risk adj x${riskMults.combinedMultiplier.toFixed(2)} → ${finalLots} lots`;
      if (prevLots !== finalLots) {
        console.log(`[Risk Governor] Kelly sizing: ${prevLots} → ${finalLots} lots (x${riskMults.combinedMultiplier.toFixed(2)})`);
      }
    }

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
      // Phase C additions
      vwap: vwapResult,
      mtfBias: mtfResult,
      candlePatterns: patternResult,
      kellySizing: {
        ...kellyResult,
        recommendedLots: finalLots,
        detail: finalDetail
      },
      // Phase E: Risk Management
      riskGates: riskGatesArr.length > 0 ? riskGatesArr : undefined,
      riskMultipliers: riskMults,
      riskSummary: riskMults?.riskSummary,
    };

    // Store in cache
    SNAPSHOT_CACHE.set(cacheKey, { snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS });

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
