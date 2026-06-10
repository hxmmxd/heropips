/**
 * POST /api/webhooks/nowpayments
 * Receives Instant Payment Notifications (IPN) from NOWPayments
 * and updates withdrawal status in Supabase.
 *
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 *
 * We handle TWO IPN shapes:
 *   - Payout/Withdrawal IPN: { id, batch_withdrawal_id, status, currency, amount, address, ... }
 *   - Payment IPN: { payment_id, payment_status, pay_address, ... }
 *
 * Since we only use payouts (user withdrawals), the payout shape is primary.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveConfig, verifyIpnSignature } from '@/lib/nowpayments';

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

// Map NOWPayments payout statuses → our internal statuses
const PAYOUT_STATUS_MAP: Record<string, string> = {
  creating:   'processing',
  waiting:    'processing',
  processing: 'processing',
  sending:    'processing',
  finished:   'completed',
  failed:     'failed',
  rejected:   'rejected',
};

// Map NOWPayments payment statuses (for backward compat)
const PAYMENT_STATUS_MAP: Record<string, string> = {
  waiting:        'pending',
  confirming:     'processing',
  confirmed:      'processing',
  sending:        'processing',
  partially_paid: 'partial',
  finished:       'completed',
  failed:         'failed',
  refunded:       'refunded',
  expired:        'expired',
};

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const rawBody = await request.text();

  // Parse body first — IPN signature requires sorted JSON keys, not raw body
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Verify signature per docs: sort keys → JSON.stringify → HMAC-SHA512
  const nowConfig = await getActiveConfig();
  const ipnSecret = nowConfig.ipn_secret || process.env.NOWPAYMENTS_IPN_SECRET;
  if (ipnSecret) {
    const sig = request.headers.get('x-nowpayments-sig') || '';
    if (!verifyIpnSignature(payload, sig, ipnSecret)) {
      console.warn('NOWPayments IPN: signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // ── Detect IPN type: Payout or Payment ──────────────────
  const isPayout = !!payload.batch_withdrawal_id || (payload.status && !payload.payment_status);

  if (isPayout) {
    // Payout IPN: { id, batch_withdrawal_id, status, currency, amount, address, hash, ... }
    const payoutId = String(payload.id);
    const batchId  = String(payload.batch_withdrawal_id || '');
    const status   = (payload.status || '').toLowerCase();
    const internalStatus = PAYOUT_STATUS_MAP[status] || status || 'unknown';

    // Find withdrawal by payout ID or batch ID
    let record: any = null;
    const { data: byPayout } = await supabaseAdmin
      .from('referral_withdrawals')
      .select('*')
      .eq('nowpayments_id', payoutId)
      .single();
    record = byPayout;

    if (!record && batchId) {
      const { data: byBatch } = await supabaseAdmin
        .from('referral_withdrawals')
        .select('*')
        .eq('batch_withdrawal_id', batchId)
        .single();
      record = byBatch;
    }

    if (!record) {
      // Not our record — silently acknowledge
      return NextResponse.json({ received: true });
    }

    // Update withdrawal record
    await supabaseAdmin
      .from('referral_withdrawals')
      .update({
        status: internalStatus,
        tx_hash: payload.hash || record.tx_hash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    // If payout failed or rejected, refund user's balance to profile
    if (internalStatus === 'failed' || internalStatus === 'rejected') {
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
            webhook_payout_status: internalStatus,
            failed_at: new Date().toISOString(),
          }
        })
        .eq('reference_id', record.id);
    }

    return NextResponse.json({ received: true });
  }

  // ── Payment IPN (handles both subscriptions and legacy withdrawals) ──
  const paymentId     = String(payload.payment_id || '');
  const paymentStatus = (payload.payment_status || '').toLowerCase();
  const internalStatus = PAYMENT_STATUS_MAP[paymentStatus] || paymentStatus || 'unknown';

  // 1. Check if it's a subscription checkout payment
  const { data: configRow } = await supabaseAdmin
    .from('platform_config')
    .select('value')
    .eq('key', 'pending_subscriptions')
    .single();

  const pendingMap = configRow?.value || {};
  const subTx = pendingMap[paymentId];

  if (subTx) {
    if (paymentStatus === 'finished' && subTx.status !== 'completed') {
      // Activate user subscription plan
      await supabaseAdmin
        .from('profiles')
        .update({
          plan: subTx.plan_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', subTx.user_id);

      subTx.status = 'completed';
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      subTx.status = paymentStatus;
    }

    // Save updated pending map back to platform_config
    await supabaseAdmin
      .from('platform_config')
      .upsert({
        key: 'pending_subscriptions',
        value: pendingMap,
        updated_at: new Date().toISOString()
      });

    return NextResponse.json({ received: true });
  }

  // 2. Check if it's a course purchase payment
  const { data: coursePendingRow } = await supabaseAdmin
    .from('platform_config')
    .select('value')
    .eq('key', 'pending_course_purchases')
    .single();

  const coursePendingMap = coursePendingRow?.value || {};
  const courseTx = coursePendingMap[paymentId];

  if (courseTx) {
    if (paymentStatus === 'finished' && courseTx.status !== 'completed') {
      // Check if already purchased (idempotency)
      const { data: existing } = await supabaseAdmin
        .from('course_purchases')
        .select('id')
        .eq('user_id', courseTx.user_id)
        .eq('category', courseTx.category)
        .limit(1);

      if (!existing || existing.length === 0) {
        // Unlock the category for the user
        await supabaseAdmin.from('course_purchases').insert({
          user_id: courseTx.user_id,
          category: courseTx.category,
          amount: courseTx.price_amount,
          payment_method: 'crypto',
          payment_ref: paymentId,
        });

        // Record wallet transaction for audit trail
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: courseTx.user_id,
          tx_type: 'course_purchase',
          amount: -courseTx.price_amount,
          status: 'completed',
          metadata: {
            category: courseTx.category,
            payment_method: 'crypto',
            payment_id: paymentId,
            pay_currency: courseTx.pay_currency,
            description: `Course category: ${courseTx.category} (crypto)`,
          },
          created_at: new Date().toISOString(),
        });
      }

      courseTx.status = 'completed';
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      courseTx.status = paymentStatus;
    }

    await supabaseAdmin.from('platform_config').upsert({
      key: 'pending_course_purchases',
      value: coursePendingMap,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  }

  // 3. Fallback to legacy referral withdrawal payment mapping
  const { data: record } = await supabaseAdmin
    .from('referral_withdrawals')
    .select('*')
    .eq('nowpayments_id', paymentId)
    .single();

  if (!record) {
    return NextResponse.json({ received: true });
  }

  await supabaseAdmin
    .from('referral_withdrawals')
    .update({
      status: internalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  // Refund balance on failure to profile
  if (internalStatus === 'failed' || internalStatus === 'expired') {
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
          webhook_payment_status: internalStatus,
          failed_at: new Date().toISOString(),
        }
      })
      .eq('reference_id', record.id);
  }

  return NextResponse.json({ received: true });
}
