/**
 * Risk Analytics — VaR / CVaR / Monte Carlo Ruin Probability
 *
 * Pure computation module implementing institutional-grade risk metrics:
 *
 * 1. Value-at-Risk (3 methods, take conservative max):
 *    - Historical VaR (5th percentile of past returns)
 *    - Parametric VaR (normal distribution: μ - z·σ)
 *    - Monte Carlo VaR (10K bootstrapped simulations)
 *
 * 2. CVaR / Expected Shortfall:
 *    - Average loss exceeding VaR threshold
 *
 * 3. Monte Carlo Ruin Probability:
 *    - 10,000 equity paths × 500 trades
 *    - Probability of hitting max drawdown (25%)
 *
 * All functions are pure (input → output) for testability.
 */

// ── Types ────────────────────────────────────────────────────

export interface DailyReturn {
  date: string;
  returnPct: number;  // Daily return as percentage (-2.5 means -2.5%)
  pnl: number;        // Absolute P&L in account currency
}

export interface VaRResult {
  historicalVaR95: number;     // % loss (positive number = loss)
  parametricVaR95: number;
  monteCarloVaR95: number;
  varFinal95: number;          // max of all 3 methods

  historicalVaR99: number;
  parametricVaR99: number;
  monteCarloVaR99: number;
  varFinal99: number;

  cvar95: number;              // Expected Shortfall at 95%
  cvar99: number;              // Expected Shortfall at 99%

  varDollar95: number;         // VaR in dollar terms
  varDollar99: number;
  cvarDollar95: number;
  cvarDollar99: number;

  dataPoints: number;          // Number of daily returns used
  method: string;              // Which method was most conservative
  computedAt: string;
}

export interface MonteCarloResult {
  ruinProbability: number;     // P(hitting max drawdown) as 0-1 fraction
  ruinProbabilityPct: string;  // Formatted as "3.2%"
  assessment: string;          // "Excellent" | "Good" | "Concerning" | "Dangerous" | "Unacceptable"
  medianFinalEquity: number;
  percentile5Equity: number;   // 5th percentile (worst case)
  percentile95Equity: number;  // 95th percentile (best case)
  maxDrawdownMedian: number;   // Median max drawdown across all paths
  paths: number;               // Number of simulation paths
  tradesPerPath: number;
  parameters: {
    winRate: number;
    avgRewardRisk: number;
    riskPerTrade: number;
    maxDrawdownLimit: number;
  };
  computedAt: string;
}

// ── Statistical Helpers ──────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const frac = index - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

// Z-scores for normal distribution
const Z_95 = 1.6449;  // 95th percentile
const Z_99 = 2.3263;  // 99th percentile

// ── Seeded PRNG (deterministic for reproducibility) ──────────

function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── VaR Computation ──────────────────────────────────────────

/**
 * Compute VaR and CVaR from an array of daily return percentages.
 * Returns positive numbers = potential loss.
 */
