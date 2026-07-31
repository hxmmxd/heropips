import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, pickSearch, sessionSubject, TRADING_URL } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:trades", POLICY.authedRead, await sessionSubject()));
  if (limited) return limited;
  return forward(req, TRADING_URL, "/v1/trades", { search: pickSearch(req, ["cursor", "limit"]) });
}
