/**
 * POST /api/webhooks/nowpayments
 * Receives Instant Payment Notifications (IPN) from NOWPayments
 * and updates withdrawal status in Supabase.
 *
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JtP3F6#ipn
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

function verifyIpnSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha512', secret);
  hmac.update(body);
  return hmac.digest('hex') === signature;
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const rawBody = await request.text();

  // Verify signature if IPN secret is configured
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (ipnSecret) {
    const sig = request.headers.get('x-nowpayments-sig') || '';
    if (!verifyIpnSignature(rawBody, sig, ipnSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    payment_id,
    payment_status,
    outcome,
    actually_paid,
    outcome_amount,
    outcome_currency,
  } = payload;

  // Map NOWPayments status to our internal status
  const statusMap: Record<string, string> = {
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

  const internalStatus = statusMap[payment_status?.toLowerCase()] || payment_status?.toLowerCase() || 'unknown';

  // Find the withdrawal record
  const { data: record } = await supabaseAdmin
    .from('referral_withdrawals')
    .select('*')
    .eq('nowpayments_id', String(payment_id))
    .single();

  if (!record) {
    // Not our record — silently acknowledge
    return NextResponse.json({ received: true });
  }

  // Update status
  await supabaseAdmin
    .from('referral_withdrawals')
    .update({
      status: internalStatus,
      outcome_amount: outcome?.amount || outcome_amount || actually_paid,
      outcome_currency: outcome?.currency || outcome_currency,
      outcome_hash: outcome?.hash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  // If payment failed, refund balance
  if (internalStatus === 'failed' || internalStatus === 'expired') {
    const { data: wallet } = await supabaseAdmin
      .from('referral_wallets')
      .select('available_balance')
      .eq('user_id', record.user_id)
      .single();

    if (wallet) {
      await supabaseAdmin
        .from('referral_wallets')
        .update({
          available_balance: (wallet.available_balance || 0) + record.amount_usd,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', record.user_id);
    }
  }

  return NextResponse.json({ received: true });
}
