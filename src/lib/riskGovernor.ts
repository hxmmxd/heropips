/**
 * Risk Governor — Gates 13–15
 *
 * Gate 13: Equity Curve Protection (ECP)
 *   - Tracks equity curve vs EMA₂₀ / SMA₅₀
 *   - GREEN → full trade, AMBER → 50% size, RED → paper trade only (SHADOW)
 *
 * Gate 14: Daily Loss Circuit Breaker (DLCB)
 *   - Max daily loss: 6% (from higher of start-of-day equity or balance)
 *   - Tiered: Normal → Caution (3%) → Warning (4.5%) → Terminal (6%)
 *
 * Gate 15: Maximum Drawdown Governor (MDG)
 *   - Max drawdown: 25% from peak equity (high-water mark)
 *   - 5 zones: Green → Yellow (8%) → Orange (15%) → Red (20%) → Black (25%)
 *   - Anti-martingale recovery: gradual scale-up after trough
 *
 * All functions are pure (input → output) for testability.
 * Supabase persistence handled via dedicated read/write helpers.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────

export type ECPStatus = 'GREEN' | 'AMBER' | 'RED';
export type DailyTier = 'NORMAL' | 'CAUTION' | 'WARNING' | 'TERMINAL';
export type DrawdownZone = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';

export interface RiskState {
  accountId: string;
  userId: string;

  // Equity tracking
  currentEquity: number;
  peakEquity: number;
  dailyStartEquity: number;
  dailyStartBalance: number;

  // Computed metrics
  dailyLossPct: number;
  drawdownPct: number;
  consecutiveLosses: number;
  consecutiveWins: number;

  // Gate 13: Equity Curve
  equitySma50: number | null;
  equityEma20: number | null;
  ecpStatus: ECPStatus;

  // Gate 14: Daily Circuit Breaker
  dailyTier: DailyTier;
  isDailyHalted: boolean;
  dailyHaltTime: string | null;

  // Gate 15: Drawdown Governor
  drawdownZone: DrawdownZone;
  recoveryWins: number;
  isTradingEnabled: boolean;
  shutdownTime: string | null;

  // Portfolio heat
  portfolioHeatPct: number;

  // Metadata
  tradesToday: number;
  lastUpdated: string;
}

export interface RiskMultipliers {
  ecpMultiplier: number;        // Gate 13: 1.0, 0.5, or 0.0
  dailyMultiplier: number;      // Gate 14: 1.0, 0.5, 0.0, or -1.0
  streakMultiplier: number;     // Consecutive loss streak
  drawdownMultiplier: number;   // Gate 15: 1.0 → 0.0
  recoveryMultiplier: number;   // Anti-martingale: 0.2 → 1.0
  heatMultiplier: number;       // Portfolio correlation cap
  combinedMultiplier: number;   // Product of all above (≥ 0)
  shouldShadowTrade: boolean;   // Gate 13 RED → paper trade
  shouldLiquidate: boolean;     // Terminal event
  shouldHalt: boolean;          // No new trades allowed
  maxTradesAllowed: number;     // Zone-based daily trade limit
  minGradeRequired: string;     // 'A+' | 'AAA' | 'MANUAL'
  riskSummary: string;          // Human-readable summary
}

export interface RiskGateResult {
  gate: string;
  passed: boolean;
  detail: string;
  multiplier: number;
}

// ── Constants ────────────────────────────────────────────────

// Gate 14: Daily loss tiers
const DAILY_CAUTION_PCT  = 3.0;
const DAILY_WARNING_PCT  = 4.5;
const DAILY_TERMINAL_PCT = 6.0;

// Gate 15: Drawdown zones
const DD_YELLOW_PCT = 8.0;
const DD_ORANGE_PCT = 15.0;
const DD_RED_PCT    = 20.0;
const DD_BLACK_PCT  = 25.0;

// Streak multipliers
const STREAK_MULTIPLIERS: Record<number, number> = {
  0: 1.00, 1: 1.00, 2: 1.00, 3: 1.00,
  4: 0.75, 5: 0.50, 6: 0.25,
};
const STREAK_HALT_THRESHOLD = 7; // 7+ consecutive losses → stop for 4 hours

// ── Gate 13: Equity Curve Protection ─────────────────────────

export function evaluateGate13(state: RiskState, tradeCount: number): RiskGateResult {
  // Bootstrap: not enough trades for SMA₅₀
  if (tradeCount < 20) {
    return {
      gate: 'Gate 13: Equity Curve',
      passed: true,
      detail: `Bootstrap mode (${tradeCount} trades) — auto GREEN`,
      multiplier: 1.0,
    };
  }

  const equity = state.currentEquity;
  const ema20 = state.equityEma20;
  const sma50 = state.equitySma50;

  // Trades 20–49: use EMA₂₀ only (no SMA₅₀ yet)
  if (tradeCount < 50 || sma50 === null) {
    if (ema20 === null) {
      return { gate: 'Gate 13: Equity Curve', passed: true, detail: 'EMA₂₀ not computed yet — GREEN', multiplier: 1.0 };
    }
    const status = (equity >= ema20 ? 'GREEN' : 'AMBER') as ECPStatus;
    return {
      gate: 'Gate 13: Equity Curve',
      passed: status !== 'RED',
      detail: `Equity $${equity.toFixed(0)} vs EMA₂₀ $${ema20.toFixed(0)} → ${status}`,
      multiplier: status === 'GREEN' ? 1.0 : 0.5,
    };
  }

  // Full protection: 50+ trades
  let status: ECPStatus;
  if (equity > ema20! && equity > sma50) {
    status = 'GREEN';
  } else if (equity > sma50 && equity < ema20!) {
    status = 'AMBER';
  } else {
    status = 'RED';
  }

  const multiplier = status === 'GREEN' ? 1.0 : status === 'AMBER' ? 0.5 : 0.0;

  return {
    gate: 'Gate 13: Equity Curve',
    passed: status !== 'RED',
    detail: `Equity $${equity.toFixed(0)} | EMA₂₀ $${ema20!.toFixed(0)} | SMA₅₀ $${sma50.toFixed(0)} → ${status}${status === 'RED' ? ' (shadow mode)' : ''}`,
    multiplier,
  };
}

// ── Gate 14: Daily Loss Circuit Breaker ──────────────────────

export function evaluateGate14(state: RiskState): RiskGateResult {
  const baseline = Math.max(state.dailyStartEquity, state.dailyStartBalance);
  const dailyLoss = baseline > 0
    ? ((baseline - state.currentEquity) / baseline) * 100
    : 0;
  const pct = Math.max(0, dailyLoss); // Can't be negative (that's profit)

  let tier: DailyTier;
  let multiplier: number;
  let emoji: string;

  if (pct >= DAILY_TERMINAL_PCT) {
    tier = 'TERMINAL';
    multiplier = -1.0; // Signal to liquidate
    emoji = '🔴';
  } else if (pct >= DAILY_WARNING_PCT) {
    tier = 'WARNING';
    multiplier = 0.0; // No new trades
    emoji = '🔶';
  } else if (pct >= DAILY_CAUTION_PCT) {
    tier = 'CAUTION';
    multiplier = 0.5;
    emoji = '⚠️';
  } else {
    tier = 'NORMAL';
    multiplier = 1.0;
    emoji = '✅';
  }

  return {
    gate: 'Gate 14: Daily Loss',
    passed: tier === 'NORMAL' || tier === 'CAUTION',
    detail: `${emoji} Daily loss: ${pct.toFixed(2)}% / ${DAILY_TERMINAL_PCT}% max → ${tier}${tier === 'TERMINAL' ? ' — KILL SWITCH' : ''}`,
    multiplier: tier === 'TERMINAL' ? 0.0 : multiplier, // For combined calc, use 0 not -1
  };
}

// ── Gate 15: Maximum Drawdown Governor ───────────────────────

export function evaluateGate15(state: RiskState): RiskGateResult {
  const dd = state.peakEquity > 0
    ? ((state.peakEquity - state.currentEquity) / state.peakEquity) * 100
    : 0;
  const pct = Math.max(0, dd);

  let zone: DrawdownZone;
  let multiplier: number;
  let maxTrades: number;
  let minGrade: string;
  let emoji: string;

  if (pct >= DD_BLACK_PCT) {
    zone = 'BLACK'; multiplier = 0.0; maxTrades = 0; minGrade = 'TERMINAL'; emoji = '🚨';
  } else if (pct >= DD_RED_PCT) {
    zone = 'RED'; multiplier = 0.10; maxTrades = 1; minGrade = 'MANUAL'; emoji = '🔴';
  } else if (pct >= DD_ORANGE_PCT) {
    zone = 'ORANGE'; multiplier = 0.25; maxTrades = 1; minGrade = 'AAA+APPROVAL'; emoji = '🟠';
  } else if (pct >= DD_YELLOW_PCT) {
    zone = 'YELLOW'; multiplier = 0.50; maxTrades = 3; minGrade = 'AAA'; emoji = '🟡';
  } else {
    zone = 'GREEN'; multiplier = 1.0; maxTrades = 99; minGrade = 'A+'; emoji = '🟢';
  }

  // Anti-martingale recovery (only when coming back from a drawdown zone)
  let recoveryMult = 1.0;
  if (zone !== 'GREEN' && state.recoveryWins > 0) {
    recoveryMult = Math.min(1.0, state.recoveryWins / 5);
    multiplier *= recoveryMult;
  }

  return {
    gate: 'Gate 15: Drawdown',
    passed: zone !== 'BLACK' && zone !== 'RED',
    detail: `${emoji} DD: ${pct.toFixed(2)}% / ${DD_BLACK_PCT}% max → Zone ${zone} | Peak $${state.peakEquity.toFixed(0)} | Current $${state.currentEquity.toFixed(0)}${recoveryMult < 1 ? ` | Recovery ${(recoveryMult * 100).toFixed(0)}%` : ''}`,
    multiplier,
  };
}

// ── Consecutive Loss Streak ──────────────────────────────────

export function evaluateStreakMultiplier(consecutiveLosses: number): { multiplier: number; detail: string; shouldCoolDown: boolean } {
  if (consecutiveLosses >= STREAK_HALT_THRESHOLD) {
    return {
      multiplier: 0.0,
      detail: `🛑 ${consecutiveLosses} consecutive losses — 4-hour cooldown`,
      shouldCoolDown: true,
    };
  }
  const mult = STREAK_MULTIPLIERS[consecutiveLosses] ?? 0.25;
  return {
    multiplier: mult,
    detail: consecutiveLosses <= 3
      ? `Streak: ${consecutiveLosses} losses — normal`
      : `⚠️ Streak: ${consecutiveLosses} losses — sizing reduced to ${(mult * 100).toFixed(0)}%`,
    shouldCoolDown: false,
  };
}

// ── Portfolio Heat (simplified) ──────────────────────────────

export function evaluatePortfolioHeat(
  currentHeatPct: number,
  maxHeatPct: number = 4.0 // 2× the default 2% single-trade risk
): { multiplier: number; detail: string } {
  if (currentHeatPct >= maxHeatPct) {
    return { multiplier: 0.0, detail: `🔥 Portfolio heat ${currentHeatPct.toFixed(1)}% ≥ ${maxHeatPct}% cap — blocked` };
  }
  if (currentHeatPct >= maxHeatPct * 0.75) {
    const remaining = maxHeatPct - currentHeatPct;
    const ratio = remaining / maxHeatPct;
    return { multiplier: Math.max(0.25, ratio), detail: `⚠️ Heat ${currentHeatPct.toFixed(1)}% — sizing reduced` };
  }
  return { multiplier: 1.0, detail: `Heat ${currentHeatPct.toFixed(1)}% — OK` };
}

// ── Master Risk Evaluator ────────────────────────────────────

export function evaluateAllRiskGates(
  state: RiskState,
  tradeCount: number = 0,
): { multipliers: RiskMultipliers; gates: RiskGateResult[] } {

  const gate13 = evaluateGate13(state, tradeCount);
  const gate14 = evaluateGate14(state);
  const gate15 = evaluateGate15(state);
  const streak = evaluateStreakMultiplier(state.consecutiveLosses);
  const heat = evaluatePortfolioHeat(state.portfolioHeatPct);

  // Compute daily loss for tier detection
  const baseline = Math.max(state.dailyStartEquity, state.dailyStartBalance);
  const dailyLoss = baseline > 0 ? Math.max(0, ((baseline - state.currentEquity) / baseline) * 100) : 0;
  const isTerminal = dailyLoss >= DAILY_TERMINAL_PCT;
  const dd = state.peakEquity > 0 ? Math.max(0, ((state.peakEquity - state.currentEquity) / state.peakEquity) * 100) : 0;
  const isBlackZone = dd >= DD_BLACK_PCT;

  // Determine drawdown zone for trade limits
  let maxTrades = 99;
  let minGrade = 'A+';
  if (dd >= DD_BLACK_PCT) { maxTrades = 0; minGrade = 'TERMINAL'; }
  else if (dd >= DD_RED_PCT) { maxTrades = 1; minGrade = 'MANUAL'; }
  else if (dd >= DD_ORANGE_PCT) { maxTrades = 1; minGrade = 'AAA+APPROVAL'; }
  else if (dd >= DD_YELLOW_PCT) { maxTrades = 3; minGrade = 'AAA'; }

  // Combined multiplier (all ≥ 0 factors)
  const ecpMult = gate13.multiplier;
  const dailyMult = isTerminal ? 0 : gate14.multiplier;
  const ddMult = gate15.multiplier;
  const streakMult = streak.multiplier;
  const recoveryMult = 1.0; // Already folded into gate15.multiplier
  const heatMult = heat.multiplier;

  const combined = ecpMult * dailyMult * streakMult * ddMult * heatMult;

  const shouldShadowTrade = ecpMult === 0; // Gate 13 RED
  const shouldLiquidate = isTerminal || isBlackZone;
  const shouldHalt = dailyMult === 0 || ddMult === 0 || streak.shouldCoolDown || state.tradesToday >= maxTrades;

  // Build summary
  const parts: string[] = [];
  if (shouldLiquidate) parts.push('🚨 LIQUIDATE ALL POSITIONS');
  if (shouldShadowTrade) parts.push('📋 Shadow mode (paper only)');
  if (shouldHalt && !shouldLiquidate) parts.push('⛔ Trading halted');
  if (combined > 0 && combined < 1) parts.push(`Sizing: ${(combined * 100).toFixed(1)}%`);
  if (combined >= 1) parts.push('Full sizing');

  const multipliers: RiskMultipliers = {
    ecpMultiplier: ecpMult,
    dailyMultiplier: isTerminal ? -1.0 : dailyMult,
    streakMultiplier: streakMult,
    drawdownMultiplier: ddMult,
    recoveryMultiplier: recoveryMult,
    heatMultiplier: heatMult,
    combinedMultiplier: Math.max(0, combined),
    shouldShadowTrade,
    shouldLiquidate,
    shouldHalt,
    maxTradesAllowed: maxTrades,
    minGradeRequired: minGrade,
    riskSummary: parts.join(' | ') || 'All risk gates clear',
  };

  const gates: RiskGateResult[] = [gate13, gate14, gate15];

  return { multipliers, gates };
}

// ── Supabase Helpers ─────────────────────────────────────────

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Fetch risk state from Supabase. Returns null if no record exists.
 */
