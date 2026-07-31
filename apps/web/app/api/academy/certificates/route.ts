import { NextResponse } from "next/server";
import { AcademyCertIssueReq } from "@heropips/contracts";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { growthJson, requireUser } from "@/app/api/academy/_lib";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

const CertBody = AcademyCertIssueReq.omit({ user_id: true });

/** Issue (idempotent) — growth answers 409 academy_track_incomplete when not earned. */
export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("academy:certificates", POLICY.authedWrite));
  if (limited) return limited;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = CertBody.safeParse(body);
  if (!parsed.success) return validationFailed("Certificate claims need a valid track (level-0 through level-9 or hero-trader).");
  return growthJson("/v1/academy/certificates", { method: "POST", req, body: { ...parsed.data, user_id: user.id } });
}
