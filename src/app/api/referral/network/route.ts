import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function maskName(name: string): string {
  if (!name || name.length < 4) return name;
  return name.slice(0, 4) + '****';
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get L1 direct referrals
    const { data: directRefs } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, plan, created_at, referred_by')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false });

    // Get all descendants L2–L5 via recursive function
    const { data: teamRows } = await supabaseAdmin
      .rpc('get_team_user_ids', { root_user_id: user.id });

    const teamMap = new Map<string, number>();
    for (const row of teamRows || []) {
      teamMap.set(row.user_id, row.depth + 1); // depth=1 means L2
    }

    // Build all member IDs (L1 + L2-L5)
    const l1Ids = (directRefs || []).map(r => r.id);
    const allIds = [...l1Ids, ...(teamRows || []).map((r: any) => r.user_id)].slice(0, 200);

    if (allIds.length === 0) {
      return NextResponse.json({ success: true, members: [] });
    }

    // Fetch trade stats per member
    const { data: tradeLogs } = await supabaseAdmin
      .from('trade_log')
      .select('user_id, volume')
      .in('user_id', allIds);

    const tradeStats = new Map<string, { tradeCount: number; totalVolume: number }>();
    for (const row of tradeLogs || []) {
      const existing = tradeStats.get(row.user_id) || { tradeCount: 0, totalVolume: 0 };
      tradeStats.set(row.user_id, {
        tradeCount: existing.tradeCount + 1,
        totalVolume: existing.totalVolume + Number(row.volume),
      });
    }

    // Fetch referral earnings this user received from each member's trades
    const { data: referralTxs } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount, metadata')
      .eq('user_id', user.id)
      .eq('tx_type', 'referral')
      .eq('status', 'completed');

    // Map source_user_id → total earned
    const earnedFrom = new Map<string, number>();
    for (const tx of referralTxs || []) {
      const srcId = tx.metadata?.source_user_id;
      if (srcId) {
        earnedFrom.set(srcId, (earnedFrom.get(srcId) || 0) + Number(tx.amount));
      }
    }

    // Build L1 members with full name (direct referrals — not masked)
    const members: any[] = [];
    for (const ref of directRefs || []) {
      const stats = tradeStats.get(ref.id) || { tradeCount: 0, totalVolume: 0 };
      members.push({
        userId: ref.id,
        displayName: ref.full_name || ref.email?.split('@')[0] || 'Trader',
        level: 1,
        plan: ref.plan || 'free',
        joinedAt: ref.created_at,
        tradeCount: stats.tradeCount,
        totalVolume: stats.totalVolume,
        earnedFromThem: earnedFrom.get(ref.id) || 0,
        referredBy: ref.referred_by || user.id,
      });
    }

    // Build L2–L5 members (masked)
    const l1Set = new Set(l1Ids);
    for (const row of teamRows || []) {
      const uid = row.user_id;
      if (l1Set.has(uid)) continue; // Already handled as L1 above
      const level = row.depth; // depth=2 → L2, depth=3 → L3, etc.
      if (level > 5) continue;

      // Find profile info
      const { data: pf } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, created_at, plan, referred_by')
        .eq('id', uid)
        .maybeSingle();

      const stats = tradeStats.get(uid) || { tradeCount: 0, totalVolume: 0 };
      const rawName = pf?.full_name || pf?.email?.split('@')[0] || 'Trader';

      members.push({
        userId: uid,
        displayName: maskName(rawName),
        level,
        plan: pf?.plan || 'free',
        joinedAt: pf?.created_at || null,
        tradeCount: stats.tradeCount,
        totalVolume: stats.totalVolume,
        earnedFromThem: earnedFrom.get(uid) || 0,
        referredBy: pf?.referred_by || null,
      });
    }

    // Sort: by level asc, then by volume desc
    members.sort((a, b) => a.level - b.level || b.totalVolume - a.totalVolume);

    return NextResponse.json({ success: true, members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
