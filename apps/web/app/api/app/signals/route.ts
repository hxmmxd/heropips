import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, pickSearch, sessionSubject, SIGNAL_URL } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:signals", POLICY.marketData, await sessionSubject()));
  if (limited) return limited;
  return forward(req, SIGNAL_URL, "/v1/signals", { search: pickSearch(req, ["status", "limit"]) });
}
