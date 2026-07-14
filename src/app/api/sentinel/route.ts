/**
 * Sentinel API — GET/POST /api/sentinel
 *
 * GET  → current sentinel status
 * POST ?action=start  → start sentinel (requires accountId + userId in body)
 * POST ?action=stop   → stop sentinel
 */

import { NextResponse } from 'next/server';
import {
  startSentinel,
  stopSentinel,
  getSentinelStatus,
  isSentinelRunning,
} from '@/lib/sentinel';
import {
  getRiskState,
  saveRiskState,
  evaluateAllRiskGates,
} from '@/lib/riskGovernor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = getSentinelStatus();

    // If running and has an accountId, also fetch live risk gate evaluations
    let gateStatus = null;
    if (status.running && status.accountId) {
      const riskState = await getRiskState(status.accountId);
      if (riskState) {
        const { multipliers, gates } = evaluateAllRiskGates(riskState);
        gateStatus = {
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
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      sentinel: status,
      risk: gateStatus,
    });
  } catch (err: any) {
    console.error('[Sentinel API] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stop') {
      stopSentinel();
      return NextResponse.json({
        status: 'ok',
        message: 'Sentinel stopped',
        sentinel: getSentinelStatus(),
      });
    }

    if (action === 'start') {
      if (isSentinelRunning()) {
        return NextResponse.json({
          status: 'already_running',
          message: 'Sentinel is already running',
          sentinel: getSentinelStatus(),
        });
      }

      // Get accountId from body or auto-detect
      let accountId: string | null = null;
      let userId: string | null = null;

      try {
        const body = await request.json();
        accountId = body.accountId || null;
        userId = body.userId || null;
      } catch {
        // No body — auto-detect
      }

      // Auto-detect from Supabase if not provided
      if (!accountId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const { data } = await sb
            .from('broker_accounts')
            .select('mt5_login, user_id')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (data?.mt5_login) {
            accountId = String(data.mt5_login);
            userId = data.user_id || 'system';
          }
        } catch (detectErr: any) {
          console.warn('[Sentinel API] Auto-detect failed:', detectErr.message);
        }
      }

      if (!accountId) {
        return NextResponse.json({
          status: 'error',
          message: 'No account found. Connect a broker first.',
        }, { status: 400 });
      }

      const started = startSentinel(accountId, userId || 'system');

      return NextResponse.json({
        status: started ? 'ok' : 'already_running',
        message: started ? `Sentinel started for account ${accountId}` : 'Sentinel already running',
        sentinel: getSentinelStatus(),
      });
    }

    if (action === 'reset-streak') {
      const sentinelStatus = getSentinelStatus();
      const acctId = sentinelStatus.accountId;
      if (!acctId) {
        return NextResponse.json({ status: 'error', message: 'No active account' }, { status: 400 });
      }
      const riskState = await getRiskState(acctId);
      if (riskState) {
        riskState.consecutiveLosses = 0;
        riskState.consecutiveWins = 0;
        riskState.tradesToday = 0;
        await saveRiskState(riskState);
        return NextResponse.json({ status: 'ok', message: 'Streak counters reset to 0' });
      }
      return NextResponse.json({ status: 'error', message: 'No risk state found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Invalid action. Use ?action=start, ?action=stop, or ?action=reset-streak',
    }, { status: 400 });
  } catch (err: any) {
    console.error('[Sentinel API] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
