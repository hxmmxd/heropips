import "server-only";
import { NextResponse } from "next/server";
import { AcademyProgressRes, ApiError, type SessionUserRes } from "@heropips/contracts";
import { getSession } from "@/lib/session";
import { INTERNAL_SVC_HEADERS } from "@/lib/api";
import { clientIpHeader } from "@/app/api/_lib/client-ip";

/* =========================================================================
 * Academy BFF plumbing. Growth academy endpoints are INTERNAL (no bearer):
 * the BFF introspects the session cookie, injects identity into request
 * bodies, and mirrors upstream statuses back to the client. Server pages
 * reuse loadProgress() for first-paint data without an extra hop.
 * ======================================================================= */

export const GROWTH_URL = process.env.GROWTH_URL ?? "http://localhost:4001";

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

/** Introspected session user, or a ready-to-return 401. */
export async function requireUser(): Promise<SessionUserRes | NextResponse> {
  const user = await getSession();
  return user ?? unauthorized();
}

/**
 * `req` is the caller's route-handler Request; it propagates the resolved
 * client IP upstream (growth runs without `trustProxy`). Server components
 * render outside a request handler and omit it.
 */
type GrowthInit = { method?: "GET" | "POST"; body?: unknown; req?: Request };

async function growthFetch(path: string, init: GrowthInit = {}): Promise<{ status: number; ok: boolean; json: unknown }> {
  const res = await fetch(`${GROWTH_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      // /v1/academy/** is an internal surface — growth 401s it without the token.
      ...INTERNAL_SVC_HEADERS,
      ...clientIpHeader(init.req),
      ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  return { status: res.status, ok: res.ok, json: await res.json().catch(() => null) };
}

/** Call growth and mirror its status + JSON body back to the client. */
export async function growthJson(path: string, init: GrowthInit = {}): Promise<NextResponse> {
  let out: { status: number; ok: boolean; json: unknown };
  try {
    out = await growthFetch(path, init);
  } catch {
    return unavailable();
  }
  return NextResponse.json(out.json ?? { ok: out.ok }, { status: out.status });
}

export class GrowthError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message);
    this.name = "GrowthError";
  }
}

function toApiError(json: unknown): ApiError {
  const parsed = ApiError.safeParse(json);
  return parsed.success ? parsed.data : { error_code: "internal", message: "Upstream service error" };
}

/**
 * Progress with first-touch auto-create: growth 404 (academy_not_found)
 * means the member never synced — POST /sync with session identity and
 * return the fresh progress. Shared by the progress route and member pages.
 */
export async function loadProgress(
  user: Pick<SessionUserRes, "id" | "email" | "display_name">,
  req?: Request,
): Promise<AcademyProgressRes> {
  const got = await growthFetch(`/v1/academy/progress/${encodeURIComponent(user.id)}`, { req });
  if (got.ok) return AcademyProgressRes.parse(got.json);
  const err = toApiError(got.json);
  if (got.status === 404 && err.error_code === "academy_not_found") {
    const synced = await growthFetch("/v1/academy/sync", {
      method: "POST",
      req,
      body: { user_id: user.id, email: user.email, display_name: user.display_name },
    });
    if (synced.ok) return AcademyProgressRes.parse(synced.json);
    throw new GrowthError(synced.status, toApiError(synced.json));
  }
  throw new GrowthError(got.status, err);
}
