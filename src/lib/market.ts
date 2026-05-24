import { spawn } from 'child_process';
import path from 'path';

const BASE_URL = 'https://api.twelvedata.com';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

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

export async function computeIndicatorsWithPython(candles: CandleData[]): Promise<any> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), 'src/lib/indicators.py');
      const pythonPath = path.join(process.cwd(), 'venv/bin/python3');
      
      const child = spawn(pythonPath, [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code !== 0) {
          console.error('[Indicator Engine] Python script failed with code', code, stderr);
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          console.error('[Indicator Engine] Failed to parse Python output:', err, stdout);
          resolve(null);
        }
      });
      
      child.stdin.write(JSON.stringify(candles));
      child.stdin.end();
    } catch (error) {
      console.error('[Indicator Engine] Failed to spawn Python:', error);
      resolve(null);
    }
  });
}

// ── Main Market Snapshot Assembler ─────────────────────────

export async function getMarketSnapshot(symbol: string): Promise<MarketSnapshot | null> {
  try {
    console.log(`[Market Engine] Fetching snapshot for ${symbol}...`);

    // Fetch candles (only 1 Twelve Data API call needed, instead of 5!)
    const candles = await fetchCandles(symbol, '1h', 80);
    if (candles.length < 50) {
      console.error('[Market Engine] Not enough candle data — aborting snapshot');
      return null;
    }

    // Precompute indicators server-side using Python indicator engine
    const results = await computeIndicatorsWithPython(candles);
    if (!results || results.price === 0) {
      console.error('[Market Engine] Failed to compute indicators via Python');
      return null;
    }

    const { price, rsi, macd, ema50, atr } = results;
    console.log(`[Market Engine] Price: $${price}`);
    console.log(`[Market Engine] Indicators — RSI: ${rsi}, MACD: ${macd ? 'ok' : 'null'}, EMA50: ${ema50}, ATR: ${atr}`);

    // Directional bias using calculated indicators
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

// ── Candle Data for Mini Charts ────────────────────────────

export async function fetchCandles(symbol: string, interval: string = '1h', outputsize: number = 50): Promise<CandleData[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${getApiKey()}`
    );
    const data = await res.json();

    if (data.status === 'error' || !data.values) {
      console.error(`[Market Engine] /time_series error:`, data.message || 'unknown');
      return [];
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
    console.error('[Market Engine] Failed to fetch candles:', error);
    return [];
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
