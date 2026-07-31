import { NextResponse } from "next/server";
import { IDENTITY_URL, SESSION_COOKIE, SESSION_COOKIE_CLEARED } from "@/lib/session";
import { clientIpHeader } from "@/app/api/_lib/client-ip";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { bearerToken, sessionSubject } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, ...scoped("app:logout", POLICY.authedWrite, await sessionSubject()));
  if (limited) return limited;
  const token = await bearerToken();
  if (token) {
    // Best effort revoke; clearing the cookie must succeed regardless.
    await fetch(`${IDENTITY_URL}/v1/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, ...clientIpHeader(req) },
      cache: "no-store",
    }).catch(() => undefined);
  }
  // Clear-Site-Data evicts the Cache API stores the service worker filled with
  // server-rendered /app/** HTML (equity, positions, email) plus localStorage,
  // and unregisters the SW. Without it a logged-out browser still serves the
  // previous member's dashboard offline.
  const res = NextResponse.json(
    { ok: true },
    { headers: { "clear-site-data": '"cache", "storage"', "cache-control": "no-store" } },
  );
  res.cookies.set(SESSION_COOKIE, "", SESSION_COOKIE_CLEARED);
  return res;
}