export function computeVaR(
  dailyReturns: number[],
  currentEquity: number,
  seed: number = 42,
): VaRResult {
  const n = dailyReturns.length;
  const now = new Date().toISOString();

  if (n < 10) {
    // Not enough data for meaningful VaR
    return {
      historicalVaR95: 0, parametricVaR95: 0, monteCarloVaR95: 0, varFinal95: 0,
      historicalVaR99: 0, parametricVaR99: 0, monteCarloVaR99: 0, varFinal99: 0,
      cvar95: 0, cvar99: 0,
      varDollar95: 0, varDollar99: 0, cvarDollar95: 0, cvarDollar99: 0,
      dataPoints: n, method: 'insufficient_data', computedAt: now,
    };
  }

  // Sort returns ascending (worst first)
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const mu = mean(dailyReturns);
  const sigma = stddev(dailyReturns);

  // ── Method 1: Historical VaR ──
  const histVaR95 = -percentile(sorted, 5);   // Negate: positive = loss
  const histVaR99 = -percentile(sorted, 1);

  // ── Method 2: Parametric VaR ──
  const paramVaR95 = -(mu - Z_95 * sigma);
  const paramVaR99 = -(mu - Z_99 * sigma);

  // ── Method 3: Monte Carlo VaR ──
  const rng = mulberry32(seed);
  const simReturns: number[] = [];
  const simCount = 10_000;

  for (let i = 0; i < simCount; i++) {
    // Bootstrap: randomly sample from historical returns
    const idx = Math.floor(rng() * n);
    // Add slight random noise for fat-tail adjustment
    const noise = (rng() - 0.5) * sigma * 0.3;
    simReturns.push(dailyReturns[idx] + noise);
  }

  const sortedSim = [...simReturns].sort((a, b) => a - b);
  const mcVaR95 = -percentile(sortedSim, 5);
  const mcVaR99 = -percentile(sortedSim, 1);

  // ── Final VaR: most conservative (highest) ──
  const final95 = Math.max(histVaR95, paramVaR95, mcVaR95);
  const final99 = Math.max(histVaR99, paramVaR99, mcVaR99);

  // Determine which method was most conservative
  let method = 'historical';
  if (final95 === paramVaR95) method = 'parametric';
  if (final95 === mcVaR95) method = 'monte_carlo';

  // ── CVaR (Expected Shortfall) ──
  const threshold95 = -final95;
  const threshold99 = -final99;
  const tailLosses95 = sorted.filter(r => r <= threshold95);
  const tailLosses99 = sorted.filter(r => r <= threshold99);
  const cvar95 = tailLosses95.length > 0 ? -mean(tailLosses95) : final95;
  const cvar99 = tailLosses99.length > 0 ? -mean(tailLosses99) : final99;

  // Dollar amounts
  const eq = currentEquity;

  return {
    historicalVaR95: round(histVaR95),
    parametricVaR95: round(paramVaR95),
    monteCarloVaR95: round(mcVaR95),
    varFinal95: round(final95),

    historicalVaR99: round(histVaR99),
    parametricVaR99: round(paramVaR99),
    monteCarloVaR99: round(mcVaR99),
    varFinal99: round(final99),

    cvar95: round(cvar95),
    cvar99: round(cvar99),

    varDollar95: round(eq * final95 / 100),
    varDollar99: round(eq * final99 / 100),
    cvarDollar95: round(eq * cvar95 / 100),
    cvarDollar99: round(eq * cvar99 / 100),

    dataPoints: n,
    method,
    computedAt: now,
  };
}

// ── Monte Carlo Ruin Probability ─────────────────────────────

/**
 * Simulate 10,000 equity paths to estimate P(Ruin).
 *
 * @param winRate      - Historical win rate (0.0 to 1.0)
 * @param avgRR        - Average reward-to-risk ratio (e.g. 1.8)
 * @param riskPerTrade - Risk per trade as fraction of equity (e.g. 0.015 = 1.5%)
 * @param maxDD        - Maximum drawdown limit (e.g. 0.25 = 25%)
 * @param startEquity  - Starting equity for simulation
 * @param numPaths     - Number of simulation paths (default 10,000)
 * @param tradesPerPath- Trades to simulate per path (default 500)
 */
