import { NextResponse } from "next/server";
import { AcademySyncReq } from "@heropips/contracts";
import { BODY_LIMIT, bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { growthJson, requireUser } from "@/app/api/academy/_lib";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

/** Identity comes from the session — clients may only send claim payload. */
const SyncBody = AcademySyncReq.omit({ user_id: true, email: true, display_name: true });

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("academy:sync", POLICY.authedWrite));
  if (limited) return limited;
  const oversized = bodyLimit(req, BODY_LIMIT.academySync);
  if (oversized) return oversized;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const body = await req.json().catch(() => null);
  const parsed = SyncBody.safeParse(body ?? {});
  if (!parsed.success) return validationFailed("Sync accepts an optional ref_code and device completions.");
  return growthJson("/v1/academy/sync", {
    method: "POST",
    req,
    body: { ...parsed.data, user_id: user.id, email: user.email, display_name: user.display_name },
  });
}
