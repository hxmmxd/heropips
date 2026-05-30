/**
 * POST /api/withdrawals  — Initiate a referral earnings withdrawal via NOWPayments
 * POST /api/withdrawals/status — Check status of a withdrawal
 * POST /api/withdrawals/test-gateway — Admin: test NOWPayments connectivity
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  createPayout,
  testConnection,
  getAvailableCurrencies,
  estimateAmount,
  getPayoutStatus,
  type CreatePayoutInput,
} from '@/lib/nowpayments';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabaseAdmin;
}

// ── Currency map: user-facing → NOWPayments code ─────────
const CURRENCY_MAP: Record<string, string> = {
  'USDT (TRC-20)': 'usdttrc20',
  'USDT (ERC-20)': 'usdterc20',
  'BTC':           'btc',
  'ETH':           'eth',
  'BNB':           'bnbbsc',
  'USDC':          'usdc',
};

export async function POST(request: Request) {
  const supabase = createServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  // ── Test gateway (admin only) ───────────────────────────
  if (action === 'test_gateway') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const apiKey = body.apiKey || process.env.NOWPAYMENTS_API_KEY;
    const result = await testConnection(apiKey);
    return NextResponse.json(result);
  }

  // ── Fetch available currencies (admin only) ─────────────
  if (action === 'get_currencies') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
      const currencies = await getAvailableCurrencies();
      return NextResponse.json({ currencies });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ── Estimate exchange amount ────────────────────────────
  if (action === 'estimate') {
    const { amount, currency } = body;
    const nowCode = CURRENCY_MAP[currency] || currency.toLowerCase();
    try {
      const est = await estimateAmount(amount, 'usd', nowCode);
      return NextResponse.json(est);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ── Check withdrawal status ─────────────────────────────
  if (action === 'check_status') {
    const { withdrawalId } = body;
    if (!withdrawalId) return NextResponse.json({ error: 'Missing withdrawalId' }, { status: 400 });

    // Verify ownership
    const { data: record } = await supabaseAdmin
      .from('referral_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .eq('user_id', user.id)
      .single();

    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (record.nowpayments_id) {
      try {
        const status = await getPayoutStatus(record.nowpayments_id);
        // Update DB status
        await supabaseAdmin
          .from('referral_withdrawals')
          .update({ status: status.status?.toLowerCase(), updated_at: new Date().toISOString() })
          .eq('id', withdrawalId);
        return NextResponse.json({ status: status.status, outcome: status.outcome });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ status: record.status });
  }

  // ── Create withdrawal ───────────────────────────────────
  if (action === 'withdraw' || !action) {
    const { amount, currency, address } = body;

    if (!amount || !currency || !address) {
      return NextResponse.json({ error: 'Missing amount, currency, or address' }, { status: 400 });
    }

    if (amount < 50) {
      return NextResponse.json({ error: 'Minimum withdrawal is $50' }, { status: 400 });
    }

    // Fetch user's referral wallet balance from DB
    const { data: wallet } = await supabaseAdmin
      .from('referral_wallets')
      .select('available_balance')
      .eq('user_id', user.id)
      .single();

    const available = wallet?.available_balance ?? 0;
    if (available < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Map currency to NOWPayments code
    const nowCurrency = CURRENCY_MAP[currency] || currency.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Create record in pending state first
    const { data: record, error: insertErr } = await supabaseAdmin
      .from('referral_withdrawals')
      .insert({
        user_id: user.id,
        amount_usd: amount,
        currency,
        nowpayments_currency: nowCurrency,
        address,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Deduct from wallet balance
    await supabaseAdmin
      .from('referral_wallets')
      .update({
        available_balance: available - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Call NOWPayments
    try {
      const payoutInput: CreatePayoutInput = {
        address,
        currency: nowCurrency,
        amount,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nowpayments`,
        extra_id: record.id,
      };

      const payout = await createPayout(payoutInput);

      // Update record with NOWPayments ID
      await supabaseAdmin
        .from('referral_withdrawals')
        .update({
          nowpayments_id: payout.id || payout.payment_id,
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      return NextResponse.json({
        success: true,
        withdrawalId: record.id,
        nowpaymentsId: payout.id,
        status: 'processing',
        payAddress: payout.pay_address,
      });
    } catch (err: any) {
      // Refund wallet balance on NOWPayments failure
      await supabaseAdmin
        .from('referral_wallets')
        .update({
          available_balance: available,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      await supabaseAdmin
        .from('referral_withdrawals')
        .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
        .eq('id', record.id);

      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
