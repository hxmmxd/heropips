import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { IDENTITY_URL, SESSION_COOKIE, SIGNAL_URL, TRADING_URL } from "@/lib/session";
import { clientIpHeader } from "@/app/api/_lib/client-ip";

export { IDENTITY_URL, SIGNAL_URL, TRADING_URL };

/* =========================================================================
 * Thin authenticated proxy: read cookie → forward bearer → relay JSON with
 * the upstream status. Request bodies are zod-validated in each route
 * BEFORE calling forward(). Never cached.
 * ======================================================================= */

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error_code: "unauthorized", message: "Sign in required.", remediation: "Log in and try again." },
    { status: 401 },
  );
}

export function unavailable(): NextResponse {
  return NextResponse.json(
    { error_code: "internal", message: "Service unavailable.", remediation: "Try again shortly." },
    { status: 502 },
  );
}

export async function bearerToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Opaque, stable per-session key for identity-scoped rate limits. Digesting
 * the bearer keeps the raw credential out of limiter keys while giving one
 * bucket per session without an introspection round trip.
 */
export async function sessionSubject(): Promise<string | null> {
  const token = await bearerToken();
  return token ? createHash("sha256").update(token).digest("hex").slice(0, 32) : null;
}

type ForwardInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Already-validated JSON body to forward. */
  body?: unknown;
  /** Query string to append, WITHOUT leading "?". */
  search?: string;
};

/**
 * Forward an authenticated request upstream and mirror status + JSON body.
 * `req` carries the caller's IP upstream via CLIENT_IP_HEADER: services run
 * without `trustProxy`, so this header is the only real client address they
 * can key their own limits on.
 */
export async function forward(req: Request, base: string, path: string, init: ForwardInit = {}): Promise<NextResponse> {
  const token = await bearerToken();
  if (!token) return unauthorized();
  const url = `${base}${path}${init.search ? `?${init.search}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...clientIpHeader(req),
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }
  // 204/205/304 must not carry a body — NextResponse.json would throw → 500.
  if (res.status === 204 || res.status === 205 || res.status === 304) {
    return new NextResponse(null, { status: res.status });
  }
  const json = await res.json().catch(() => null);
  return NextResponse.json(json ?? { ok: res.ok }, { status: res.status });
}

/** Pass through a whitelisted subset of the caller's query params. */
export function pickSearch(req: Request, keys: string[]): string {
  const src = new URL(req.url).searchParams;
  const out = new URLSearchParams();
  for (const k of keys) {
    const v = src.get(k);
    if (v !== null && v !== "") out.set(k, v);
  }
  return out.toString();
}
