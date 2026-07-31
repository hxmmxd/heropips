import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Exact NOWPayments IPN algorithm:
 * hex(HMAC-SHA512(JSON.stringify(params, Object.keys(params).sort()), secret)).
 * Exported for tests and mock parity.
 */
export function signIpn(body: Record<string, unknown>, secret: string): string {
  const sorted = JSON.stringify(body, Object.keys(body).sort());
  return createHmac("sha512", secret).update(sorted).digest("hex");
}

export type IpnVerification = {
  valid: boolean;
  /** Parsed JSON body (present when the raw bytes parsed, even if the sig failed). */
  body: Record<string, unknown> | null;
};

/** Verify against the exact raw bytes received; both sides compared lowercase. */
export function verifyIpn(
  raw: Buffer,
  headerSig: string | undefined,
  secret: string,
): IpnVerification {
  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return { valid: false, body: null };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, body: null };
  }
  const parsed = body as Record<string, unknown>;
  if (!headerSig) return { valid: false, body: parsed };

  const expected = signIpn(parsed, secret); // already lowercase hex
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(headerSig.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return { valid: false, body: parsed };
  return { valid: timingSafeEqual(a, b), body: parsed };
}
