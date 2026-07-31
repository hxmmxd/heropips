import { NextResponse } from "next/server";
import { SeatsRes } from "@heropips/contracts";
import { billing } from "@/lib/api";
import { toResponse } from "@/app/api/_lib/bff";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, byIp("founding:seats", POLICY.publicRead));
  if (limited) return limited;
  try {
    const res = await billing.get("/v1/founding/seats", SeatsRes, { req });
    return NextResponse.json(res, { headers: { "cache-control": "public, s-maxage=5, stale-while-revalidate=10" } });
  } catch (err) {
    return toResponse(err);
  }
}
