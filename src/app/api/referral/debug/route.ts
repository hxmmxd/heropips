import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/referral/debug — check what data exists for the current user */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rootId = user.id;

  // Check profile
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, referral_code, referred_by, plan, wallet_balance')
    .eq('id', rootId)
    .maybeSingle();

  // Check L1 direct referrals
  const { data: directRefs, error: refErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, referred_by')
    .eq('referred_by', rootId);

  // Check team via RPC
  const { data: teamRows, error: teamErr } = await supabaseAdmin
    .rpc('get_team_user_ids', { root_user_id: rootId });

  // Check wallet transactions
  const { data: txCount } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', rootId);

  // Check trade_log for any fake user
  const { data: tradeCount } = await supabaseAdmin
    .from('trade_log')
    .select('id', { count: 'exact', head: true })
    .like('deal_id', 'SEED%');

  // Check rebate_levels
  const { data: levels } = await supabaseAdmin
    .from('rebate_levels')
    .select('*')
    .eq('active', true);

  // Check milestones
  const { data: milestones } = await supabaseAdmin
    .from('milestone_progress')
    .select('milestone_id, status, total_counted_lots')
    .eq('user_id', rootId);

  return NextResponse.json({
    rootUser: { id: rootId, email: user.email },
    profile,
    profileError: profErr?.message,
    directReferrals: directRefs?.length || 0,
    directReferralsList: directRefs,
    referralError: refErr?.message,
    teamDescendants: teamRows?.length || 0,
    teamError: teamErr?.message,
    walletTxCount: txCount,
    seedTradeCount: tradeCount,
    rebateLevels: levels,
    milestoneProgress: milestones,
  });
}
