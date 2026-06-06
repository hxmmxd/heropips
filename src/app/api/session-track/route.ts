import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

// Parse user-agent string into OS, browser, and device
function parseUA(ua: string) {
  let os = 'Unknown';
  let browser = 'Unknown';
  let device = 'Desktop';

  // OS detection
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.2/i.test(ua)) os = 'Windows 8';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X 10[._](\d+)/i.test(ua)) {
    const v = ua.match(/Mac OS X 10[._](\d+)/i);
    os = `macOS 10.${v?.[1] || ''}`;
  } else if (/Mac OS X (\d+)[._](\d+)/i.test(ua)) {
    const v = ua.match(/Mac OS X (\d+)[._](\d+)/i);
    os = `macOS ${v?.[1] || ''}.${v?.[2] || ''}`;
  } else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const v = ua.match(/Android (\d+(\.\d+)?)/i);
    os = `Android ${v?.[1] || ''}`;
  } else if (/iPhone OS (\d+)_/i.test(ua)) {
    const v = ua.match(/iPhone OS (\d+)_(\d+)/i);
    os = `iOS ${v?.[1] || ''}.${v?.[2] || ''}`;
  } else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/CrOS/i.test(ua)) os = 'Chrome OS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Browser detection
  if (/Edg\//i.test(ua)) {
    const v = ua.match(/Edg\/(\d+)/i);
    browser = `Edge ${v?.[1] || ''}`;
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    const v = ua.match(/OPR\/(\d+)/i);
    browser = `Opera ${v?.[1] || ''}`;
  } else if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const v = ua.match(/Chrome\/(\d+)/i);
    browser = `Chrome ${v?.[1] || ''}`;
  } else if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const v = ua.match(/Version\/(\d+(\.\d+)?)/i);
    browser = `Safari ${v?.[1] || ''}`;
  } else if (/Firefox\/(\d+)/i.test(ua)) {
    const v = ua.match(/Firefox\/(\d+)/i);
    browser = `Firefox ${v?.[1] || ''}`;
  }

  // Device detection
  if (/Mobi|Android.*Mobile|iPhone/i.test(ua)) device = 'Mobile';
  else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';
  else device = 'Desktop';

  return { os, browser, device };
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get IP from headers (works on Vercel, Cloudflare, nginx, etc.)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1';

    // Get user-agent
    const ua = request.headers.get('user-agent') || '';
    const { os, browser, device } = parseUA(ua);

    // Geolocate IP using free ip-api.com (non-commercial, 45 req/min)
    let location = '';
    let country = '';
    let city = '';
    let region = '';
    let timezone = '';

    // Don't geolocate localhost/private IPs
    const isPrivate = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|localhost)/.test(ip);
    if (!isPrivate) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === 'success') {
            country = geo.country || '';
            city = geo.city || '';
            region = geo.regionName || '';
            timezone = geo.timezone || '';
            location = [city, region, country].filter(Boolean).join(', ');
          }
        }
      } catch {
        // Geo lookup failed — not critical, continue
      }
    } else {
      location = 'Local Network';
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    }

    // Update profile with session info (service role to bypass RLS)
    await supabaseAdmin
      .from('profiles')
      .update({
        last_ip: ip,
        last_location: location || null,
        last_country: country || null,
        last_city: city || null,
        last_region: region || null,
        last_timezone: timezone || null,
        last_os: os,
        last_browser: browser,
        last_device: device,
        last_seen: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[session-track] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
