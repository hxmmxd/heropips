import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

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
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch subscription payment history from pending_subscriptions
    const { data: subConfigRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'pending_subscriptions')
      .single();

    const subPendingMap = subConfigRow?.value || {};
    const subscriptionHistory = Object.entries(subPendingMap)
      .map(([paymentId, details]: [string, any]) => ({
        payment_id: paymentId,
        type: 'subscription',
        ...details,
      }))
      .filter((item: any) => item.user_id === user.id);

    // 2. Fetch course purchase history from course_purchases table
    const { data: coursePurchases } = await supabaseAdmin
      .from('course_purchases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const courseHistory = (coursePurchases || []).map((cp: any) => ({
      payment_id: cp.payment_ref || cp.id,
      type: 'course_purchase',
      plan_id: cp.category,
      user_id: cp.user_id,
      price_amount: Number(cp.amount),
      pay_amount: Number(cp.amount),
      pay_currency: cp.payment_method === 'wallet' ? 'USD' : 'CRYPTO',
      status: 'completed',
      created_at: cp.created_at,
      category: cp.category,
      payment_method: cp.payment_method,
    }));

    // 3. Also fetch pending course purchases from platform_config
    const { data: coursePendingRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'pending_course_purchases')
      .single();

    const coursePendingMap = coursePendingRow?.value || {};
    const pendingCourseHistory = Object.entries(coursePendingMap)
      .map(([paymentId, details]: [string, any]) => ({
        payment_id: paymentId,
        type: 'course_purchase',
        plan_id: details.category,
        ...details,
        pay_currency: details.pay_currency || 'CRYPTO',
        pay_amount: details.price_amount,
      }))
      .filter((item: any) => item.user_id === user.id && item.status !== 'completed');

    // 4. Merge all history and sort by date
    const allHistory = [...subscriptionHistory, ...courseHistory, ...pendingCourseHistory]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(allHistory);
  } catch (err: any) {
    console.error('[history] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
