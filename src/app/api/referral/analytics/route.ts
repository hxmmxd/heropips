import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // All transactions for last 30 days
    const { data: txs } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount, tx_type, created_at, metadata')
      .eq('user_id', user.id)
      .in('tx_type', ['rebate', 'referral'])
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at');

    // Group by date
    const dailyMap = new Map<string, { rebate: number; referral: number }>();
    // Seed all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { rebate: 0, referral: 0 });
    }

    for (const tx of txs || []) {
      const key = tx.created_at.slice(0, 10);
      const existing = dailyMap.get(key) || { rebate: 0, referral: 0 };
      if (tx.tx_type === 'rebate') existing.rebate += Number(tx.amount);
      else if (tx.tx_type === 'referral') existing.referral += Number(tx.amount);
      dailyMap.set(key, existing);
    }

    const dailyChart = Array.from(dailyMap.entries()).map(([date, vals]) => ({
      date,
      rebate: Math.round(vals.rebate * 100) / 100,
      referral: Math.round(vals.referral * 100) / 100,
      total: Math.round((vals.rebate + vals.referral) * 100) / 100,
    }));

    // 7-day lot velocity
    const { data: recentTxs } = await supabaseAdmin
      .from('wallet_transactions')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('tx_type', 'rebate')
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgo);

    const weeklyLots = (recentTxs || []).reduce((sum: number, tx: any) =>
      sum + (Number(tx.metadata?.volume) || 0), 0);
    const dailyLotVelocity = Math.round((weeklyLots / 7) * 100) / 100;

    // Top earners in network (source_user_ids with most referral income to user)
    const { data: referralTxs } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount, metadata')
      .eq('user_id', user.id)
      .eq('tx_type', 'referral')
      .eq('status', 'completed');

    const earnerMap = new Map<string, number>();
    for (const tx of referralTxs || []) {
      const src = tx.metadata?.source_user_id;
      if (src) earnerMap.set(src, (earnerMap.get(src) || 0) + Number(tx.amount));
    }

    const topEarnerIds = [...earnerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topEarners = topEarnerIds.map(([uid, earned], idx) => ({
      rank: idx + 1,
      label: `L1 Trader ${String.fromCharCode(65 + idx)}`, // A, B, C...
      earned: Math.round(earned * 100) / 100,
    }));

    // Summary totals
    const total30d = dailyChart.reduce((s, d) => s + d.total, 0);
    const rebate30d = dailyChart.reduce((s, d) => s + d.rebate, 0);
    const referral30d = dailyChart.reduce((s, d) => s + d.referral, 0);

    return NextResponse.json({
      success: true,
      dailyChart,
      topEarners,
      summary: {
        total30d: Math.round(total30d * 100) / 100,
        rebate30d: Math.round(rebate30d * 100) / 100,
        referral30d: Math.round(referral30d * 100) / 100,
        dailyLotVelocity,
        weeklyLots: Math.round(weeklyLots * 100) / 100,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
