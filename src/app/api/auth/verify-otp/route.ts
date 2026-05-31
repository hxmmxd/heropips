import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch pending signup
    const { data: configRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'pending_signups')
      .single();

    const pendingMap = configRow?.value || {};
    const pending = pendingMap[email.toLowerCase()];

    if (!pending) {
      return NextResponse.json({ error: 'No pending signup session found for this email. Please submit the form again.' }, { status: 400 });
    }

    // 2. Validate OTP
    if (pending.otp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (Date.now() > pending.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please register again.' }, { status: 400 });
    }

    // 3. Create user in Supabase auth table
    const { data: userRecord, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pending.password,
      email_confirm: true,
      user_metadata: { full_name: pending.fullName }
    });

    if (createError) throw createError;

    // 4. Delete session from pendingMap
    delete pendingMap[email.toLowerCase()];
    await supabaseAdmin
      .from('platform_config')
      .upsert({
        key: 'pending_signups',
        value: pendingMap,
        updated_at: new Date().toISOString()
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[verify-otp] error:', err);
    return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 500 });
  }
}
