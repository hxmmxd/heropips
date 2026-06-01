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
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify calling user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!(profile as any)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch user accounts and trades
    const [brokersRes, tradesRes] = await Promise.all([
      supabaseAdmin.from('broker_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    const brokers = brokersRes.data || [];
    const trades = tradesRes.data || [];

    // Calculate trade counts per broker account
    const brokerTradeCounts: Record<string, number> = {};
    trades.forEach((t: any) => {
      if (t.broker_id) {
        brokerTradeCounts[t.broker_id] = (brokerTradeCounts[t.broker_id] || 0) + 1;
      }
    });

    const brokersWithCount = brokers.map((b: any) => ({
      ...b,
      trade_count: brokerTradeCounts[b.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      brokers: brokersWithCount,
      trades,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
