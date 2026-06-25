import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { distributeRebate } from '@/lib/rebateEngine';

export const dynamic = 'force-dynamic';

import { FARM_HEADERS, sidecarUrl, resolveAccountId } from '@/lib/mt5farm';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Verify cron authorization token
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch global risk settings
    const { data: riskSettingsRow } = await supabaseAdmin
      .from('rebate_risk_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const riskSettings = riskSettingsRow || {
      exclude_hedged_positions: true,
      hedge_time_buffer_seconds: 15,
      max_drawdown_limit: 35.00,
      spread_protection_multiplier: 0.70,
      clawback_grace_period_days: 14,
    };

    // 3. Fetch active promotions
    const nowStr = new Date().toISOString();
    const { data: promotions } = await supabaseAdmin
      .from('rebate_promotions')
      .select('*')
      .lte('start_time', nowStr)
      .gte('end_time', nowStr);

    // 4. Fetch volume tiers
    const { data: volumeTiers } = await supabaseAdmin
      .from('rebate_volume_tiers')
      .select('*')
      .order('min_monthly_lots', { ascending: true });

    // 5. Fetch all online connected broker accounts
    const { data: accounts, error: fetchErr } = await supabaseAdmin
      .from('broker_accounts')
      .select('*')
      .eq('status', 'connected');

    if (fetchErr) throw fetchErr;
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ success: true, message: 'No connected accounts found.' });
    }

    // MT5 Farm authentication is handled via FARM_HEADERS (X-API-Key)
    let processedDealsCount = 0;
    let totalRebatesCredited = 0;

    for (const account of accounts) {
      const accountId = account.mt5_login || account.metaapi_id || account.id;
      const resolvedId = await resolveAccountId(accountId);

      // 6. Drawdown safeguard limit check
      let inDrawdownLimit = true;
      try {
        const infoRes = await fetch(sidecarUrl(resolvedId, 'account-information'), { headers: FARM_HEADERS });
        if (infoRes.ok) {
          const info = await infoRes.json();
          const balance = info.balance || 0;
          const equity  = info.equity  || 0;
          if (balance > 0) {
            const drawdownPercent = ((balance - equity) / balance) * 100;
            if (drawdownPercent > riskSettings.max_drawdown_limit) {
              console.warn(`[Rebate Sync] Account ${account.id} in extreme drawdown: ${drawdownPercent.toFixed(2)}% > ${riskSettings.max_drawdown_limit}%`);
              inDrawdownLimit = false;
            }
          }
        }
      } catch (e) {
        console.error(`[Rebate Sync] Drawdown check failed for account ${account.id}:`, e);
      }

      if (!inDrawdownLimit) {
        console.warn(`[Rebate Sync] Skipping account ${account.id} due to drawdown limits.`);
        continue;
      }

      // 7. Calculate monthly lot volume for user tier scale
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthTxs } = await supabaseAdmin
        .from('wallet_transactions')
        .select('metadata')
        .eq('user_id', account.user_id)
        .eq('tx_type', 'rebate')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      const monthlyLots = (monthTxs || []).reduce((sum: number, tx: any) => sum + (tx.metadata?.volume || 0), 0);
      const matchingTier = volumeTiers?.find(
        (t: any) => monthlyLots >= Number(t.min_monthly_lots) && monthlyLots < Number(t.max_monthly_lots)
      );
      const tierMultiplier = matchingTier ? Number(matchingTier.payout_multiplier) : 1.00;

      // Sync deals timeframe — use unix timestamps for MT5 Farm API
      const syncFrom = account.last_rebate_sync_at
        ? new Date(account.last_rebate_sync_at).getTime()
        : Date.now() - 3 * 24 * 60 * 60 * 1000;
      const endTime = new Date().toISOString();
      const fromTs  = Math.floor(syncFrom / 1000);
      const toTs    = Math.floor(Date.now() / 1000);

      const url = sidecarUrl(resolvedId, `history/deals?from_ts=${fromTs}&to_ts=${toTs}`);
      const res = await fetch(url, { headers: FARM_HEADERS });
      if (!res.ok) {
        console.error(`[Rebate Sync] Failed to fetch deals for ${account.id}: ${res.statusText}`);
        continue;
      }

      const deals = await res.json();
      if (!Array.isArray(deals)) continue;

      // Fetch rules config for this broker
      const { data: rules } = await supabaseAdmin
        .from('rebate_rules')
        .select('*')
        .eq('broker_provider_id', account.broker_provider_id);

      // Fetch user profile plan to apply correct free/pro/enterprise multiplier
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan, wallet_balance')
        .eq('id', account.user_id)
        .maybeSingle();

      const userPlan = profile?.plan || 'free';
      const currentBalance = profile?.wallet_balance || 0;

      for (const deal of deals) {
        // Only credit deals that close positions — farm uses 'entry' field
        if (deal.entry !== 'DEAL_ENTRY_OUT' && deal.entry !== 'DEAL_ENTRY_INOUT') continue;

        // Double-spend check
        const { data: existingTx } = await supabaseAdmin
          .from('wallet_transactions')
          .select('id')
          .eq('reference_id', deal.id)
          .maybeSingle();

        if (existingTx) continue;

        // MTP check: estimate hold time from deal timestamps
        // Farm doesn't expose per-position deal history — use deal time directly
        let holdTimeSeconds = 99999;
        try {
          // Fetch same time window and find the matching entry deal
          const entryDeals = deals.filter((d: any) =>
            d.positionId === deal.positionId && d.entry === 'DEAL_ENTRY_IN'
          );
          if (entryDeals.length > 0) {
            const entryDeal = entryDeals[0];
            const entryTime = new Date(entryDeal.time).getTime();
            const closeTime = new Date(deal.time).getTime();
            holdTimeSeconds = (closeTime - entryTime) / 1000;
          }
        } catch (e) {
          console.error(`[Rebate Sync] Hold time fetch failed:`, e);
        }

        // Match rate
        const matchingRule = rules?.find(r => r.symbol === deal.symbol) 
          || rules?.find(r => r.symbol === '*');

        const baseRate = matchingRule ? Number(matchingRule.rebate_per_lot) : 2.00;
        const minHoldTime = matchingRule ? matchingRule.min_hold_time_seconds : 120;

        // MTP Hold time validation
        if (holdTimeSeconds < minHoldTime) {
          console.log(`[Rebate Sync] Deal ${deal.id} skipped (Hold time ${holdTimeSeconds}s < ${minHoldTime}s)`);
          continue;
        }

        // Apply plan multiplier
        let planMultiplier = 0.60;
        if (matchingRule) {
          planMultiplier = userPlan === 'enterprise' 
            ? Number(matchingRule.enterprise_multiplier) 
            : userPlan === 'pro' 
              ? Number(matchingRule.pro_multiplier) 
              : Number(matchingRule.free_multiplier);
        } else {
          planMultiplier = userPlan === 'enterprise' ? 1.00 : userPlan === 'pro' ? 0.80 : 0.60;
        }

        // Apply dynamic promotion boosts
        const activePromo = promotions?.find((p: any) => p.symbol === deal.symbol || p.symbol === '*');
        const promoMultiplier = activePromo ? Number(activePromo.multiplier) : 1.00;

        // Multi-Account Hedge correlation check
        if (riskSettings.exclude_hedged_positions) {
          const dealTime = new Date(deal.time);
          const timeBuffer = riskSettings.hedge_time_buffer_seconds * 1000;
          const minTime = new Date(dealTime.getTime() - timeBuffer).toISOString();
          const maxTime = new Date(dealTime.getTime() + timeBuffer).toISOString();
          // Farm API uses ORDER_TYPE_* for deal types
          const opposingType = deal.type === 'ORDER_TYPE_BUY' ? 'ORDER_TYPE_SELL' : 'ORDER_TYPE_BUY';

          const { data: hedgeTx } = await supabaseAdmin
            .from('wallet_transactions')
            .select('id')
            .eq('user_id', account.user_id)
            .eq('tx_type', 'rebate')
            .eq('metadata->>symbol', deal.symbol)
            .eq('metadata->>deal_type', opposingType)
            .gte('metadata->>deal_time', minTime)
            .lte('metadata->>deal_time', maxTime)
            .limit(1)
            .maybeSingle();

          if (hedgeTx) {
            console.warn(`[Rebate Sync] Deal ${deal.id} flagged as hedge. Rebate disqualified.`);
            continue;
          }
        }

        // Calculate final rebate amount
        let finalRebateAmount = Number((deal.volume * baseRate * planMultiplier * tierMultiplier * promoMultiplier).toFixed(2));
        if (finalRebateAmount <= 0) continue;

        // Apply revenue protection cap based on broker commission charges
        if (deal.commission) {
          const brokerCharges = Math.abs(Number(deal.commission));
          const maxAllowed = brokerCharges * Number(riskSettings.spread_protection_multiplier);
          if (finalRebateAmount > maxAllowed) {
            console.log(`[Rebate Sync] Deal ${deal.id} payout capped to revenue guard: $${maxAllowed.toFixed(2)} (originally $${finalRebateAmount.toFixed(2)})`);
            finalRebateAmount = Number(maxAllowed.toFixed(2));
          }
        }

        // Write ledger transaction
        const { error: txErr } = await supabaseAdmin
          .from('wallet_transactions')
          .insert({
            user_id: account.user_id,
            amount: finalRebateAmount,
            tx_type: 'rebate',
            status: 'completed',
            reference_id: deal.id,
            metadata: {
              symbol: deal.symbol,
              volume: deal.volume,
              hold_time_seconds: holdTimeSeconds,
              rate: baseRate,
              plan_multiplier: planMultiplier,
              tier_multiplier: tierMultiplier,
              promo_multiplier: promoMultiplier,
              deal_time: deal.time,
              deal_type: deal.type,
              broker_account_id: account.id
            }
          });

        if (txErr) {
          console.error(`[Rebate Sync] Failed to write ledger:`, txErr.message);
          continue;
        }

        // Credit user profile balance
        const { error: balErr } = await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: currentBalance + finalRebateAmount })
          .eq('id', account.user_id);

        if (balErr) {
          console.error(`[Rebate Sync] Failed to update balance:`, balErr.message);
        } else {
          processedDealsCount++;
          totalRebatesCredited += finalRebateAmount;
        }

        // Log trade to trade_log for milestone tracking
        await supabaseAdmin
          .from('trade_log')
          .upsert({
            user_id: account.user_id,
            broker_account_id: account.id,
            deal_id: deal.id,
            symbol: deal.symbol,
            deal_type: deal.type,
            volume: deal.volume,
            profit: deal.profit || 0,
            commission: deal.commission || 0,
            swap: deal.swap || 0,
            entry_price: deal.entryPrice || 0,
            exit_price: deal.exitPrice || 0,
            hold_time_seconds: holdTimeSeconds,
            opened_at: deal.brokerTime || deal.time,
            closed_at: deal.time,
            rebate_processed: true,
          }, { onConflict: 'deal_id' });

        // Multi-level distribution: walk upline and distribute referral rebates
        try {
          await distributeRebate(
            {
              id: deal.id,
              user_id: account.user_id,
              broker_account_id: account.id,
              deal_id: deal.id,
              symbol: deal.symbol,
              deal_type: deal.type,
              volume: deal.volume,
              profit: deal.profit || 0,
              commission: deal.commission || 0,
              closed_at: deal.time,
            },
            finalRebateAmount
          );
        } catch (distErr: any) {
          console.error(`[Rebate Sync] Multi-level distribution failed for deal ${deal.id}:`, distErr.message);
        }
      }

      // Update sync time
      await supabaseAdmin
        .from('broker_accounts')
        .update({ last_rebate_sync_at: endTime })
        .eq('id', account.id);
    }

    return NextResponse.json({
      success: true,
      processed_deals: processedDealsCount,
      total_credited: totalRebatesCredited
    });
  } catch (err: any) {
    console.error('[Rebate Sync Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
