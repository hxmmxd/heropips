import { ConnectionCreateReq } from "@heropips/contracts";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, sessionSubject, TRADING_URL } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:connections", POLICY.authedRead, await sessionSubject()));
  if (limited) return limited;
  return forward(req, TRADING_URL, "/v1/connections");
}

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  // Each call is an AES-GCM encrypt plus an outbound broker validate() —
  // priced with the money moves, not with profile writes.
  const limited = await enforce(req, ...scoped("app:connections:create", POLICY.trade, await sessionSubject()));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = ConnectionCreateReq.safeParse(body);
  if (!parsed.success) return validationFailed("Check the broker, label and credential fields.");
  return forward(req, TRADING_URL, "/v1/connections", { method: "POST", body: parsed.data });
}
