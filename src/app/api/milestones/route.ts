import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAllMilestones } from '@/lib/rebateEngine';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/milestones?userId=... — get milestone progress for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    // Fetch all milestones
    const { data: milestones } = await supabaseAdmin
      .from('milestones')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    // Fetch user's progress
    const { data: progress } = await supabaseAdmin
      .from('milestone_progress')
      .select('*')
      .eq('user_id', userId);

    // Merge
    const result = (milestones || []).map(m => {
      const p = progress?.find(p => p.milestone_id === m.id);
      return {
        ...m,
        progress: p || null,
      };
    });

    return NextResponse.json({ success: true, milestones: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/milestones — recalculate milestones for a user (40/40/20)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const results = await checkAllMilestones(userId);

    return NextResponse.json({
      success: true,
      results: results.map(r => ({
        qualified: r.qualified,
        targetLots: r.targetLots,
        totalRaw: r.totalRawLots,
        totalCounted: r.totalCountedLots,
        legCap: r.legCap,
        legs: r.breakdown,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
