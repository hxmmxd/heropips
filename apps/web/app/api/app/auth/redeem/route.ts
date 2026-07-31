import { NextResponse } from "next/server";
import { AuthSessionRes, RedeemAccessReq } from "@heropips/contracts";
import { IDENTITY_URL, SESSION_COOKIE, SESSION_COOKIE_ATTRS, TRADING_URL } from "@/lib/session";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { clientIpHeader } from "@/app/api/_lib/client-ip";
import { byIp, bySubject, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { unavailable } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("auth:redeem", POLICY.credential));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = RedeemAccessReq.safeParse(body);
  if (!parsed.success) {
    return validationFailed("Check email, access code, display name (2+ chars) and password (10+ chars).");
  }

  // Access-code guessing is the attack here, so the second key is the inbox
  // the code would be redeemed into — an IP rotation buys nothing.
  const perAccount = await enforce(req, bySubject("auth:redeem", POLICY.credential, parsed.data.email));
  if (perAccount) return perAccount;

  let upstream: Response;
  try {
    upstream = await fetch(`${IDENTITY_URL}/v1/auth/redeem`, {
      method: "POST",
      headers: { "content-type": "application/json", ...clientIpHeader(req) },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }
  const json = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(json ?? { error_code: "internal", message: "Redeem failed." }, { status: upstream.status });

  const session = AuthSessionRes.safeParse(json);
  if (!session.success) return unavailable();

  // First-touch provisioning: trading-svc seeds the $10,000 paper account on
  // the first authenticated /v1/connections call (ensurePaper). Do that touch
  // here, before the client can render any balance. Best-effort: the next
  // connections read self-heals, so a transient failure must not fail redeem.
  try {
    await fetch(`${TRADING_URL}/v1/connections`, {
      headers: { authorization: `Bearer ${session.data.token}`, ...clientIpHeader(req) },
      cache: "no-store",
    });
  } catch {
    /* provisioning self-heals on the next /v1/connections touch */
  }

  const res = NextResponse.json({ user: session.data.user });
  res.cookies.set(SESSION_COOKIE, session.data.token, SESSION_COOKIE_ATTRS);
  return res;
}
