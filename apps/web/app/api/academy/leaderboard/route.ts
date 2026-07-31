import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { pickSearch } from "@/app/api/app/_lib/proxy";
import { growthJson } from "@/app/api/academy/_lib";

export const dynamic = "force-dynamic";

/** Public — display names + XP only, no session required. */
export async function GET(req: Request) {
  const limited = await enforce(req, byIp("academy:leaderboard", POLICY.publicRead));
  if (limited) return limited;
  const search = pickSearch(req, ["limit"]);
  return growthJson(`/v1/academy/leaderboard${search ? `?${search}` : ""}`, { req });
}
