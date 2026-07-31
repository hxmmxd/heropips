/* =========================================================================
 * Content-Security-Policy — built per request in middleware.ts.
 *
 * WHY HERE AND NOT next.config.ts
 * `headers()` in next.config.ts is evaluated once at build time, so it cannot
 * carry a per-request nonce. Everything that varies per request (only the CSP)
 * lives here and is emitted by middleware; the static transport/isolation
 * headers stay in next.config.ts. There is exactly one CSP in the app — never
 * send a second one from next.config.ts or Caddy: two CSP headers are enforced
 * as an intersection, and a nonce-less copy would block every inline script.
 *
 * NONCE PLUMBING (three consumers, one value)
 *   1. middleware sets the response CSP        → the browser enforces it
 *   2. middleware sets the SAME value on the *request* headers → Next parses it
 *      (server/app-render: `headers['content-security-policy']` →
 *      getScriptNonceFromHeader) and stamps the nonce onto every script it
 *      emits itself: the bootstrap/hydration scripts, flight-data chunks, and
 *      anything rendered by next/script (HeadManagerContext.nonce, which
 *      loadScript copies onto the element via setAttributesFromProps).
 *   3. middleware sets NONCE_HEADER            → app/layout.tsx reads it for
 *      the one hand-written inline script (THEME_INIT)
 *
 * This module must stay edge-runtime safe: no imports, Web Crypto only.
 * ======================================================================= */

/** Request header carrying the per-request nonce from middleware to Next. */
export const NONCE_HEADER = "x-hp-nonce";

/**
 * Runs before first paint: when no explicit hp_theme cookie exists (absent or
 * "system"), follow the OS preference. Explicit dark/light cookies are already
 * resolved server-side into the html attribute, so this stays a no-op then.
 *
 * Allowed by HASH, not by nonce, and it must stay that way. A browser blanks a
 * script's `nonce` CONTENT attribute once the document is parsed (nonce hiding,
 * CSP3 §5.5) while keeping the IDL property, so the server sends
 * nonce="abc…" and the client reads "" — React compares the two during
 * hydration and reports a mismatch on every page load. A hash needs no
 * attribute at all, so there is nothing to disagree about. It also survives
 * static rendering, where a per-request nonce baked into HTML cannot.
 *
 * THEME_INIT_SHA256 is pinned rather than computed: hashing at module scope
 * would need top-level await on the edge runtime for one constant string.
 * security-headers.test.ts fails if the two ever drift.
 */
export const THEME_INIT =
  `(function(){try{if(!/(?:^|; )hp_theme=(dark|light)(?:;|$)/.test(document.cookie)){document.documentElement.dataset.theme=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}}catch(e){}})()`;

export const THEME_INIT_SHA256 = "sha256-zKOmaKio08MRhsh+kxsOzFFfICxb5nqVYOwqyWGBgzU=";

/** Chat WS origin must be reachable from the browser (CSP connect-src). */
const CHAT_WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "ws://localhost:4003/v1/chat/ws";
const chatWsOrigin = (() => {
  try {
    return new URL(CHAT_WS_URL).origin;
  } catch {
    return "";
  }
})();

// Third-party analytics origins enter the CSP only when actually configured.
// GA4: loader from googletagmanager, hits to google-analytics (regional
// subdomains). Clarity: tag + beacons from *.clarity.ms (loads post-consent).
//
// Both host lists are IGNORED by any browser that understands 'strict-dynamic'
// (Chrome 52+, Firefox 52+, Safari 15.4+) — there they are trusted because the
// nonce'd Next runtime creates the elements. They are kept for older Safari,
// which ignores 'strict-dynamic' and falls back to the allow-list.
const GA_SCRIPT = process.env.NEXT_PUBLIC_GA4_ID ? " https://www.googletagmanager.com" : "";
const GA_CONNECT = process.env.NEXT_PUBLIC_GA4_ID
  ? " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com"
  : "";
const GA_IMG = process.env.NEXT_PUBLIC_GA4_ID ? " https://*.google-analytics.com https://www.googletagmanager.com" : "";
const CLARITY_SCRIPT = process.env.NEXT_PUBLIC_CLARITY_ID ? " https://www.clarity.ms https://*.clarity.ms" : "";
const CLARITY_CONNECT = process.env.NEXT_PUBLIC_CLARITY_ID ? " https://*.clarity.ms" : "";

/** 128 bits of base64 — fresh per request, never reused across responses. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw);
}

/**
 * The single CSP for every response. `nonce` must be the value that also
 * reaches the layout, or the theme-init script is blocked.
 *
 * Deliberate omissions:
 *   · script-src 'unsafe-inline' — removed. The only two executable inline
 *     scripts (app/layout.tsx THEME_INIT, components/analytics/Analytics.tsx
 *     GA bootstrap) carry the nonce. The three `type="application/ld+json"`
 *     blocks are data blocks: HTML "prepare the script element" returns before
 *     the CSP inline check for a non-JS type, so they are neither executed nor
 *     script-src-restricted, and need no nonce.
 *   · require-trusted-types-for 'script' — would break next/script. Its
 *     client-side injector assigns `el.innerHTML = dangerouslySetInnerHTML`
 *     (next/dist/client/script.js loadScript), a Trusted Types sink with no
 *     policy, so the GA consent bootstrap would throw before gtag.js loads.
 *     Revisit if Next ever routes that through a TrustedHTML policy.
 *   · block-all-mixed-content — deprecated and subsumed by
 *     upgrade-insecure-requests.
 *   · style-src 'unsafe-inline' stays: Next inlines critical CSS and font
 *     variables, and the layout sets style attributes.
 */
export function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // The nonce covers everything Next emits; the hash covers THEME_INIT, the
    // one hand-written inline script (see its comment for why not a nonce).
    // 'unsafe-eval' is dev-only: webpack HMR and react-refresh need it.
    `script-src 'self' 'nonce-${nonce}' '${THEME_INIT_SHA256}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}${GA_SCRIPT}${CLARITY_SCRIPT}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${GA_IMG}`,
    "media-src 'self'",
    // next/font/google self-hosts under /_next/static/media — no Google origin.
    "font-src 'self'",
    `connect-src 'self'${chatWsOrigin ? ` ${chatWsOrigin}` : ""}${GA_CONNECT}${CLARITY_CONNECT}`,
    // Explicit even though default-src covers them in CSP3: CSP2 browsers do
    // not fall back for worker-src/manifest-src.
    "object-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Would rewrite ws://localhost:4003 in local dev, where there is no TLS.
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
