import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FARM_HEADERS, sidecarUrl, resolveAccountId, syncFarmConfig } from '@/lib/mt5farm';
import {
  getRiskState,
  saveRiskState,
  updateTradeResult,
  updateRiskMetrics,
  updateEquityCurve,
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
  // Verify cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await syncFarmConfig();



  const admin = getAdmin();
  const results: any[] = [];

  try {
    // Get all brokers from the Supabase database
    let brokers: any[] = [];
    try {
      const { data } = await admin
        .from('broker_accounts')
        .select('id, user_id, mt5_login, metaapi_id, server, status, broker_name');
      if (data) {
        brokers = data.map((b: any) => ({
          id:     b.id,
          userId: b.user_id,
          login:  b.mt5_login || b.metaapi_id,
          server: b.server,
          status: b.status,
          name:   b.broker_name,
        }));
      }
    } catch (err: any) {
      console.error('[Sync Deals Cron] Failed to fetch brokers from Supabase:', err.message);
    }

    if (brokers.length === 0) {
      return NextResponse.json({ message: 'No brokers found', results: [] });
    }

    for (const broker of brokers) {
      const accountId = broker.id || broker.login;
      const brokerId  = broker.id;
      const userId    = broker.userId;

      if (!userId || !accountId) continue;

      try {
        const resolvedId = await resolveAccountId(accountId);
        // Fetch last 24h of deals — use unix timestamps for MT5 Farm API
        const now       = new Date();
        const fromTs    = Math.floor((now.getTime() - 86400000) / 1000);
        const toTs      = Math.floor(now.getTime() / 1000);

        const [dealsRes, infoRes, posRes] = await Promise.all([
          fetch(sidecarUrl(resolvedId, `history/deals?from_ts=${fromTs}&to_ts=${toTs}`), {
            headers: FARM_HEADERS, signal: AbortSignal.timeout(15000),
          }),
          fetch(sidecarUrl(resolvedId, 'account-information'), {
            headers: FARM_HEADERS, signal: AbortSignal.timeout(8000),
          }),
          fetch(sidecarUrl(resolvedId, 'positions'), {
            headers: FARM_HEADERS, signal: AbortSignal.timeout(8000),
          }),
        ]);

        const rawDeals    = dealsRes.ok ? await dealsRes.json() : [];
        const info        = infoRes.ok  ? await infoRes.json()  : {};
        const rawPositions = posRes.ok  ? await posRes.json()   : [];

        const allDeals = Array.isArray(rawDeals) ? rawDeals : [];

        // Farm API uses 'entry' field ('DEAL_ENTRY_IN'/'DEAL_ENTRY_OUT')
        // and 'type' = 'ORDER_TYPE_BUY' | 'ORDER_TYPE_SELL'
        const tradingDeals = allDeals.filter((d: any) =>
          d.type === 'ORDER_TYPE_BUY' || d.type === 'ORDER_TYPE_SELL'
        );

        // Group and pair deals by positionId
        const positionDeals: Record<string, any[]> = {};
        for (const d of tradingDeals) {
          const posId = d.positionId || d.id;
          if (!positionDeals[posId]) positionDeals[posId] = [];
          positionDeals[posId].push(d);
        }

        const closedTrades: any[] = [];
        for (const [, deals] of Object.entries(positionDeals)) {
          const entryDeal = deals.find((d: any) => d.entry === 'DEAL_ENTRY_IN')  || deals[0];
          const exitDeal  = deals.find((d: any) => d.entry === 'DEAL_ENTRY_OUT') || deals[deals.length - 1];
          if (exitDeal && exitDeal.profit !== undefined) {
            closedTrades.push({
              user_id:     userId,
              broker_id:   brokerId,
              deal_id:     exitDeal.id || entryDeal.id,
              symbol:      exitDeal.symbol || entryDeal.symbol,
              type:        entryDeal.type || 'ORDER_TYPE_BUY',
              volume:      entryDeal.volume || exitDeal.volume || 0,
              profit:      exitDeal.profit  || 0,
              commission:  (entryDeal.commission || 0) + (exitDeal.commission || 0),
              swap:        exitDeal.swap || 0,
              entry_price: entryDeal.price || 0,
              exit_price:  exitDeal.price  || 0,
              open_time:   entryDeal.time  || null,
              close_time:  exitDeal.time   || null,
              position_id: exitDeal.positionId || entryDeal.positionId || null,
            });
          }
        }

        // Upsert to closed_deals
        let dealsUpserted = 0;
        let newDealCount = 0;
        const newDeals: any[] = [];
        if (closedTrades.length > 0) {
          // Check which deals already exist to avoid re-counting streaks
          const dealIds = closedTrades.map(ct => ct.deal_id);
          const { data: existingDeals } = await admin
            .from('closed_deals')
            .select('deal_id')
            .in('deal_id', dealIds);
          const existingIds = new Set((existingDeals || []).map((d: any) => d.deal_id));

          for (const ct of closedTrades) {
            if (!existingIds.has(ct.deal_id)) {
              newDeals.push(ct);
            }
          }
          newDealCount = newDeals.length;

          const { error } = await admin
            .from('closed_deals')
            .upsert(closedTrades, { onConflict: 'deal_id', ignoreDuplicates: true });
          if (!error) dealsUpserted = closedTrades.length;

          // Sync back to trades table
          for (const ct of closedTrades) {
            await admin
              .from('trades')
              .update({
                close_price: ct.exit_price,
                pnl:         ct.profit,
                status:      'closed',
                updated_at:  new Date().toISOString(),
              })
              .eq('user_id', ct.user_id)
              .eq('symbol', ct.symbol)
              .eq('status', 'open')
              .eq('broker_id', ct.broker_id)
              .order('created_at', { ascending: false })
              .limit(1);
          }

          // ── Risk Governor: Update streak ONLY for genuinely new deals ──
          if (newDeals.length > 0) {
            try {
              let riskState = await getRiskState(accountId);
              if (riskState) {
                for (const ct of newDeals) {
                  const isWin = ct.profit > 0;
                  riskState = updateTradeResult(riskState, isWin);
                }

                if (info.equity > 0) {
                  riskState = updateRiskMetrics(riskState, info.equity, info.balance);
                }

                const equityHistory = newDeals.map((_ct, i) =>
                  (info.equity || riskState!.currentEquity) - newDeals.slice(i + 1).reduce((a, d) => a + d.profit, 0)
                );
                if (equityHistory.length > 0) {
                  riskState = updateEquityCurve(riskState, equityHistory);
                }

                await saveRiskState(riskState);
                console.log(
                  `[Sync Deals] Risk updated for ${accountId}: ` +
                  `${newDeals.length} new deals | ` +
                  `Streak W${riskState.consecutiveWins}/L${riskState.consecutiveLosses}, ` +
                  `DD: ${riskState.drawdownPct.toFixed(2)}%`
                );
              }
            } catch (riskErr: any) {
              console.warn(`[Sync Deals] Risk state update failed:`, riskErr.message);
            }
          }
        }

        // Reconcile open positions
        const positions = Array.isArray(rawPositions) ? rawPositions : [];
        const openPositionSymbols = positions.map((p: any) => p.symbol);
        const { data: dbOpenTrades } = await admin
          .from('trades')
          .select('id, symbol')
          .eq('user_id', userId)
          .eq('broker_id', brokerId)
          .eq('status', 'open');

        for (const ot of (dbOpenTrades || [])) {
          if (!openPositionSymbols.includes(ot.symbol)) {
            const matchedClosed = closedTrades.find(ct => ct.symbol === ot.symbol);
            await admin
              .from('trades')
              .update({
                status:      'closed',
                close_price: matchedClosed?.exit_price || null,
                pnl:         matchedClosed?.profit     || 0,
                updated_at:  new Date().toISOString(),
              })
              .eq('id', ot.id);
          }
        }

        // Save daily snapshot
        const today    = new Date().toISOString().split('T')[0];
        const openPnl  = positions.reduce((a: number, p: any) => a + (p.profit || 0), 0);
        const netProfit = closedTrades.reduce((a: number, d: any) => a + (d.profit || 0), 0);

        await admin.from('daily_snapshots').upsert({
          user_id:          userId,
          broker_id:        brokerId,
          date:             today,
          balance:          info.balance || 0,
          equity:           info.equity  || info.balance || 0,
          margin:           info.margin  || 0,
          open_positions:   positions.length,
          open_pnl:         Math.round(openPnl   * 100) / 100,
          net_profit_closed: Math.round(netProfit * 100) / 100,
          total_trades:     closedTrades.length,
          win_rate:         closedTrades.length > 0
            ? Math.round((closedTrades.filter(d => d.profit > 0).length / closedTrades.length) * 1000) / 10
            : 0,
        }, { onConflict: 'user_id,broker_id,date' });

        results.push({
          broker:       broker.login || brokerId,
          rawDeals:     allDeals.length,
          closedTrades: closedTrades.length,
          dealsUpserted,
          snapshotSaved: true,
          balance:      info.balance,
        });
      } catch (err: any) {
        results.push({ broker: broker.login || brokerId, error: err.message });
      }
    }

    return NextResponse.json({
      success:          true,
      timestamp:        new Date().toISOString(),
      brokersProcessed: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
