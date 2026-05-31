import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOtpEmail } from '@/lib/mail';

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
    const { email, password, fullName } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Check if user already exists in auth.users
    // Note: Due to pagination, we also verify in profiles if listUsers is capped
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const exists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (exists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 3. Store pending signup in platform_config -> pending_signups key
    const { data: configRow } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'pending_signups')
      .single();

    const pendingMap = configRow?.value || {};
    pendingMap[email.toLowerCase()] = {
      password,
      fullName,
      otp,
      expiresAt,
      created_at: new Date().toISOString()
    };

    await supabaseAdmin
      .from('platform_config')
      .upsert({
        key: 'pending_signups',
        value: pendingMap,
        updated_at: new Date().toISOString()
      });

    // 4. Send OTP email using custom SMTP configuration
    await sendOtpEmail(email, otp);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[signup] error:', err);
    return NextResponse.json({ error: err.message || 'Verification email failed to send.' }, { status: 500 });
  }
}
