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
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: configRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'pending_subscriptions')
      .single();

    const pendingMap = configRow?.value || {};
    
    // Transform map to sorted list and filter by user ID
    const history = Object.entries(pendingMap)
      .map(([paymentId, details]: [string, any]) => ({
        payment_id: paymentId,
        ...details,
      }))
      .filter((item: any) => item.user_id === user.id)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(history);
  } catch (err: any) {
    console.error('[history] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
