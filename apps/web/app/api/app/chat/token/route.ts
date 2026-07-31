import { NextResponse } from "next/server";
import { z } from "zod";
import { IDENTITY_URL } from "@/lib/session";
import { clientIpHeader } from "@/app/api/_lib/client-ip";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { requireSameOrigin } from "@/app/api/_lib/origin";
import { bearerToken, sessionSubject, unauthorized, unavailable } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

/** identity-svc mints the ticket; the wire shape is snake_case like every service. */
const ChatTicketRes = z.object({ ticket: z.string().min(1), expires_in: z.number().int().positive() });

/**
 * Mints a short-lived, single-use WebSocket ticket for the Founding Lounge.
 *
 * This route used to hand the browser the raw 30-day session bearer, because
 * a Next route handler cannot proxy a WebSocket. Two problems with that:
 * `httpOnly` on the session cookie became decorative (one XSS anywhere on the
 * origin bought 30 days of trading + PII access), and ChatRoom then put the
 * bearer in the WS query string, which Caddy writes verbatim into its JSON
 * access log and Docker keeps on disk.
 *
 * The ticket is opaque here — the BFF never parses or validates it, identity
 * owns the format. It is good for 60 s, dies on first use, and is passed as a
 * WebSocket subprotocol so it never touches a URL.
 *
 * POST, not GET: this is a credential-minting side effect, and POST puts it
 * behind requireSameOrigin so a third-party page cannot farm tickets.
 */
export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  // Every call mints a live credential upstream: limited as a write, not a read.
  const limited = await enforce(req, ...scoped("app:chat:token", POLICY.authedWrite, await sessionSubject()));
  if (limited) return limited;
  const token = await bearerToken();
  if (!token) return unauthorized();

  let res: Response;
  try {
    res = await fetch(`${IDENTITY_URL}/v1/chat/ticket`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, ...clientIpHeader(req) },
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }
  if (res.status === 401) return unauthorized();
  if (!res.ok) return unavailable();

  const parsed = ChatTicketRes.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return unavailable();
  return NextResponse.json(
    { ticket: parsed.data.ticket, expiresIn: parsed.data.expires_in },
    { headers: { "cache-control": "no-store" } },
  );
}
