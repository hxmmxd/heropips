import { NextResponse } from "next/server";
import { EarlyAccessStatusRes } from "@heropips/contracts";
import { growth } from "@/lib/api";
import { toResponse } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";

export async function GET(req: Request) {
  // HMAC status token: unlimited lookups are a guessing oracle, and the
  // member who owns the link polls it a handful of times.
  const limited = await enforce(req, byIp("early-access:status", POLICY.tokenLookup));
  if (limited) return limited;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error_code: "invalid_token", message: "Missing status token.", remediation: "Use the link from your early access confirmation." },
      { status: 401 },
    );
  }
  try {
    const res = await growth.get(`/v1/early-access/status?token=${encodeURIComponent(token)}`, EarlyAccessStatusRes, { req });
    return NextResponse.json(res);
  } catch (err) {
    return toResponse(err);
  }
}
