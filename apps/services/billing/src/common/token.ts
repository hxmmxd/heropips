import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * STATUS TOKEN (shared web <-> services contract):
 *   base64url(JSON.stringify(payload)) + "." + hex(HMAC-SHA256(base64urlPayload, secret))
 * Billing payload: { o: "<order_id>" }.
 */
export function signStatusToken(payload: Record<string, string>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${mac}`;
}

export function verifyStatusToken(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1).toLowerCase();
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(mac, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
