import { NextResponse } from "next/server";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { growthJson, requireUser } from "@/app/api/academy/_lib";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

/** Once per UTC day; growth answers 409 academy_spin_used — mirrored as-is. */
export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  // The once-a-day rule is business logic; every rejected attempt still costs
  // a SELECT … FOR UPDATE transaction, so the attempts themselves are capped.
  const limited = await enforce(req, byIp("academy:spin", POLICY.authedWrite));
  if (limited) return limited;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return growthJson("/v1/academy/spin", { method: "POST", req, body: { user_id: user.id } });
}
