import { NextResponse } from "next/server";
import { z } from "zod";
import { AffiliateApplyReq } from "@heropips/contracts";
import { growth } from "@/lib/api";
import { BODY_LIMIT, bodyLimit, toResponse, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { requireSameOrigin } from "@/app/api/_lib/origin";

const OkRes = z.object({ ok: z.literal(true) });

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("affiliates:apply", POLICY.unauthWrite));
  if (limited) return limited;
  const oversized = bodyLimit(req, BODY_LIMIT.affiliate);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = AffiliateApplyReq.safeParse(body);
  if (!parsed.success) return validationFailed("Fill every required field with valid values.");
  try {
    const res = await growth.post("/v1/affiliates/apply", parsed.data, OkRes, { req, internal: true });
    return NextResponse.json(res, { status: 202 });
  } catch (err) {
    return toResponse(err);
  }
}
