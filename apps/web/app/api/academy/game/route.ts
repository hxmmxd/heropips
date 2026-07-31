import { NextResponse } from "next/server";
import { AcademyGameReq } from "@heropips/contracts";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { growthJson, requireUser } from "@/app/api/academy/_lib";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

const GameBody = AcademyGameReq.omit({ user_id: true });

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("academy:game", POLICY.authedWrite));
  if (limited) return limited;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = GameBody.safeParse(body);
  if (!parsed.success) return validationFailed("Game rounds need a game id and a won flag.");
  return growthJson("/v1/academy/game", { method: "POST", req, body: { ...parsed.data, user_id: user.id } });
}
