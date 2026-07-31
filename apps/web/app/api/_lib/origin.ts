import { NextResponse } from "next/server";

/* =========================================================================
 * CSRF defence for the BFF: prove a mutating request was issued by our own
 * origin before any handler reads the session cookie.
 *
 * WHY `SameSite=Lax` IS NOT ENOUGH
 * --------------------------------
 * Lax suppresses the cookie on *subresource* cross-site requests (fetch,
 * XHR, <img>, <iframe>) but deliberately still sends it on **top-level
 * navigations**. A third-party page can therefore do:
 *
 *     <form action="https://heropips.com/api/app/orders" method="POST">
 *       <input name="..." value="..."><script>form.submit()</script>
 *
 * and the browser performs a top-level POST navigation that carries
 * `__Host-hp_session` in full. That is a real, unmitigated forged trade /
 * forced position close / forced logout. Lax only shrinks the CSRF surface
 * to "things that can be expressed as a top-level navigation"; it does not
 * close it. Origin verification does.
 *
 * Lax also does not distinguish *sites* from *origins*: any subdomain of
 * heropips.com is same-site, so a single compromised or user-content
 * subdomain is a complete CSRF platform against the apex.
 * ======================================================================= */

/** Methods that must never change state, and so need no origin proof. */
const SAFE_METHODS: Record<string, true> = { GET: true, HEAD: true, OPTIONS: true };

/**
 * `Sec-Fetch-Site` values we accept for a mutating request.
 *
 * `same-site` is accepted because the platform is served from the apex while
 * assets/preview deploys may live on a sibling subdomain. It is the one
 * loosening here: a hostile *.heropips.com subdomain would pass. Tightening
 * to same-origin only means deleting the `"same-site"` entry below — do it
 * the moment no legitimate sibling subdomain calls the BFF.
 */
const ALLOWED_FETCH_SITE: Record<string, true> = { "same-origin": true, "same-site": true };

/**
 * The origin this deployment answers on. Configured value wins so the answer
 * is independent of a spoofable `Host`; the Host fallback exists for local
 * dev and preview builds where neither env var is set.
 */
function siteOrigin(req: Request): string | null {
  const configured = process.env.PUBLIC_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* misconfigured env — fall through to the Host header */
    }
  }
  const host = req.headers.get("host");
  if (!host) return null;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

function forbidden(): NextResponse {
  return NextResponse.json(
    {
      error_code: "forbidden",
      message: "Request origin not allowed.",
      remediation: "Retry from the HeroPips site.",
    },
    { status: 403 },
  );
}

/**
 * `null` when the request provably originates from this site, otherwise a 403.
 *
 * Decision order:
 *  1. `Sec-Fetch-Site: same-origin | same-site` → allow (browser-asserted,
 *     unforgeable by page script since it is a forbidden header name).
 *  2. `Sec-Fetch-Site: none` → user-initiated with no initiator (address bar,
 *     bookmark). Allowed for safe methods only; a *mutating* `none` cannot be
 *     produced by an honest browser flow, so we treat it as forged.
 *  3. Any other `Sec-Fetch-Site` (`cross-site`) → deny.
 *  4. Header absent (non-browser client, or a browser predating Fetch
 *     Metadata) → fall back to a strict, exact `Origin` match. Absent Origin
 *     on a mutating request is a deny: we fail closed rather than assume a
 *     trusted caller.
 */
export function requireSameOrigin(req: Request): Response | null {
  const safe = SAFE_METHODS[req.method.toUpperCase()] === true;
  const fetchSite = req.headers.get("sec-fetch-site");

  if (fetchSite !== null) {
    if (ALLOWED_FETCH_SITE[fetchSite] === true) return null;
    if (fetchSite === "none" && safe) return null;
    return forbidden();
  }

  const origin = req.headers.get("origin");
  if (origin === null) return safe ? null : forbidden();
  const expected = siteOrigin(req);
  if (expected === null || origin !== expected) return forbidden();
  return null;
}
