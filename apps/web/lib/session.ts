import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { ApiError, SessionUserRes } from "@heropips/contracts";

/* =========================================================================
 * Session + platform service access (server-only).
 * The opaque identity bearer lives in the httpOnly "__Host-hp_session"
 * cookie; it never reaches client JS. Server components forward it upstream.
 * ======================================================================= */

/** Defined in ./session-cookie so edge middleware can read the name without
 *  dragging server-only, next/headers and react's cache() into the bundle. */
export { SESSION_COOKIE, SESSION_COOKIE_ATTRS, SESSION_COOKIE_CLEARED } from "./session-cookie";
import { SESSION_COOKIE } from "./session-cookie";

export const IDENTITY_URL = process.env.IDENTITY_URL ?? "http://localhost:4003";
export const SIGNAL_URL = process.env.SIGNAL_URL ?? "http://localhost:4004";
export const TRADING_URL = process.env.TRADING_URL ?? "http://localhost:4005";

/** Raw bearer from the session cookie, or null. */
export async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Validated session user, or null. Introspects against identity-svc;
 * deduped per request via React cache().
 */
export const getSession = cache(async (): Promise<SessionUserRes | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${IDENTITY_URL}/v1/auth/introspect`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return SessionUserRes.parse(await res.json());
  } catch {
    return null;
  }
});

/* ---------- authenticated server-side service calls (pages) ---------- */

export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: z.infer<typeof ApiError>,
  ) {
    super(body.message);
    this.name = "ServiceError";
  }
}

/**
 * GET an upstream service as the signed-in member and parse the response.
 * 401 upstream ⇒ redirect to login (session died between introspect and use).
 */
export async function serviceGet<T>(base: string, path: string, schema: z.ZodType<T>): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/app/login");
  const res = await fetch(`${base}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/app/login");
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ServiceError(
      res.status,
      parsed.success ? parsed.data : { error_code: "internal", message: "Upstream service error" },
    );
  }
  return schema.parse(json);
}
