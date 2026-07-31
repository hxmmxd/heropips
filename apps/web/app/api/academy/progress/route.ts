import { NextResponse } from "next/server";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { GrowthError, loadProgress, requireUser, unavailable } from "@/app/api/academy/_lib";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // A miss triggers an upstream POST /sync write, so this read is not free.
  const limited = await enforce(req, byIp("academy:progress", POLICY.authedRead));
  if (limited) return limited;
  const user = await requireUser();
  // Anonymous probe is an expected, constant event on every academy page —
  // 204 keeps the browser console clean (a 401 would log a resource error).
  if (user instanceof NextResponse) return new NextResponse(null, { status: 204 });
  try {
    return NextResponse.json(await loadProgress(user, req));
  } catch (err) {
    if (err instanceof GrowthError) return NextResponse.json(err.body, { status: err.status });
    return unavailable();
  }
}
