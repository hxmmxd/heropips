import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Extract YouTube video ID from any YouTube URL format */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare ID
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── GET: Fetch published courses (public) or all courses (admin) ──
export async function GET(request: Request) {
  const supabaseAdmin = getAdmin();
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  // If requesting all (admin view), verify admin
  if (all) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('category')
      .order('order_index');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ courses: data || [] });
  }

  // Public: only published — also return pricing + user purchases
  const [coursesResult, pricingResult] = await Promise.all([
    supabaseAdmin.from('courses').select('*').eq('is_published', true).order('category').order('order_index'),
    supabaseAdmin.from('platform_config').select('value').eq('key', 'course_category_pricing').single(),
  ]);

  if (coursesResult.error) return NextResponse.json({ error: coursesResult.error.message }, { status: 500 });

  const categoryPricing: Record<string, number> = pricingResult.data?.value || {};

  // Try to get user purchases if authenticated
  let purchasedCategories: string[] = [];
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: purchases } = await supabaseAdmin
        .from('course_purchases')
        .select('category')
        .eq('user_id', user.id);
      purchasedCategories = (purchases || []).map((p: any) => p.category);
    }
  } catch { /* not logged in — fine */ }

  return NextResponse.json({
    courses: coursesResult.data || [],
    categoryPricing,
    purchasedCategories,
  });
}

// ── POST: Add new course (admin only) ──
export async function POST(request: Request) {
  const supabaseAdmin = getAdmin();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, description, youtube_url, thumbnail_url, category, duration, is_published } = body;

  if (!title || !youtube_url) {
    return NextResponse.json({ error: 'Title and YouTube URL are required' }, { status: 400 });
  }

  const youtube_id = extractYouTubeId(youtube_url);
  if (!youtube_id) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  // Auto-generate thumbnail if not provided
  const finalThumbnail = thumbnail_url || `https://img.youtube.com/vi/${youtube_id}/maxresdefault.jpg`;

  // Get next order_index for this category
  const { data: existing } = await supabaseAdmin
    .from('courses')
    .select('order_index')
    .eq('category', category || 'General')
    .order('order_index', { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

  const { data, error } = await supabaseAdmin.from('courses').insert({
    title,
    description: description || '',
    youtube_url,
    youtube_id,
    thumbnail_url: finalThumbnail,
    category: category || 'General',
    duration: duration || '',
    order_index: nextOrder,
    is_published: is_published ?? true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data });
}

// ── PATCH: Update course (admin only) ──
export async function PATCH(request: Request) {
  const supabaseAdmin = getAdmin();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

  // Re-extract youtube_id if URL changed
  if (updates.youtube_url) {
    const yid = extractYouTubeId(updates.youtube_url);
    if (!yid) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    updates.youtube_id = yid;
    if (!updates.thumbnail_url) {
      updates.thumbnail_url = `https://img.youtube.com/vi/${yid}/maxresdefault.jpg`;
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from('courses').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data });
}

// ── DELETE: Remove course (admin only) ──
export async function DELETE(request: Request) {
  const supabaseAdmin = getAdmin();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('courses').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
