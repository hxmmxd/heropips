/**
 * Daily Reset Cron — GET /api/cron/daily-reset
 *
 * Triggered at 00:00 UTC. For each connected broker account:
 *  1. Generate yesterday's daily risk report
 *  2. Reset daily counters (dailyLossPct, tradesToday, dailyTier)
 *  3. Preserve: consecutiveLosses, drawdownPct, peakEquity
 *
 * Auth: Protected by CRON_SECRET (same as sync-deals).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { farmGetAccountInfo, farmGetPositions } from '@/lib/mt5farm';
import {
  getRiskState,
  saveRiskState,
  performDailyReset,
  generateDailyReport,
} from '@/lib/riskGovernor';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || '';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // ── Auth ──
  const { searchParams } = new URL(request.url);
  const secret =
    searchParams.get('secret') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdmin();
  const results: any[] = [];

  try {
    // ── Get all active broker accounts ──
    const { data: accounts, error: acctErr } = await admin
      .from('broker_accounts')
      .select('mt5_login, user_id, equity, balance')
      .eq('is_active', true);

    if (acctErr || !accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active broker accounts found',
        results: [],
      });
    }

    for (const acct of accounts) {
      const accountId = String(acct.mt5_login);

      try {
        // ── 1. Get current risk state ──
        const riskState = await getRiskState(accountId);
        if (!riskState) {
          results.push({ account: accountId, status: 'no_risk_state', skipped: true });
          continue;
        }

        // ── 2. Get today's closed deals for the report ──
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: closedDeals } = await admin
          .from('closed_deals')
          .select('profit')
          .eq('user_id', acct.user_id)
          .gte('close_time', `${yesterdayStr}T00:00:00Z`)
          .lte('close_time', `${yesterdayStr}T23:59:59Z`);

        const tradesWon = closedDeals?.filter(d => d.profit > 0).length || 0;
        const tradesLost = closedDeals?.filter(d => d.profit <= 0).length || 0;
        const realizedPnl = closedDeals?.reduce((a, d) => a + (d.profit || 0), 0) || 0;

        // Unrealized P&L from open positions
        let unrealizedPnl = 0;
        try {
          const positions = await farmGetPositions(accountId);
          unrealizedPnl = positions.reduce((a, p) => a + p.profit, 0);
        } catch {
          // MT5 might be disconnected — use 0
        }

        // ── 3. Generate daily risk report ──
        const reportSaved = await generateDailyReport(
          accountId,
          riskState,
          tradesWon,
          tradesLost,
          realizedPnl,
          unrealizedPnl
        );

        // ── 4. Get live equity/balance for reset ──
        let liveEquity = riskState.currentEquity;
        let liveBalance = Number(acct.balance) || liveEquity;

        try {
          const info = await farmGetAccountInfo(accountId);
          if (info) {
            liveEquity = info.equity;
            liveBalance = info.balance;
          }
        } catch {
          // Use Supabase values as fallback
          liveEquity = Number(acct.equity) || riskState.currentEquity;
          liveBalance = Number(acct.balance) || riskState.dailyStartBalance;
        }

        // ── 5. Perform daily reset ──
        const resetState = performDailyReset(riskState, liveEquity, liveBalance);
        await saveRiskState(resetState);

        results.push({
          account: accountId,
          status: 'ok',
          reportSaved,
          reportDate: yesterdayStr,
          tradesWon,
          tradesLost,
          realizedPnl: Math.round(realizedPnl * 100) / 100,
          unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
          newDailyStartEquity: Math.round(liveEquity * 100) / 100,
          newDailyStartBalance: Math.round(liveBalance * 100) / 100,
          consecutiveLossesPreserved: resetState.consecutiveLosses,
          drawdownPreserved: Math.round(resetState.drawdownPct * 100) / 100,
        });

        console.log(
          `[Daily Reset] ✅ Account ${accountId}: ` +
          `Report saved=${reportSaved}, ` +
          `${tradesWon}W/${tradesLost}L, ` +
          `P&L: $${realizedPnl.toFixed(2)}, ` +
          `New baseline: $${liveEquity.toFixed(2)}`
        );
      } catch (err: any) {
        console.error(`[Daily Reset] Error for account ${accountId}:`, err.message);
        results.push({ account: accountId, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      accountsProcessed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[Daily Reset] Fatal error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
