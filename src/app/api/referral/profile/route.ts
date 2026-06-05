import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(userId: string): string {
  return 'TGPT-' + userId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('referral_code, plan, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  // Auto-generate + save referral code if missing
  let referralCode = profile?.referral_code;
  if (!referralCode) {
    referralCode = generateCode(user.id);
    await supabaseAdmin
      .from('profiles')
      .update({ referral_code: referralCode })
      .eq('id', user.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tradegpt.ai';
  const referralLink = `${baseUrl}/r/${referralCode.toLowerCase()}`;

  // Count direct referrals (L1)
  const { count: l1Count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', user.id);

  // Walk L2–L5 using recursive SQL function
  const { data: teamRows } = await supabaseAdmin
    .rpc('get_team_user_ids', { root_user_id: user.id });

  const byLevel: Record<number, number> = { 1: l1Count || 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of teamRows || []) {
    const d = row.depth as number;
    if (d >= 2 && d <= 5) byLevel[d] = (byLevel[d] || 0) + 1;
  }

  const totalNetwork = Object.values(byLevel).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    success: true,
    id: user.id,
    referralCode,
    referralLink,
    plan: profile?.plan || 'free',
    displayName: profile?.full_name || profile?.email || user.email,
    networkCounts: byLevel,
    totalNetwork,
  });
}
