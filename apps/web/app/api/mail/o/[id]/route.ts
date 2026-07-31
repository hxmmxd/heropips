import { NextResponse } from "next/server";
import { z } from "zod";
import { growth } from "@/lib/api";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { MAIL_TRACKING_ID } from "@/app/api/mail/_lib";

/** 1x1 transparent GIF — the response is the pixel, tracking is best-effort. */
const PIXEL = new Uint8Array(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));

const PIXEL_RESPONSE: ResponseInit = {
  headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0" },
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await enforce(req, byIp("mail:open", POLICY.mailTracking));
  if (limited) return limited;
  const { id } = await ctx.params;
  // A malformed id can only be a probe: serve the pixel, skip the DB write.
  if (!MAIL_TRACKING_ID.test(id)) return new NextResponse(PIXEL, PIXEL_RESPONSE);
  await growth
    .get(`/v1/messaging/open/${encodeURIComponent(id)}`, z.object({ ok: z.boolean() }), { req })
    .catch(() => undefined);
  return new NextResponse(PIXEL, PIXEL_RESPONSE);
}
