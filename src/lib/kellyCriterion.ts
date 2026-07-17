/**
 * C4: Kelly Criterion Position Sizer
 * Computes optimal lot size per trade based on historical win/loss data
 * from the Supabase trade_log table.
 *
 * Formula: f* = (W × R - L) / (W × R)
 * Where:
 *   W = win rate (0–1)
 *   R = average win / average loss ratio
 *   L = loss rate (1 - W)
 *
 * Capped at 2% account risk (conservative institutional standard).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface KellyResult {
  recommendedLots: number;
  kellyFraction: number;       // raw Kelly % (uncapped)
  cappedFraction: number;      // capped at 2% risk
  winRate: number;             // from trade history
  avgWin: number;              // average winning trade $
  avgLoss: number;             // average losing trade $
  rewardRiskRatio: number;     // R ratio
  tradeCount: number;          // number of trades used
  confidence: 'high' | 'medium' | 'low'; // based on sample size
  detail: string;
}

const KELLY_CACHE = new Map<string, { result: KellyResult; expiresAt: number }>();
const KELLY_TTL = 10 * 60 * 1000; // 10 min cache

// Fallback defaults when no trade history exists
const DEFAULTS = {
  winRate: 0.50,
  avgWin: 100,
  avgLoss: 100,
  tradeCount: 0,
};

export async function computeKellySizing(
  symbol: string,
  accountBalance: number = 10000,
  maxRiskPct: number = 0.02   // 2% max account risk per trade
): Promise<KellyResult> {

  const cacheKey = `${symbol}:${Math.floor(accountBalance / 1000)}`;
  const cached = KELLY_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  let winRate = DEFAULTS.winRate;
  let avgWin = DEFAULTS.avgWin;
  let avgLoss = DEFAULTS.avgLoss;
  let tradeCount = DEFAULTS.tradeCount;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch last 100 closed trades for this symbol
    const { data, error } = await supabase
      .from('trade_log')
      .select('profit, deal_type')
      .eq('symbol', symbol)
      .not('profit', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length >= 10) {
      const trades = data.map((t: { profit: any }) => Number(t.profit));
      tradeCount = trades.length;

      const wins = trades.filter((p: number) => p > 0);
      const losses = trades.filter((p: number) => p < 0);

      winRate = wins.length / trades.length;
      avgWin = wins.length > 0 ? wins.reduce((a: number, b: number) => a + b, 0) / wins.length : 100;
      avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a: number, b: number) => a + b, 0) / losses.length) : 100;
    }
  } catch (err) {
    console.warn('[Kelly] Supabase fetch failed — using defaults:', err);
  }

  // Kelly formula
  const R = avgLoss > 0 ? avgWin / avgLoss : 1;
  const lossRate = 1 - winRate;
  const kellyFraction = winRate - lossRate / R;
  const cappedFraction = Math.max(0, Math.min(maxRiskPct, kellyFraction));

  // Convert risk fraction to lot size
  // Rough approximation: 1 lot XAUUSD ≈ $100/pip × ATR pips of risk
  // We use a simplified: lots = (balance × riskPct) / (avgLoss per lot)
  const riskAmount = accountBalance * cappedFraction;
  const estimatedLossPerStandardLot = avgLoss > 0 ? avgLoss : 50;
  let recommendedLots = Math.round((riskAmount / estimatedLossPerStandardLot) * 100) / 100;
  recommendedLots = Math.max(0.01, Math.min(5.0, recommendedLots)); // clamp 0.01–5.0

  const rewardRiskRatio = R;
  const confidence: 'high' | 'medium' | 'low' =
    tradeCount >= 50 ? 'high' : tradeCount >= 20 ? 'medium' : 'low';

  const detail = tradeCount >= 10
    ? `Kelly ${(kellyFraction * 100).toFixed(1)}% → capped ${(cappedFraction * 100).toFixed(1)}% risk | WR ${(winRate * 100).toFixed(0)}% · R:R ${R.toFixed(2)} (${tradeCount} trades)`
    : `Insufficient trade history — using conservative defaults (${tradeCount} trades)`;

  const result: KellyResult = {
    recommendedLots,
    kellyFraction,
    cappedFraction,
    winRate,
    avgWin,
    avgLoss,
    rewardRiskRatio,
    tradeCount,
    confidence,
    detail,
  };

  KELLY_CACHE.set(cacheKey, { result, expiresAt: Date.now() + KELLY_TTL });
  return result;
}