export function monteCarloRuin(
  winRate: number,
  avgRR: number,
  riskPerTrade: number,
  maxDD: number = 0.25,
  startEquity: number = 10_000,
  numPaths: number = 10_000,
  tradesPerPath: number = 500,
  seed: number = 42,
): MonteCarloResult {
  const rng = mulberry32(seed);
  let ruinCount = 0;
  const finalEquities: number[] = [];
  const maxDrawdowns: number[] = [];

  for (let path = 0; path < numPaths; path++) {
    let equity = startEquity;
    let peak = startEquity;
    let ruined = false;
    let pathMaxDD = 0;

    for (let trade = 0; trade < tradesPerPath; trade++) {
      const isWin = rng() < winRate;

      if (isWin) {
        equity *= (1 + riskPerTrade * avgRR);
      } else {
        equity *= (1 - riskPerTrade);
      }

      // Update peak and drawdown
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak;
      if (dd > pathMaxDD) pathMaxDD = dd;

      // Check ruin
      if (dd >= maxDD) {
        ruined = true;
        break;
      }
    }

    if (ruined) ruinCount++;
    finalEquities.push(equity);
    maxDrawdowns.push(pathMaxDD);
  }

  // Sort for percentile calculations
  finalEquities.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);

  const ruinProb = ruinCount / numPaths;

  // Assessment
  let assessment: string;
  if (ruinProb < 0.01) assessment = 'Excellent — strategy is robust';
  else if (ruinProb < 0.05) assessment = 'Good — acceptable for aggressive strategies';
  else if (ruinProb < 0.15) assessment = 'Concerning — elevated ruin risk';
  else if (ruinProb < 0.30) assessment = 'Dangerous — may not survive long-term';
  else assessment = 'Unacceptable — do not trade live';

  return {
    ruinProbability: round(ruinProb, 4),
    ruinProbabilityPct: `${(ruinProb * 100).toFixed(1)}%`,
    assessment,
    medianFinalEquity: round(percentile(finalEquities, 50)),
    percentile5Equity: round(percentile(finalEquities, 5)),
    percentile95Equity: round(percentile(finalEquities, 95)),
    maxDrawdownMedian: round(percentile(maxDrawdowns, 50) * 100),
    paths: numPaths,
    tradesPerPath,
    parameters: {
      winRate: round(winRate, 4),
      avgRewardRisk: round(avgRR, 2),
      riskPerTrade: round(riskPerTrade, 4),
      maxDrawdownLimit: round(maxDD, 2),
    },
    computedAt: new Date().toISOString(),
  };
}

// ── Helper: Build daily returns from closed_deals ────────────

/**
 * Given an array of closed deals with date and profit,
 * compute daily return percentages.
 */
export function buildDailyReturns(
  deals: { profit: number; closeTime: string }[],
  startEquity: number,
): DailyReturn[] {
  if (deals.length === 0 || startEquity <= 0) return [];

  // Group deals by date
  const byDate = new Map<string, number>();
  for (const deal of deals) {
    const date = new Date(deal.closeTime).toISOString().split('T')[0];
    byDate.set(date, (byDate.get(date) || 0) + deal.profit);
  }

  // Convert to daily returns
  const returns: DailyReturn[] = [];
  let cumEquity = startEquity;

  // Sort dates ascending
  const sortedDates = [...byDate.keys()].sort();
  for (const date of sortedDates) {
    const pnl = byDate.get(date)!;
    const returnPct = (pnl / cumEquity) * 100;
    returns.push({ date, returnPct, pnl });
    cumEquity += pnl;
  }

  return returns;
}

/**
 * Extract win rate and average R:R from closed deals.
 */
export function extractTradeStats(
  deals: { profit: number; commission?: number; swap?: number }[],
): { winRate: number; avgRR: number; avgWin: number; avgLoss: number; totalTrades: number } {
  if (deals.length === 0) {
    return { winRate: 0.5, avgRR: 1.5, avgWin: 0, avgLoss: 0, totalTrades: 0 };
  }

  const wins = deals.filter(d => d.profit > 0);
  const losses = deals.filter(d => d.profit <= 0);

  const winRate = wins.length / deals.length;
  const avgWin = wins.length > 0 ? mean(wins.map(d => d.profit)) : 0;
  const avgLoss = losses.length > 0 ? Math.abs(mean(losses.map(d => d.profit))) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 1.5;

  return {
    winRate: round(winRate, 4),
    avgRR: round(avgRR, 2),
    avgWin: round(avgWin),
    avgLoss: round(avgLoss),
    totalTrades: deals.length,
  };
}

// ── Utility ──────────────────────────────────────────────────

function round(n: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
