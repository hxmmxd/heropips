import type { FoundingVerifier } from "./auth.service";

/**
 * Calls billing-svc POST /v1/founding/verify. Any transport or shape problem
 * degrades to {ok:false} — redeem then falls back to env access codes.
 */
export class HttpFoundingVerifier implements FoundingVerifier {
  constructor(private readonly billingUrl: string) {}

  async verify(email: string, orderId: string): Promise<{ ok: boolean; sku?: string }> {
    const res = await fetch(`${this.billingUrl}/v1/founding/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, order_id: orderId }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as { ok?: boolean; sku?: string };
    return body.ok === true ? { ok: true, sku: body.sku } : { ok: false };
  }
}
