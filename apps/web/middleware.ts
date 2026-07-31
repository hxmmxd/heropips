import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { NONCE_HEADER, contentSecurityPolicy, newNonce } from "@/lib/security-headers";

/**
 * Two jobs, in order:
 *  1. Gate /app/** on session-cookie PRESENCE only — real validation happens
 *     server-side in the platform layout via identity introspection.
 *  2. Mint the per-request CSP nonce and emit the policy on every document.
 *     The matcher spans the whole site for (2), so (1) must self-scope to
 *     /app rather than relying on the matcher.
 */
const PUBLIC_APP_PATHS = new Set(["/app/login", "/app/redeem"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/app") && !PUBLIC_APP_PATHS.has(pathname) && !req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/app/login";
    url.search = "";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  // Next parses this REQUEST header (app-render → getScriptNonceFromHeader)
  // and stamps the same nonce on its own bootstrap/hydration/next-script
  // tags. Both values must be identical.
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Everything that can return a document or JSON. Static build output and
  // public files are excluded — they need no CSP.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|svg|jpg|jpeg|webp|avif|ico|mp4|webm|woff2?|txt|xml|js|webmanifest)$).*)",
  ],
};
