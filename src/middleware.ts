import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '' });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If no user and trying to access root page, rewrite based on PWA query param
  if (!user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    const isPwa = request.nextUrl.searchParams.get('pwa') === 'true';
    if (isPwa) {
      url.pathname = '/login';
    } else {
      url.pathname = '/landing';
    }
    return NextResponse.rewrite(url);
  }

  // If no user and trying to access protected routes, redirect to login
  const isStaticAsset = request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|json|js|mp4|webm)$/);
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/landing') && !request.nextUrl.pathname.startsWith('/blog') && !request.nextUrl.pathname.startsWith('/verify-phone') && !isStaticAsset) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in, check phone verification requirement from platform_config
  if (user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth') && !isStaticAsset) {
    const { data: configData } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'phone_verification_required')
      .maybeSingle();

    const isRequired = configData?.value !== false && configData?.value !== 'false';

    if (isRequired && !request.nextUrl.pathname.startsWith('/verify-phone')) {
      const isCookieVerified = request.cookies.get('phone_verified')?.value === 'true';

      if (!isCookieVerified) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_verified')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.phone_verified) {
          const url = request.nextUrl.clone();
          url.pathname = '/verify-phone';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // If user is logged in and on login page, redirect to home
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, icons, etc.
     * - api routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api).*)',
  ],
};
