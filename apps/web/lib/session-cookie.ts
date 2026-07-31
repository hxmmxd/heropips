/* =========================================================================
 * The session cookie's name and attributes, and nothing else.
 *
 * This lives apart from lib/session.ts because middleware.ts runs in the edge
 * runtime and must not pull in `server-only`, `next/headers` or `react`'s
 * cache(), all of which session.ts needs. Everything server-side keeps
 * importing these three names from "@/lib/session", which re-exports them —
 * there is exactly one definition, here.
 * ======================================================================= */

/**
 * The `__Host-` prefix is a browser-enforced contract: the cookie is rejected
 * unless it is Secure, Path=/ and carries NO Domain attribute. That last part
 * is the point — it makes the cookie un-writable by any *.heropips.com
 * subdomain, closing the session-fixation / login-CSRF overwrite that a plain
 * host cookie allows.
 */
export const SESSION_COOKIE = "__Host-hp_session";

/**
 * The single definition of the session cookie's attributes. Every writer —
 * login, redeem, logout — MUST spread this so the set can never drift.
 * `secure` is unconditional: `__Host-` requires it, and tying it to NODE_ENV
 * meant one mis-set env silently shipped a non-Secure 30-day bearer.
 * (http://localhost is a secure context, so local dev is unaffected.)
 */
export const SESSION_COOKIE_ATTRS = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
  priority: "high",
  maxAge: 60 * 60 * 24 * 30, // 30d
} as const;

/** Same attributes, zero lifetime — the only correct way to delete the cookie. */
export const SESSION_COOKIE_CLEARED = { ...SESSION_COOKIE_ATTRS, maxAge: 0 } as const;
