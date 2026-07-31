import type { NextConfig } from "next";

/* =========================================================================
 * Static response headers.
 *
 * The Content-Security-Policy is deliberately NOT here. It carries a
 * per-request nonce, and `headers()` is evaluated once at build time, so the
 * CSP is emitted by middleware.ts from lib/security-headers.ts. Never add a
 * CSP to this file: two CSP headers are enforced as an intersection, and a
 * build-time copy has no nonce, so it would block every inline script.
 * ======================================================================= */

// Deny every powerful feature the product does not use. `(self)` where the app
// itself may need it (video posters go fullscreen; hero media autoplays).
// `interest-cohort` is omitted on purpose: FLoC was removed from the platform,
// `browsing-topics=()` is its live successor and every browser that still
// parses `interest-cohort` only logs an unrecognised-feature warning.
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "attribution-reporting=()",
  "autoplay=(self)",
  "bluetooth=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "idle-detection=()",
  "local-fonts=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "screen-wake-lock=()",
  "serial=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

const securityHeaders = [
  // X-Frame-Options is redundant with CSP frame-ancestors 'none' in modern
  // browsers; kept for the ones that only implement the header.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Severs the window.opener/named-window relationship with any cross-origin
  // page, so a popup or an opener cannot reach into this origin's frames.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // No third party embeds our assets, so refuse to be a cross-origin
  // subresource at all (blocks XS-Leak style size/timing probes).
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Cross-Origin-Embedder-Policy is intentionally ABSENT. `require-corp` would
  // block the GA4 loader and the Clarity tag — neither googletagmanager.com nor
  // clarity.ms sends Cross-Origin-Resource-Policy — and `credentialless` only
  // moves the failure to whichever vendor needs its own cookies. Fonts are not
  // the blocker (next/font/google self-hosts them under /_next/static/media).
  // Nothing here needs cross-origin isolation: no SharedArrayBuffer, no
  // wasm threads, no high-resolution timers. Revisit only if that changes.
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// Build output is content-hashed: the URL changes whenever the bytes do.
const IMMUTABLE = { key: "Cache-Control", value: "public, max-age=31536000, immutable" };
// Pinning an old shell here stops clients from ever receiving an update.
const REVALIDATE = { key: "Cache-Control", value: "no-cache, must-revalidate" };
// Answer-engine + crawler artifacts: cheap to regenerate, served from the edge
// cache, and a stale copy is harmless for the length of one window.
const CRAWLER_ARTIFACT = { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };
const ROBOTS = { key: "Cache-Control", value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" };

const nextConfig: NextConfig = {
  output: "standalone",
  // Lets a production build run beside a live `next dev` (which owns .next).
  // Invoke `next build` DIRECTLY, never through turbo:
  //   NEXT_DIST_DIR=.next-build pnpm --filter @heropips/web exec next build
  // `pnpm build` goes through turbo, whose `build` task declares
  // `outputs: [".next/**"]` unconditionally — so a cache restore or prune
  // rewrites .next even when the build itself wrote to .next-build, and the
  // running dev server loses its routes-manifest.json mid-flight.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  // Next 15 streams <head> metadata by default and only blocks for a built-in
  // bot list (Twitterbot, Slackbot, Bingbot, …). Everyone else — Lighthouse,
  // GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, CCBot — received an EMPTY
  // <head> and had to run JS for title/description/canonical/OG. Answer engines
  // and LLM crawlers don't. This regex matches every UA, so metadata is always
  // resolved into <head> server-side. Cost is ~0: every route's metadata is a
  // static object with no I/O. Only metadata streaming is affected — bot-type
  // detection and the dynamic/PPR render path use Next's own hardcoded list.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Documents are not listed here on purpose: the root layout reads the
      // theme cookie (and /app/** the session), so Next serves every HTML
      // response as `no-store, must-revalidate`. That is the correct policy —
      // a shared cache must never hand one visitor's document to another —
      // and overriding it from here would do exactly that.
      { source: "/_next/static/:path*", headers: [IMMUTABLE] },
      { source: "/icon-:size(\\d{3}).png", headers: [IMMUTABLE] },
      { source: "/icon.svg", headers: [IMMUTABLE] },
      { source: "/sw.js", headers: [REVALIDATE] },
      // /manifest.webmanifest is NOT listed: app/manifest.ts is a metadata
      // route and Next stamps its own `public, max-age=0, must-revalidate`
      // (equivalent to the value above) which a rule here cannot override —
      // verified against the running server. Caddy pins it at the edge.
      // Content-Type for these four comes from the route itself (the llms
      // handlers set text/plain; Next's metadata routes set text/plain and
      // application/xml). Cache-Control lives here so there is one source.
      { source: "/llms.txt", headers: [CRAWLER_ARTIFACT] },
      { source: "/llms-full.txt", headers: [CRAWLER_ARTIFACT] },
      { source: "/sitemap.xml", headers: [CRAWLER_ARTIFACT] },
      { source: "/robots.txt", headers: [ROBOTS] },
    ];
  },
  async redirects() {
    return [
      // Canonical host: www → apex (safe to keep permanent).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.heropips.com" }],
        destination: "https://heropips.com/:path*",
        permanent: true,
      },
      // The public queue is the "early access list" now — old URLs stay alive.
      { source: "/waitlist", destination: "/early-access", permanent: true },
      { source: "/waitlist/status", destination: "/early-access/status", permanent: true },
      // Pre-launch aliases — temporary (307) so they can change at public launch.
      // Repositioning (2026-07): signals → decision intelligence. Public URL is
      // permanent (308) for SEO; the app route is private, temporary is fine.
      { source: "/product/signals", destination: "/product/intelligence", permanent: true },
      { source: "/app/signals", destination: "/app/intelligence", permanent: false },
      { source: "/home", destination: "/", permanent: false },
      { source: "/platform", destination: "/product", permanent: false },
      { source: "/login", destination: "/app/login", permanent: false },
      { source: "/signin", destination: "/app/login", permanent: false },
      { source: "/signup", destination: "/founding", permanent: false },
      { source: "/register", destination: "/founding", permanent: false },
      { source: "/refer", destination: "/affiliates", permanent: false },
      { source: "/referral", destination: "/affiliates", permanent: false },
      { source: "/docs", destination: "/faq", permanent: false },
    ];
  },
};

export default nextConfig;
