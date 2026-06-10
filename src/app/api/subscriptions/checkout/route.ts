import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createInvoice } from '@/lib/nowpayments';

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

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Authenticate user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // 2. Fetch pricing config from platform_config
    const { data: configRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'plan_pricing')
      .single();

    let price = 0;
    const defaultPrices: Record<string, number> = { starter: 20, pro: 50, enterprise: 100 };
    if (configRow?.value) {
      const planVal = configRow.value[planId];
      if (typeof planVal === 'object' && planVal !== null) {
        price = Number(planVal.price) || defaultPrices[planId] || 0;
      } else {
        price = Number(planVal) || defaultPrices[planId] || 0;
      }
    } else {
      price = defaultPrices[planId] || 0;
    }

    if (price <= 0) {
      return NextResponse.json({ error: 'Invalid plan or pricing not configured' }, { status: 400 });
    }

    // 3. Create NOWPayments invoice (hosted page with multi-currency selector)
    const origin = new URL(request.url).origin;
    const ipnUrl = `${origin}/api/webhooks/nowpayments`;
    
    const invoice = await createInvoice({
      price_amount: price,
      price_currency: 'usd',
      ipn_callback_url: ipnUrl,
      order_id: `${user.id}:${planId}:${Date.now()}`,
      order_description: `TradeGPT ${planId.toUpperCase()} Subscription`,
      success_url: `${origin}/`,
      cancel_url: `${origin}/`,
    });

    // 4. Save pending payment mapping in platform_config -> pending_subscriptions key
    const { data: currentPendingRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'pending_subscriptions')
      .single();

    const pendingMap = currentPendingRow?.value || {};
    pendingMap[invoice.id] = {
      user_id: user.id,
      plan_id: planId,
      price_amount: price,
      invoice_id: invoice.id,
      invoice_url: invoice.invoice_url,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await supabaseAdmin
      .from('platform_config')
      .upsert({
        key: 'pending_subscriptions',
        value: pendingMap,
        updated_at: new Date().toISOString()
      });

    return NextResponse.json({
      invoice_id: invoice.id,
      invoice_url: invoice.invoice_url,
      // Legacy compat fields
      payment_id: invoice.id,
      payment_url: invoice.invoice_url,
    });
  } catch (err: any) {
    console.error('[checkout] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
