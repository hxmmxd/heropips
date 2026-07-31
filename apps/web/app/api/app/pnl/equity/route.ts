import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, sessionSubject, TRADING_URL } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:pnl:equity", POLICY.authedRead, await sessionSubject()));
  if (limited) return limited;
  return forward(req, TRADING_URL, "/v1/pnl/equity");
}
