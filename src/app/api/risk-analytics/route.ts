/**
 * Risk Analytics API — GET /api/risk-analytics
 *
 * Returns VaR, CVaR, and Monte Carlo ruin probability for an account.
 *
 * Query params:
 *   ?accountId=<mt5_login>  — specific account
 *   ?forceRefresh=true      — bypass cache and recompute
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  computeVaR,
  monteCarloRuin,
  buildDailyReturns,
  extractTradeStats,
} from '@/lib/riskAnalytics';
import { getRiskState } from '@/lib/riskGovernor';

export const dynamic = 'force-dynamic';

// ── Cache (1 hour TTL, recompute after 25 new trades) ──
const analyticsCache = new Map<string, { data: any; time: number; tradeCount: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  try {
    const admin = getAdmin();

    // ── Get current equity ──
    const riskState = await getRiskState(accountId);
    const currentEquity = riskState?.currentEquity || 0;

    if (currentEquity <= 0) {
      return NextResponse.json({
        status: 'no_data',
        message: 'No risk state found. Connect a broker first.',
      });
    }

    // ── Get closed deals for analysis ──
    const userId = riskState?.userId;
    const { data: deals } = await admin
      .from('closed_deals')
      .select('profit, commission, swap, close_time')
      .eq('user_id', userId)
      .order('close_time', { ascending: true })
      .limit(500);

    const closedDeals = (deals || []).map((d: any) => ({
      profit: Number(d.profit) || 0,
      commission: Number(d.commission) || 0,
      swap: Number(d.swap) || 0,
      closeTime: d.close_time,
    }));

    // ── Check cache ──
    const cacheKey = accountId;
    const cached = analyticsCache.get(cacheKey);
    if (
      !forceRefresh &&
      cached &&
      Date.now() - cached.time < CACHE_TTL &&
      Math.abs(closedDeals.length - cached.tradeCount) < 25
    ) {
      return NextResponse.json({
        status: 'ok',
        cached: true,
        ...cached.data,
      });
    }

    // ── Compute daily returns ──
    // Estimate start equity by subtracting total P&L from current
    const totalPnl = closedDeals.reduce((s, d) => s + d.profit, 0);
    const estimatedStartEquity = currentEquity - totalPnl;
    const startEq = estimatedStartEquity > 0 ? estimatedStartEquity : currentEquity;

    const dailyReturns = buildDailyReturns(
      closedDeals.map(d => ({ profit: d.profit, closeTime: d.closeTime })),
      startEq,
    );

    const returnPcts = dailyReturns.map(r => r.returnPct);

    // ── Compute VaR ──
    const var_result = computeVaR(returnPcts, currentEquity);

    // ── Compute Monte Carlo Ruin ──
    const tradeStats = extractTradeStats(closedDeals);
    const mc_result = monteCarloRuin(
      tradeStats.winRate || 0.5,
      tradeStats.avgRR || 1.5,
      0.015, // 1.5% risk per trade (default Kelly cap)
      0.25,  // 25% max drawdown
      currentEquity,
      10_000,
      500,
    );

    // ── Compute VaR warning level ──
    let varWarning = 'normal';
    if (var_result.cvar95 >= 5.0) varWarning = 'critical';
    else if (var_result.cvar95 >= 3.0) varWarning = 'elevated';

    let varAction = 'Full sizing permitted.';
    if (var_result.cvar99 >= 6.0) {
      varAction = 'Pre-activate Gate 14 Tier 1 (50% sizing). CVaR₉₉ exceeds daily limit.';
    } else if (var_result.cvar95 >= 5.0) {
      varAction = 'Reduce max positions to 1. Consider wider SLs.';
    } else if (var_result.cvar95 >= 3.0) {
      varAction = 'Reduce max positions from 5 to 3. Monitor closely.';
    }

    const result = {
      accountId,
      equity: currentEquity,
      var: var_result,
      monteCarlo: mc_result,
      tradeStats,
      varWarning,
      varAction,
      dailyReturns: dailyReturns.slice(-30), // Last 30 days
    };

    // ── Update cache ──
    analyticsCache.set(cacheKey, {
      data: result,
      time: Date.now(),
      tradeCount: closedDeals.length,
    });

    return NextResponse.json({ status: 'ok', cached: false, ...result });

  } catch (err: any) {
    console.error('[RiskAnalytics] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
