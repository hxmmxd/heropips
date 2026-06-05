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
    // Fetch rebate level percentages (L1–L5)
    const { data: levels } = await supabaseAdmin
      .from('rebate_levels')
      .select('*')
      .eq('active', true)
      .order('level');

    // Fetch top rebate rules (wildcard + top 5 symbols)
    const { data: rules } = await supabaseAdmin
      .from('rebate_rules')
      .select('symbol, rebate_per_lot, min_hold_time_seconds, free_multiplier, pro_multiplier, enterprise_multiplier')
      .order('rebate_per_lot', { ascending: false })
      .limit(8);

    // Fetch volume tiers
    const { data: tiers } = await supabaseAdmin
      .from('rebate_volume_tiers')
      .select('*')
      .order('min_monthly_lots');

    // Fetch user plan + this month's lot volume
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, wallet_balance')
      .eq('id', user.id)
      .maybeSingle();

    const userPlan = profile?.plan || 'free';

    // Calculate monthly lots
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const { data: monthTxs } = await supabaseAdmin
      .from('wallet_transactions')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('tx_type', 'rebate')
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    const monthlyLots = (monthTxs || []).reduce((sum: number, tx: any) =>
      sum + (Number(tx.metadata?.volume) || 0), 0);

    const matchingTier = (tiers || []).find((t: any) =>
      monthlyLots >= Number(t.min_monthly_lots) && monthlyLots < Number(t.max_monthly_lots)
    );
    const tierMultiplier = matchingTier ? Number(matchingTier.payout_multiplier) : 1.00;
    // Derive label from multiplier (table has no label column)
    const tierLabel = tierMultiplier >= 1.25 ? 'Gold' : tierMultiplier >= 1.10 ? 'Silver' : 'Standard';

    const planMultiplierMap: Record<string, number> = { free: 0.60, pro: 0.80, enterprise: 1.00 };
    const planMultiplier = planMultiplierMap[userPlan] || 0.60;

    // Get default base rate
    const defaultRule = (rules || []).find((r: any) => r.symbol === '*') || rules?.[0];
    const baseRate = defaultRule ? Number(defaultRule.rebate_per_lot) : 2.00;
    const effectiveRate = Number((baseRate * planMultiplier * tierMultiplier).toFixed(3));

    return NextResponse.json({
      success: true,
      levels: levels || [],
      rules: rules || [],
      tiers: tiers || [],
      userPlan,
      planMultiplier,
      tierMultiplier,
      tierLabel,
      monthlyLots,
      baseRate,
      effectiveRate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
