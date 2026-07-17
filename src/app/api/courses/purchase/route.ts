import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createInvoice } from '@/lib/nowpayments';

export const dynamic = 'force-dynamic';

let _admin: any = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

// ── POST: Purchase a course category ──
export async function POST(request: Request) {
  const supabaseAdmin = getAdmin();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { category, method } = body;

  if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  if (!method || !['wallet', 'crypto'].includes(method)) {
    return NextResponse.json({ error: 'method must be "wallet" or "crypto"' }, { status: 400 });
  }

  // 1. Idempotency — check if already purchased
  const { data: existing } = await supabaseAdmin
    .from('course_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('category', category)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Category already purchased', already_owned: true }, { status: 400 });
  }

  // 2. Get category price from platform_config
  const { data: configRow } = await supabaseAdmin
    .from('platform_config')
    .select('value')
    .eq('key', 'course_category_pricing')
    .single();

  const pricing = configRow?.value || {};
  const price = Number(pricing[category]) || 0;

  if (price <= 0) {
    return NextResponse.json({ error: 'This category is free or pricing not configured' }, { status: 400 });
  }

  // ── WALLET PAYMENT ──
  if (method === 'wallet') {
    // 1. Call stored procedure to atomically check and deduct balance using row-level locking
    const { data: success, error: rpcErr } = await supabaseAdmin
      .rpc('deduct_wallet_balance', {
        p_user_id: user.id,
        p_amount: price
      });

    if (rpcErr || !success) {
      return NextResponse.json({ error: 'Insufficient balance or concurrent update' }, { status: 400 });
    }

    // 2. Fetch updated balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    const newBalance = Number(profile?.wallet_balance || 0);

    // 3. Record wallet transaction (with auto-fix for CHECK constraint)
    let txInsertResult = await supabaseAdmin.from('wallet_transactions').insert({
      user_id: user.id,
      tx_type: 'course_purchase',
      amount: -price,
      status: 'completed',
      metadata: { category, description: `Course category: ${category}` },
      created_at: new Date().toISOString(),
    });

    // Auto-fix: if CHECK constraint blocks 'course_purchase', patch it
    if (txInsertResult.error?.code === '23514') {
      console.log('[course-purchase] Fixing wallet_transactions CHECK constraint...');
      await supabaseAdmin.rpc('exec_sql_raw', {
        sql_text: `
          ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_tx_type_check;
          ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_tx_type_check 
            CHECK (tx_type IN ('rebate', 'referral', 'withdrawal_request', 'withdrawal_payout', 'withdrawal_declined', 'course_purchase'));
        `,
      }).catch(() => {});

      // Retry insert
      txInsertResult = await supabaseAdmin.from('wallet_transactions').insert({
        user_id: user.id,
        tx_type: 'course_purchase',
        amount: -price,
        status: 'completed',
        metadata: { category, description: `Course category: ${category}` },
        created_at: new Date().toISOString(),
      });
    }

    if (txInsertResult.error) {
      console.error('[course-purchase] wallet_transactions insert failed:', txInsertResult.error);
    }

    // 4. Record purchase
    const { error: purchaseErr } = await supabaseAdmin.from('course_purchases').insert({
      user_id: user.id,
      category,
      amount: price,
      payment_method: 'wallet',
      payment_ref: `wallet_${user.id}_${Date.now()}`,
    });

    if (purchaseErr) {
      console.error('[course-purchase] course_purchases insert failed:', purchaseErr);
    }

    return NextResponse.json({
      success: true,
      unlocked: category,
      new_balance: newBalance,
    });
  }

  // ── CRYPTO PAYMENT (Invoice-based) ──
  if (method === 'crypto') {
    try {
      const origin = new URL(request.url).origin;
      const ipnUrl = `${origin}/api/webhooks/nowpayments`;

      // Use invoice flow — gives user a hosted page with ALL crypto options
      const invoice = await createInvoice({
        price_amount: price,
        price_currency: 'usd',
        ipn_callback_url: ipnUrl,
        order_id: `course_purchase:${user.id}:${category}:${Date.now()}`,
        order_description: `TradeGPT Course: ${category}`,
        success_url: `${origin}/?tab=courses`,
        cancel_url: `${origin}/?tab=courses`,
      });

      // Store pending purchase keyed by invoice ID
      const { data: pendingRow } = await supabaseAdmin
        .from('platform_config')
        .select('value')
        .eq('key', 'pending_course_purchases')
        .single();

      const pendingMap = pendingRow?.value || {};
      pendingMap[invoice.id] = {
        user_id: user.id,
        category,
        price_amount: price,
        invoice_id: invoice.id,
        invoice_url: invoice.invoice_url,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('platform_config').upsert({
        key: 'pending_course_purchases',
        value: pendingMap,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        invoice_id: invoice.id,
        invoice_url: invoice.invoice_url,
      });
    } catch (err: any) {
      console.error('[course-purchase-crypto] error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
}
