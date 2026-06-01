import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const token = process.env.META_API_TOKEN || '';
const MT_CLIENT_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Verify cron authorization token (protect from public invocations)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch all online/connected broker accounts
    const { data: accounts, error: fetchErr } = await supabaseAdmin
      .from('broker_accounts')
      .select('*')
      .eq('status', 'connected');

    if (fetchErr) throw fetchErr;
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ success: true, message: 'No connected accounts found.' });
    }

    const headers = { 'auth-token': token, 'Accept': 'application/json' };
    let processedDealsCount = 0;
    let totalRebatesCredited = 0;

    for (const account of accounts) {
      // Fallback to last 3 days if account was never synced
      const startTime = account.last_rebate_sync_at 
        ? new Date(account.last_rebate_sync_at).toISOString() 
        : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();

      // Fetch deals for this account
      const url = `${MT_CLIENT_BASE}/users/current/accounts/${account.metaapi_id || account.id}/history-deals/time/${startTime}/${endTime}`;
      const res = await fetch(url, { headers });
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
        // Only credit deals that close positions (DEAL_ENTRY_OUT / DEAL_ENTRY_INOUT)
        if (deal.entryType !== 'DEAL_ENTRY_OUT' && deal.entryType !== 'DEAL_ENTRY_INOUT') continue;

        // Double-spend check: check if deal.id is already in the ledger
        const { data: existingTx } = await supabaseAdmin
          .from('wallet_transactions')
          .select('id')
          .eq('reference_id', deal.id)
          .maybeSingle();

        if (existingTx) continue; // Skip already credited deals

        // MTP check: Get opening deal to compute hold time
        let holdTimeSeconds = 99999;
        try {
          const posDealsUrl = `${MT_CLIENT_BASE}/users/current/accounts/${account.metaapi_id || account.id}/history-deals/position/${deal.positionId}`;
          const posDealsRes = await fetch(posDealsUrl, { headers });
          if (posDealsRes.ok) {
            const posDeals = await posDealsRes.json();
            if (Array.isArray(posDeals)) {
              const entryDeal = posDeals.find(d => d.entryType === 'DEAL_ENTRY_IN');
              if (entryDeal) {
                const entryTime = new Date(entryDeal.time).getTime();
                const closeTime = new Date(deal.time).getTime();
                holdTimeSeconds = (closeTime - entryTime) / 1000;
              }
            }
          }
        } catch (e) {
          console.error(`[Rebate Sync] Hold time fetch failed:`, e);
        }

        // Match rate (Symbol-specific rule or fallback to generic '*' rule)
        const matchingRule = rules?.find(r => r.symbol === deal.symbol) 
          || rules?.find(r => r.symbol === '*');

        const baseRate = matchingRule ? matchingRule.rebate_per_lot : 1.50; // Fallback default
        const minHoldTime = matchingRule ? matchingRule.min_hold_time_seconds : 120; // 2 minutes

        // MTP Hold time validation
        if (holdTimeSeconds < minHoldTime) {
          console.log(`[Rebate Sync] Deal ${deal.id} skipped (Hold time ${holdTimeSeconds}s < ${minHoldTime}s)`);
          continue;
        }

        // Apply plan multiplier
        let planMultiplier = 0.60;
        if (matchingRule) {
          planMultiplier = userPlan === 'enterprise' 
            ? matchingRule.enterprise_multiplier 
            : userPlan === 'pro' 
              ? matchingRule.pro_multiplier 
              : matchingRule.free_multiplier;
        } else {
          planMultiplier = userPlan === 'enterprise' ? 1.00 : userPlan === 'pro' ? 0.80 : 0.60;
        }

        const finalRebateAmount = Number((deal.volume * baseRate * planMultiplier).toFixed(2));
        if (finalRebateAmount <= 0) continue;

        // Database write operations
        // A. Insert wallet_transaction ledger record
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
              deal_time: deal.time,
              broker_account_id: account.id
            }
          });

        if (txErr) {
          console.error(`[Rebate Sync] Failed to write ledger:`, txErr.message);
          continue;
        }

        // B. Credit user's wallet_balance
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
      }

      // Update account's sync timestamp to current end time
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
