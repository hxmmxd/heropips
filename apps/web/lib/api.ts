import "server-only";
import type { z } from "zod";
import { ApiError } from "@heropips/contracts";
import { clientIpHeader } from "@/app/api/_lib/client-ip";

const GROWTH = process.env.GROWTH_URL ?? "http://localhost:4001";
const BILLING = process.env.BILLING_URL ?? "http://localhost:4002";

/**
 * Shared bearer for growth's internal-only surfaces (`/v1/academy/**`,
 * `/v1/referrals/**`, affiliate intake). growth enforces it only when it has
 * the token configured, so an unset env sends nothing and stays working.
 */
export const INTERNAL_SVC_HEADERS: Record<string, string> = process.env.INTERNAL_SVC_TOKEN
  ? { "x-hp-internal-token": process.env.INTERNAL_SVC_TOKEN }
  : {};

export class UpstreamError extends Error {
  constructor(public readonly status: number, public readonly body: z.infer<typeof ApiError>) {
    super(body.message);
  }
}

/**
 * `req` propagates the caller's IP so the service tier can key its own
 * limits on a real client rather than the web container. Omitted by server
 * components, which render outside a route handler.
 */
type CallOpts = { req?: Request; internal?: boolean };

async function call<T>(base: string, path: string, init: RequestInit, schema: z.ZodType<T>, opts: CallOpts): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...clientIpHeader(opts.req),
      ...(opts.internal ? INTERNAL_SVC_HEADERS : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    throw new UpstreamError(res.status, parsed.success ? parsed.data : { error_code: "internal", message: "Upstream error" });
  }
  return schema.parse(json);
}

export const growth = {
  post: <T,>(path: string, body: unknown, schema: z.ZodType<T>, opts: CallOpts = {}) =>
    call(GROWTH, path, { method: "POST", body: JSON.stringify(body) }, schema, opts),
  get: <T,>(path: string, schema: z.ZodType<T>, opts: CallOpts = {}) =>
    call(GROWTH, path, { method: "GET" }, schema, opts),
};
export const billing = {
  post: <T,>(path: string, body: unknown, schema: z.ZodType<T>, opts: CallOpts = {}) =>
    call(BILLING, path, { method: "POST", body: JSON.stringify(body) }, schema, opts),
  get: <T,>(path: string, schema: z.ZodType<T>, opts: CallOpts = {}) =>
    call(BILLING, path, { method: "GET" }, schema, opts),
};
