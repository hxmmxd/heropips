/**
 * Risk Governor API — GET /api/risk
 * Returns risk state and gate evaluations for the UI dashboard.
 *
 * Query params:
 *   ?accountId=<mt5_login>  — specific account
 *   (no params)              — returns all accounts' risk states
 */

import { NextResponse } from 'next/server';
import {
  getRiskState,
  evaluateAllRiskGates,
  createInitialRiskState,
  saveRiskState,
  type RiskState,
} from '@/lib/riskGovernor';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (accountId) {
      // Single account risk state
      let state = await getRiskState(accountId);

      if (!state) {
        // No risk state yet — return default
        return NextResponse.json({
          status: 'no_data',
          message: `No risk state found for account ${accountId}. Will initialize on first trade.`,
        });
      }

      const { multipliers, gates } = await evaluateAllRiskGates(state);

      return NextResponse.json({
        status: 'ok',
        accountId,
        riskState: {
          currentEquity: state.currentEquity,
          peakEquity: state.peakEquity,
          dailyLossPct: state.dailyLossPct,
          drawdownPct: state.drawdownPct,
          consecutiveLosses: state.consecutiveLosses,
          consecutiveWins: state.consecutiveWins,
          ecpStatus: state.ecpStatus,
          dailyTier: state.dailyTier,
          drawdownZone: state.drawdownZone,
          isTradingEnabled: state.isTradingEnabled,
          tradesToday: state.tradesToday,
          portfolioHeatPct: state.portfolioHeatPct,
        },
        gates: gates.map(g => ({
          name: g.gate,
          passed: g.passed,
          detail: g.detail,
          multiplier: g.multiplier,
        })),
        multipliers: {
          ecp: multipliers.ecpMultiplier,
          daily: multipliers.dailyMultiplier,
          streak: multipliers.streakMultiplier,
          drawdown: multipliers.drawdownMultiplier,
          recovery: multipliers.recoveryMultiplier,
          heat: multipliers.heatMultiplier,
          combined: multipliers.combinedMultiplier,
        },
        flags: {
          shouldShadowTrade: multipliers.shouldShadowTrade,
          shouldLiquidate: multipliers.shouldLiquidate,
          shouldHalt: multipliers.shouldHalt,
          maxTradesAllowed: multipliers.maxTradesAllowed,
          minGradeRequired: multipliers.minGradeRequired,
        },
        summary: multipliers.riskSummary,
      });
    }

    // No accountId — return a summary
    return NextResponse.json({
      status: 'ok',
      message: 'Risk Governor API. Pass ?accountId=<mt5_login> for account-specific risk data.',
      gates: ['Gate 13: Equity Curve Protection', 'Gate 14: Daily Circuit Breaker', 'Gate 15: Max Drawdown Governor'],
      thresholds: {
        dailyCaution: '3.0%',
        dailyWarning: '4.5%',
        dailyTerminal: '6.0%',
        drawdownYellow: '8.0%',
        drawdownOrange: '15.0%',
        drawdownRed: '20.0%',
        drawdownBlack: '25.0%',
      },
    });
  } catch (err: any) {
    console.error('[Risk API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
