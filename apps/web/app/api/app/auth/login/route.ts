import { NextResponse } from "next/server";
import { AuthSessionRes, LoginReq } from "@heropips/contracts";
import { IDENTITY_URL, SESSION_COOKIE, SESSION_COOKIE_ATTRS } from "@/lib/session";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { clientIpHeader } from "@/app/api/_lib/client-ip";
import { byIp, bySubject, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { unavailable } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("auth:login", POLICY.credential));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = LoginReq.safeParse(body);
  if (!parsed.success) return validationFailed("Enter your email and password.");

  // Second key: an attacker rotating IPs still only gets POLICY.credential
  // attempts per minute against any one inbox, and each attempt costs a full
  // scrypt N=2^15 (32 MiB) upstream.
  const perAccount = await enforce(req, bySubject("auth:login", POLICY.credential, parsed.data.email));
  if (perAccount) return perAccount;

  let upstream: Response;
  try {
    upstream = await fetch(`${IDENTITY_URL}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", ...clientIpHeader(req) },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }
  const json = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(json ?? { error_code: "internal", message: "Login failed." }, { status: upstream.status });

  const session = AuthSessionRes.safeParse(json);
  if (!session.success) return unavailable();

  const res = NextResponse.json({ user: session.data.user });
  res.cookies.set(SESSION_COOKIE, session.data.token, SESSION_COOKIE_ATTRS);
  return res;
}