export async function getRiskState(accountId: string): Promise<RiskState | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('portfolio_risk_states')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error || !data) return null;

    return {
      accountId: data.account_id,
      userId: data.user_id,
      currentEquity: Number(data.current_equity),
      peakEquity: Number(data.peak_equity),
      dailyStartEquity: Number(data.daily_start_equity),
      dailyStartBalance: Number(data.daily_start_balance),
      dailyLossPct: Number(data.daily_loss_pct),
      drawdownPct: Number(data.drawdown_pct),
      consecutiveLosses: data.consecutive_losses,
      consecutiveWins: data.consecutive_wins,
      equitySma50: data.equity_sma_50 ? Number(data.equity_sma_50) : null,
      equityEma20: data.equity_ema_20 ? Number(data.equity_ema_20) : null,
      ecpStatus: data.ecp_status || 'GREEN',
      dailyTier: data.daily_tier || 'NORMAL',
      isDailyHalted: data.is_daily_halted || false,
      dailyHaltTime: data.daily_halt_time,
      drawdownZone: data.drawdown_zone || 'GREEN',
      recoveryWins: data.recovery_wins || 0,
      isTradingEnabled: data.is_trading_enabled !== false,
      shutdownTime: data.shutdown_time,
      portfolioHeatPct: Number(data.portfolio_heat_pct) || 0,
      tradesToday: data.trades_today || 0,
      lastUpdated: data.last_updated || new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[Risk Governor] Failed to fetch risk state:', err.message);
    return null;
  }
}

