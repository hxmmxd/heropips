/**
 * POST /api/withdrawals
 *
 * Flow:
 *   1. User raises a withdrawal request  → action: 'withdraw'     → status: 'pending'
 *   2. Admin approves it                 → action: 'approve'      → NOWPayments payout created
 *   3. Admin rejects it                  → action: 'reject'       → balance refunded
 *   4. Admin tests gateway               → action: 'test_gateway'
 *   5. User checks status                → action: 'check_status'
 *
 * Users can only withdraw in crypto (primarily USDT).
 * NOWPayments is never called on user request — only when admin approves.
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  createPayout,
  testConnection,
  getPayoutStatus,
  type CreatePayoutInput,
} from '@/lib/nowpayments';

export const dynamic = 'force-dynamic';

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

// ── Currency map: user-facing label → NOWPayments ticker ──
const CURRENCY_MAP: Record<string, string> = {
  'USDT (TRC-20)': 'usdttrc20',
  'USDT (ERC-20)': 'usdterc20',
  'BTC':           'btc',
  'ETH':           'eth',
  'BNB':           'bnbbsc',
  'USDC':          'usdc',
  'LTC':           'ltc',
  'DOGE':          'doge',
};

// ── Helpers ───────────────────────────────────────────────
async function isAdmin(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single();
  return !!data?.is_admin;
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  1. USER: Raise a withdrawal request (pending review)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'withdraw' || !action) {
    const { amount, currency, address } = body;

    if (!amount || !currency || !address) {
      return NextResponse.json({ error: 'Missing amount, currency, or address' }, { status: 400 });
    }

    if (amount < 50) {
      return NextResponse.json({ error: 'Minimum withdrawal is $50' }, { status: 400 });
    }

    // Validate currency
    const nowCurrency = CURRENCY_MAP[currency];
    if (!nowCurrency) {
      return NextResponse.json({ error: `Unsupported currency: ${currency}` }, { status: 400 });
    }

    // Check wallet balance from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    const available = profile?.wallet_balance ?? 0;
    if (available < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Deduct balance immediately (held until approved/rejected)
    await supabaseAdmin
      .from('profiles')
      .update({
        wallet_balance: available - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Create withdrawal request — just a DB record, NO NOWPayments call
    const { data: record, error: insertErr } = await supabaseAdmin
      .from('referral_withdrawals')
      .insert({
        user_id: user.id,
        amount_usd: amount,
        currency,
        nowpayments_currency: nowCurrency,
        address,
        status: 'pending',          // awaiting admin review
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      // Refund on insert failure
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: available, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Create ledger entry in wallet_transactions
    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        tx_type: 'withdrawal_request',
        status: 'pending',
        reference_id: record.id,
        metadata: {
          currency,
          address,
          nowpayments_currency: nowCurrency,
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      withdrawalId: record.id,
      status: 'pending',
      message: 'Withdrawal request submitted. It will be reviewed by admin.',
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2. ADMIN: Approve a withdrawal → trigger NOWPayments payout
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'approve') {
    if (!await isAdmin(supabaseAdmin, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { withdrawalId } = body;
    if (!withdrawalId) return NextResponse.json({ error: 'Missing withdrawalId' }, { status: 400 });

    // Fetch the pending withdrawal
    const { data: record } = await supabaseAdmin
      .from('referral_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (!record) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    if (record.status !== 'pending') {
      return NextResponse.json({ error: `Cannot approve — current status is "${record.status}"` }, { status: 400 });
    }

    // Mark as approved/processing
    await supabaseAdmin
      .from('referral_withdrawals')
      .update({ status: 'approved', approved_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', withdrawalId);

    // Now call NOWPayments to create the actual payout
    try {
      const payoutInput: CreatePayoutInput = {
        address: record.address,
        currency: record.nowpayments_currency,
        amount: record.amount_usd,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nowpayments`,
      };

      const payout = await createPayout(payoutInput);

      // Update record with NOWPayments IDs
      await supabaseAdmin
        .from('referral_withdrawals')
        .update({
          nowpayments_id: payout.id,
          batch_withdrawal_id: payout.batch_withdrawal_id,
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      // Update wallet_transactions reference to withdrawal_payout
      await supabaseAdmin
        .from('wallet_transactions')
        .update({
          status: 'completed',
          tx_type: 'withdrawal_payout',
          metadata: {
            nowpayments_id: payout.id,
            batch_withdrawal_id: payout.batch_withdrawal_id,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
          }
        })
        .eq('reference_id', withdrawalId);

      return NextResponse.json({
        success: true,
        withdrawalId,
        nowpaymentsId: payout.id,
        batchWithdrawalId: payout.batch_withdrawal_id,
        status: 'processing',
      });
    } catch (err: any) {
      // Mark failed but keep balance deducted (admin should investigate)
      await supabaseAdmin
        .from('referral_withdrawals')
        .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      return NextResponse.json({
        error: `NOWPayments payout failed: ${err.message}`,
        withdrawalId,
      }, { status: 500 });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  3. ADMIN: Reject a withdrawal → refund user balance
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'reject') {
    if (!await isAdmin(supabaseAdmin, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { withdrawalId, reason } = body;
    if (!withdrawalId) return NextResponse.json({ error: 'Missing withdrawalId' }, { status: 400 });

    const { data: record } = await supabaseAdmin
      .from('referral_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (!record) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    if (record.status !== 'pending') {
      return NextResponse.json({ error: `Cannot reject — current status is "${record.status}"` }, { status: 400 });
    }

    // Refund balance to profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', record.user_id)
      .single();

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({
          wallet_balance: (profile.wallet_balance || 0) + record.amount_usd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.user_id);
    }

    // Update wallet transaction status to failed/declined
    await supabaseAdmin
      .from('wallet_transactions')
      .update({
        status: 'failed',
        tx_type: 'withdrawal_declined',
        metadata: {
          reason: reason || 'Rejected by admin',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
        }
      })
      .eq('reference_id', withdrawalId);

    // Update withdrawal status
    await supabaseAdmin
      .from('referral_withdrawals')
      .update({
        status: 'rejected',
        rejected_by: user.id,
        error_message: reason || 'Rejected by admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    return NextResponse.json({ success: true, status: 'rejected' });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  4. USER: Check withdrawal status
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

    // If we have a NOWPayments ID, fetch live status
    if (record.nowpayments_id && ['processing', 'approved'].includes(record.status)) {
      try {
        const payoutStatus = await getPayoutStatus(record.nowpayments_id);
        await supabaseAdmin
          .from('referral_withdrawals')
          .update({ status: payoutStatus.status?.toLowerCase(), updated_at: new Date().toISOString() })
          .eq('id', withdrawalId);
        return NextResponse.json({ status: payoutStatus.status });
      } catch {
        // fallthrough to return DB status
      }
    }

    return NextResponse.json({ status: record.status });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  5. ADMIN: Test gateway connectivity
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'test_gateway') {
    if (!await isAdmin(supabaseAdmin, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = body.apiKey || process.env.NOWPAYMENTS_API_KEY;
    const result = await testConnection(apiKey);
    return NextResponse.json(result);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  6. ADMIN: List pending withdrawals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'list_pending') {
    if (!await isAdmin(supabaseAdmin, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: withdrawals } = await supabaseAdmin
      .from('referral_withdrawals')
      .select('*, profiles:user_id(email, full_name)')
      .in('status', ['pending'])
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ withdrawals: withdrawals || [] });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
