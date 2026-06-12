import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('astro_mode')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, astro_mode: profile?.astro_mode || false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { astro_mode } = await request.json();

    if (typeof astro_mode !== 'boolean') {
      return NextResponse.json({ error: 'astro_mode must be a boolean' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ astro_mode, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, astro_mode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
