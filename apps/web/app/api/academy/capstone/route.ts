import { NextResponse } from "next/server";
import { ConnectionsRes, TradesRes } from "@heropips/contracts";
import { ServiceError, serviceGet, TRADING_URL } from "@/lib/session";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { GrowthError, growthJson, loadProgress, requireUser, unavailable } from "@/app/api/academy/_lib";

export const dynamic = "force-dynamic";

const CAPSTONE_SLUG = "paper-trading-capstone";

/**
 * Capstone verification — missions are derived from the member's REAL
 * trading account, never self-reported. When both missions pass and the
 * capstone lesson is still open, the BFF completes it against growth once;
 * afterwards the recorded completion short-circuits (auto-complete is
 * exactly-once by construction).
 */
export async function GET(req: Request) {
  // Three upstream calls plus a conditional write per request, so this reads
  // like a write. Keyed by IP because the limit has to bite before the
  // session introspection inside requireUser() has been spent.
  const limited = await enforce(req, byIp("academy:capstone", POLICY.authedWrite));
  if (limited) return limited;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  try {
    const [connections, trades, progress] = await Promise.all([
      serviceGet(TRADING_URL, "/v1/connections", ConnectionsRes),
      serviceGet(TRADING_URL, "/v1/trades?limit=100", TradesRes),
      loadProgress(user, req),
    ]);

    const paperConnected = connections.connections.some((c) => c.mode === "paper" || c.broker === "paper");
    // Every TradeRowRes is a closed round-trip (exit + closed_at by contract);
    // execution is paper-only today, so the page count IS the paper count.
    const tradesDone = paperConnected && trades.trades.length >= 3;

    let completed = progress.completions[CAPSTONE_SLUG] !== undefined;
    if (!completed && paperConnected && tradesDone) {
      const res = await growthJson("/v1/academy/complete", {
        method: "POST",
        req,
        body: { user_id: user.id, lesson_slug: CAPSTONE_SLUG, score: 3, total: 3 },
      });
      completed = res.ok;
    }

    return NextResponse.json({
      missions: [
        { id: "paper-connect", label: "Create a paper trading account", done: paperConnected },
        { id: "paper-3-trades", label: "Close 3 paper trades (stops attached)", done: tradesDone },
      ],
      completed,
    });
  } catch (err) {
    if (err instanceof ServiceError) return NextResponse.json(err.body, { status: err.status });
    if (err instanceof GrowthError) return NextResponse.json(err.body, { status: err.status });
    return unavailable();
  }
}
