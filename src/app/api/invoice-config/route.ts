import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { defaultInvoiceConfig } from '@/lib/invoicePdf';

const CONFIG_KEY = 'invoice_config';

let _admin: any = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!(profile as any)?.is_admin) return null;
  return user;
}

export async function GET() {
  try {
    const admin = getAdmin();
    const { data } = await admin.from('platform_config').select('value').eq('key', CONFIG_KEY).single();
    const config = data?.value ?? defaultInvoiceConfig;
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json(defaultInvoiceConfig);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const admin = getAdmin();

    await admin.from('platform_config').upsert({
      key: CONFIG_KEY,
      value: body,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
