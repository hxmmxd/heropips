import { NextResponse } from "next/server";
import { UnsubscribeRes } from "@heropips/contracts";
import { growth } from "@/lib/api";
import { toResponse, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";

/* ---------- requireSameOrigin EXEMPT (both handlers) ----------
 * These are the only two endpoints in the BFF reachable from outside a
 * browser tab, and neither is CSRF-able:
 *
 * - Authority comes from an unguessable HMAC unsubscribe token in the URL
 *   (growth/src/messaging/config.ts:44), NEVER from the ambient session
 *   cookie. An attacker who can make your browser hit this URL already had
 *   to know the token, i.e. already had the ability to unsubscribe you
 *   directly. There is no confused deputy to exploit.
 * - The POST is the RFC 8058 List-Unsubscribe=One-Click target
 *   (messaging.service.ts:516,537-538). Gmail/Yahoo POST it server-to-server
 *   with no Origin and no Sec-Fetch-Site, so an origin check would 403 every
 *   legitimate one-click unsubscribe — a deliverability and compliance
 *   failure, not a security win.
 * - The GET is the link a human clicks in a mail client, which arrives
 *   `Sec-Fetch-Site: cross-site`.
 * ------------------------------------------------------------- */

export async function GET(req: Request) {
  // Token-guessing oracle: a human follows their own link once or twice.
  const limited = await enforce(req, byIp("mail:unsubscribe", POLICY.tokenLookup));
  if (limited) return limited;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return validationFailed("Missing unsubscribe token.");
  try {
    const res = await growth.get(`/v1/messaging/unsubscribe?token=${encodeURIComponent(token)}`, UnsubscribeRes, { req });
    return NextResponse.json(res);
  } catch (err) {
    return toResponse(err);
  }
}

/**
 * RFC 8058 List-Unsubscribe=One-Click target: mail providers POST here with
 * no user in the loop, so this must ALWAYS answer 200 — a bounce makes the
 * provider retry or flag the message. It carries the mail-tracking budget
 * rather than the tighter token-lookup one: a provider fans a bulk send out
 * across few egress addresses, and a 429 is a retry rather than a bounce.
 */
export async function POST(req: Request) {
  const limited = await enforce(req, byIp("mail:unsubscribe:one-click", POLICY.mailTracking));
  if (limited) return limited;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
    await growth.get(`/v1/messaging/unsubscribe?token=${encodeURIComponent(token)}`, UnsubscribeRes, { req });
  } catch {
    /* swallow — one-click must not bounce */
  }
  return NextResponse.json({ ok: true });
}
