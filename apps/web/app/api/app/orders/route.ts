import { OrderReq } from "@heropips/contracts";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, sessionSubject, TRADING_URL } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  // Order placement had no limit at any layer; idempotency_key only stops an
  // exact replay, so distinct keys meant unbounded order flow into a DB tx.
  const limited = await enforce(req, ...scoped("app:orders", POLICY.trade, await sessionSubject()));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = OrderReq.safeParse(body);
  if (!parsed.success) return validationFailed("Order needs a connection, symbol, side and exactly one of qty or risk %.");
  return forward(req, TRADING_URL, "/v1/orders", { method: "POST", body: parsed.data });
}
