import { NextResponse } from "next/server";
import { EarlyAccessJoinRes, EarlyAccessVerifyReq } from "@heropips/contracts";
import { growth } from "@/lib/api";
import { bodyLimit, toResponse, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { requireSameOrigin } from "@/app/api/_lib/origin";

/**
 * Step 2 of signup: a correct code claims the place in line. The IP budget
 * caps online guessing from one source; growth-svc caps attempts per code.
 */
export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("early-access:verify", POLICY.codeVerify));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = EarlyAccessVerifyReq.safeParse(body);
  if (!parsed.success) return validationFailed("Enter the 6-digit code from your email.");
  try {
    const res = await growth.post("/v1/early-access/verify", parsed.data, EarlyAccessJoinRes, { req });
    return NextResponse.json(res);
  } catch (err) {
    return toResponse(err);
  }
}
