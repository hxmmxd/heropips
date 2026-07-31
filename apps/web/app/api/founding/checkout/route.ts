import { NextResponse } from "next/server";
import { CheckoutReq, CheckoutRes } from "@heropips/contracts";
import { billing } from "@/lib/api";
import { bodyLimit, toResponse, validationFailed } from "@/app/api/_lib/bff";
import { byIp, bySubject, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, byIp("founding:checkout", POLICY.unauthWrite));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = CheckoutReq.safeParse(body);
  if (!parsed.success) return validationFailed("Enter a valid email address.");
  // Every accepted call holds a founding seat for HOLD_TTL_MINUTES, so the
  // buyer's address is the second key: rotating IPs cannot drain the cohort
  // from one inbox, and a real buyer never needs more than a few attempts.
  const perBuyer = await enforce(req, bySubject("founding:checkout", POLICY.unauthWrite, parsed.data.email));
  if (perBuyer) return perBuyer;
  try {
    const res = await billing.post("/v1/founding/checkout", parsed.data, CheckoutRes, { req });
    return NextResponse.json(res);
  } catch (err) {
    return toResponse(err);
  }
}