/**
 * Upsert risk state to Supabase.
 */
export async function saveRiskState(state: RiskState): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('portfolio_risk_states')
      .upsert({
        account_id: state.accountId,
        user_id: state.userId,
        current_equity: state.currentEquity,
        peak_equity: state.peakEquity,
        daily_start_equity: state.dailyStartEquity,
        daily_start_balance: state.dailyStartBalance,
        daily_loss_pct: state.dailyLossPct,
        drawdown_pct: state.drawdownPct,
        consecutive_losses: state.consecutiveLosses,
        consecutive_wins: state.consecutiveWins,
        equity_sma_50: state.equitySma50,
        equity_ema_20: state.equityEma20,
        ecp_status: state.ecpStatus,
        daily_tier: state.dailyTier,
        is_daily_halted: state.isDailyHalted,
        daily_halt_time: state.dailyHaltTime,
        drawdown_zone: state.drawdownZone,
        recovery_wins: state.recoveryWins,
        is_trading_enabled: state.isTradingEnabled,
        shutdown_time: state.shutdownTime,
        portfolio_heat_pct: state.portfolioHeatPct,
        trades_today: state.tradesToday,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'account_id' });

    if (error) {
      console.error('[Risk Governor] Failed to save risk state:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Risk Governor] Save error:', err.message);
    return false;
  }
}

