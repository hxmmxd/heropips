import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPaymentStatus } from '@/lib/nowpayments';

export const dynamic = 'force-dynamic';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    // 1. Fetch status from NOWPayments API
    const payment = await getPaymentStatus(paymentId);
    const status = payment.payment_status; // 'waiting', 'confirming', 'confirmed', 'sending', 'finished', 'failed', 'expired'

    // 2. If payment is finished, let's make sure the user profile plan is updated!
    if (status === 'finished') {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: configRow } = await supabaseAdmin
        .from('platform_config')
        .select('value')
        .eq('key', 'pending_subscriptions')
        .single();

      const pendingMap = configRow?.value || {};
      const tx = pendingMap[paymentId];
      if (tx && tx.status !== 'completed') {
        // Update user profile
        await supabaseAdmin
          .from('profiles')
          .update({
            plan: tx.plan_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', tx.user_id);

        // Mark as completed in pendingMap
        tx.status = 'completed';
        await supabaseAdmin
          .from('platform_config')
          .upsert({
            key: 'pending_subscriptions',
            value: pendingMap,
            updated_at: new Date().toISOString()
          });
      }
    }

    return NextResponse.json({
      status,
      pay_address: (payment as any).pay_address,
      pay_amount: (payment as any).pay_amount,
      pay_currency: (payment as any).pay_currency
    });
  } catch (err: any) {
    console.error('[status] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
