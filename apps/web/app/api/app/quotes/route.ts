import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, pickSearch, sessionSubject, SIGNAL_URL } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Fans out to signal-svc, which may call Binance — an unlimited caller here
  // burns a third-party quota, not just our CPU.
  const limited = await enforce(req, ...scoped("app:quotes", POLICY.marketData, await sessionSubject()));
  if (limited) return limited;
  return forward(req, SIGNAL_URL, "/v1/quotes", { search: pickSearch(req, ["symbols"]) });
}
