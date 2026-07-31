import { NextResponse } from "next/server";
import { EarlyAccessCodeReq, EarlyAccessCodeRes } from "@heropips/contracts";
import { growth } from "@/lib/api";
import { bodyLimit, toResponse, validationFailed } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { requireSameOrigin } from "@/app/api/_lib/origin";

/**
 * Step 1 of signup: email a 6-digit verification code.
 * Own budget — every call sends real mail, so it must not draw on any shared
 * one. growth-svc additionally enforces a per-address resend cooldown.
 */
export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("early-access:code", POLICY.emailSend));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = EarlyAccessCodeReq.safeParse(body);
  if (!parsed.success) return validationFailed("Enter a valid email address.");
  try {
    const res = await growth.post("/v1/early-access/code", parsed.data, EarlyAccessCodeRes, { req });
    return NextResponse.json(res);
  } catch (err) {
    return toResponse(err);
  }
}
