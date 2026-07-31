import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, sessionSubject, TRADING_URL } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  // A market order per call — same budget as placing one.
  const limited = await enforce(req, ...scoped("app:positions:close", POLICY.trade, await sessionSubject()));
  if (limited) return limited;
  const { id } = await ctx.params;
  return forward(req, TRADING_URL, `/v1/positions/${encodeURIComponent(id)}/close`, { method: "POST" });
}
