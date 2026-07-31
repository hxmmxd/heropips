import { NextResponse } from "next/server";
import { OrderStatusRes } from "@heropips/contracts";
import { billing } from "@/lib/api";
import { toResponse } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";

export async function GET(req: Request) {
  // The status token is an HMAC: unlimited lookups are an offline-free
  // guessing oracle, and a real buyer polls their own link a handful of times.
  const limited = await enforce(req, byIp("founding:status", POLICY.tokenLookup));
  if (limited) return limited;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error_code: "invalid_token", message: "Missing status token.", remediation: "Use the link from your checkout confirmation." },
      { status: 401 },
    );
  }
  try {
    const res = await billing.get(`/v1/founding/status?token=${encodeURIComponent(token)}`, OrderStatusRes, { req });
    return NextResponse.json(res);
  } catch (err) {
    return toResponse(err);
  }
}
