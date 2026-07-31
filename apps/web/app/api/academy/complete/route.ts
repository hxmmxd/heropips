import { NextResponse } from "next/server";
import { AcademyCompleteReq } from "@heropips/contracts";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { growthJson, requireUser } from "@/app/api/academy/_lib";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

const CompleteBody = AcademyCompleteReq.omit({ user_id: true });

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("academy:complete", POLICY.authedWrite));
  if (limited) return limited;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = CompleteBody.safeParse(body);
  if (!parsed.success) return validationFailed("Lesson completion needs lesson_slug, score and total.");
  return growthJson("/v1/academy/complete", { method: "POST", req, body: { ...parsed.data, user_id: user.id } });
}