/**
 * Initialize risk state for a new account.
 * Called when an account is first connected.
 */
export function createInitialRiskState(
  accountId: string,
  userId: string,
  equity: number,
  balance: number,
): RiskState {
  return {
    accountId,
    userId,
    currentEquity: equity,
    peakEquity: equity,
    dailyStartEquity: equity,
    dailyStartBalance: balance,
    dailyLossPct: 0,
    drawdownPct: 0,
    consecutiveLosses: 0,
    consecutiveWins: 0,
    equitySma50: null,
    equityEma20: null,
    ecpStatus: 'GREEN',
    dailyTier: 'NORMAL',
    isDailyHalted: false,
    dailyHaltTime: null,
    drawdownZone: 'GREEN',
    recoveryWins: 0,
    isTradingEnabled: true,
    shutdownTime: null,
    portfolioHeatPct: 0,
    tradesToday: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update risk state with latest equity from MT5.
 * Recalculates all derived fields (daily loss %, drawdown %, peak, etc.).
 */
export function updateRiskMetrics(
  state: RiskState,
  liveEquity: number,
  liveBalance: number,
): RiskState {
  // Update peak (high-water mark)
  const peakEquity = Math.max(state.peakEquity, liveEquity);

  // Daily loss
  const baseline = Math.max(state.dailyStartEquity, state.dailyStartBalance);
  const dailyLossPct = baseline > 0
    ? Math.max(0, ((baseline - liveEquity) / baseline) * 100)
    : 0;

  // Drawdown from peak
  const drawdownPct = peakEquity > 0
    ? Math.max(0, ((peakEquity - liveEquity) / peakEquity) * 100)
    : 0;

  // Determine tiers/zones
  let dailyTier: DailyTier = 'NORMAL';
  if (dailyLossPct >= DAILY_TERMINAL_PCT) dailyTier = 'TERMINAL';
  else if (dailyLossPct >= DAILY_WARNING_PCT) dailyTier = 'WARNING';
  else if (dailyLossPct >= DAILY_CAUTION_PCT) dailyTier = 'CAUTION';

  let drawdownZone: DrawdownZone = 'GREEN';
  if (drawdownPct >= DD_BLACK_PCT) drawdownZone = 'BLACK';
  else if (drawdownPct >= DD_RED_PCT) drawdownZone = 'RED';
  else if (drawdownPct >= DD_ORANGE_PCT) drawdownZone = 'ORANGE';
  else if (drawdownPct >= DD_YELLOW_PCT) drawdownZone = 'YELLOW';

  // ECP status
  let ecpStatus: ECPStatus = 'GREEN';
  if (state.equityEma20 !== null && state.equitySma50 !== null) {
    if (liveEquity > state.equityEma20 && liveEquity > state.equitySma50) {
      ecpStatus = 'GREEN';
    } else if (liveEquity > state.equitySma50) {
      ecpStatus = 'AMBER';
    } else {
      ecpStatus = 'RED';
    }
  } else if (state.equityEma20 !== null) {
    ecpStatus = liveEquity >= state.equityEma20 ? 'GREEN' : 'AMBER';
  }

  // Halt conditions
  const isDailyHalted = dailyTier === 'TERMINAL' || dailyTier === 'WARNING';
  const isTradingEnabled = drawdownZone !== 'BLACK' && !isDailyHalted;

  return {
    ...state,
    currentEquity: liveEquity,
    peakEquity,
    dailyLossPct,
    drawdownPct,
    dailyTier,
    drawdownZone,
    ecpStatus,
    isDailyHalted,
    dailyHaltTime: isDailyHalted && !state.isDailyHalted ? new Date().toISOString() : state.dailyHaltTime,
    isTradingEnabled,
    shutdownTime: drawdownZone === 'BLACK' && !state.shutdownTime ? new Date().toISOString() : state.shutdownTime,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update equity curve moving averages after a trade closes.
 * Called with the array of recent equity snapshots (one per trade).
 */
export function updateEquityCurve(
  state: RiskState,
  equityHistory: number[],
): RiskState {
  const n = equityHistory.length;
  if (n === 0) return state;

  // EMA₂₀
  const emaAlpha = 2 / 21;
  let ema = equityHistory[0];
  for (let i = 1; i < n; i++) {
    ema = emaAlpha * equityHistory[i] + (1 - emaAlpha) * ema;
  }

  // SMA₅₀
  let sma: number | null = null;
  if (n >= 50) {
    const slice = equityHistory.slice(-50);
    sma = slice.reduce((a, b) => a + b, 0) / 50;
  }

  return {
    ...state,
    equityEma20: Math.round(ema * 100) / 100,
    equitySma50: sma !== null ? Math.round(sma * 100) / 100 : state.equitySma50,
  };
}

/**
 * Update streak counters after a trade result.
 */
export function updateTradeResult(
  state: RiskState,
  isWin: boolean,
): RiskState {
  if (isWin) {
    return {
      ...state,
      consecutiveWins: state.consecutiveWins + 1,
      consecutiveLosses: 0,
      recoveryWins: state.drawdownZone !== 'GREEN' ? state.recoveryWins + 1 : 0,
      tradesToday: state.tradesToday + 1,
    };
  } else {
    return {
      ...state,
      consecutiveLosses: state.consecutiveLosses + 1,
      consecutiveWins: 0,
      recoveryWins: 0,
      tradesToday: state.tradesToday + 1,
    };
  }
}

/**
 * Daily reset — called at 00:00 UTC.
 */
export function performDailyReset(
  state: RiskState,
  currentEquity: number,
  currentBalance: number,
): RiskState {
  return {
    ...state,
    dailyStartEquity: currentEquity,
    dailyStartBalance: currentBalance,
    dailyLossPct: 0,
    dailyTier: 'NORMAL',
    isDailyHalted: false,
    dailyHaltTime: null,
    tradesToday: 0,
    // Note: consecutiveLosses, drawdownPct, and peak are NOT reset
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Log a shadow (phantom) trade for Gate 13 RED mode.
 */
export async function logShadowTrade(trade: {
  accountId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  volume: number;
  gateScore: number;
  signalGrade: string;
  confluencePct: number;
}): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb.from('shadow_trades').insert({
      account_id: trade.accountId,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      stop_loss: trade.stopLoss,
      take_profit: trade.takeProfit,
      theoretical_volume: trade.volume,
      gate_score: trade.gateScore,
      signal_grade: trade.signalGrade,
      confluence_pct: trade.confluencePct,
      status: 'open',
    });
    if (error) {
      console.error('[Risk Governor] Shadow trade insert error:', error.message);
      return false;
    }
    console.log(`[Risk Governor] 📋 Shadow trade logged: ${trade.direction} ${trade.symbol}`);
    return true;
  } catch (err: any) {
    console.error('[Risk Governor] Shadow trade error:', err.message);
    return false;
  }
}

/**
 * Generate daily risk report.
 */
export async function generateDailyReport(
  accountId: string,
  state: RiskState,
  tradesWon: number,
  tradesLost: number,
  realizedPnl: number,
  unrealizedPnl: number,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const today = new Date().toISOString().split('T')[0];

  try {
    const { error } = await sb.from('daily_risk_reports').upsert({
      account_id: accountId,
      report_date: today,
      start_equity: state.dailyStartEquity,
      end_equity: state.currentEquity,
      high_water_mark: state.peakEquity,
      low_water_mark: state.currentEquity, // Simplified; sentinel would track intra-day low
      max_daily_loss_pct: state.dailyLossPct,
      max_drawdown_pct: state.drawdownPct,
      trades_executed: tradesWon + tradesLost,
      trades_won: tradesWon,
      trades_lost: tradesLost,
      gate14_caution_hits: state.dailyTier === 'CAUTION' ? 1 : 0,
      gate14_warning_hits: state.dailyTier === 'WARNING' ? 1 : 0,
      gate14_terminal_hit: state.dailyTier === 'TERMINAL',
      gate15_zone_reached: state.drawdownZone,
      realized_pnl: realizedPnl,
      unrealized_pnl: unrealizedPnl,
    }, { onConflict: 'account_id,report_date' });

    if (error) {
      console.error('[Risk Governor] Report save error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Risk Governor] Report error:', err.message);
    return false;
  }
}
