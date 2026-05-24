import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Admin API — uses service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // Verify calling user is admin
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin status using service role (bypasses RLS)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all data
  const [usersRes, brokersRes, tradesRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('broker_accounts').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('trades').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  // Stats
  const users = usersRes.data || [];
  const brokers = brokersRes.data || [];
  const trades = tradesRes.data || [];

  const stats = {
    totalUsers: users.length,
    proUsers: users.filter(u => u.plan === 'pro').length,
    enterpriseUsers: users.filter(u => u.plan === 'enterprise').length,
    freeUsers: users.filter(u => !u.plan || u.plan === 'free').length,
    totalBrokers: brokers.length,
    activeBrokers: brokers.filter(b => b.status === 'connected').length,
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    revenue: users.reduce((sum, u) => {
      if (u.plan === 'pro') return sum + 50;
      if (u.plan === 'enterprise') return sum + 100;
      return sum;
    }, 0),
  };

  return NextResponse.json({ stats, users, brokers, trades });
}

// Update user plan or admin status
export async function PATCH(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, plan, is_admin } = body;

  const update: any = { updated_at: new Date().toISOString() };
  if (plan !== undefined) update.plan = plan;
  if (is_admin !== undefined) update.is_admin = is_admin;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(update)
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
