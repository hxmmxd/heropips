import { NextResponse } from "next/server";
import { z } from "zod";
import { growth } from "@/lib/api";
import { byIp, enforce, POLICY } from "@/app/api/_lib/rate-limit";
import { MAIL_TRACKING_ID, MAX_CLICK_URL } from "@/app/api/mail/_lib";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heropips.com";

/**
 * Click-through redirect: record the click in growth, then 302 to the real
 * destination. Any failure (bad id, tampered url, growth down) falls back
 * to the homepage — a mail link must never dead-end on an error page.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await enforce(req, byIp("mail:click", POLICY.mailTracking));
  if (limited) return limited;
  const { id } = await ctx.params;
  const home = NextResponse.redirect(new URL("/", SITE), 302);
  if (!MAIL_TRACKING_ID.test(id)) return home;
  const raw = new URL(req.url).searchParams.get("u") ?? "";
  // growth checks the target against the public origin; here we only bound it.
  const u = raw.length > MAX_CLICK_URL ? "" : raw;
  try {
    const res = await growth.get(
      `/v1/messaging/click/${encodeURIComponent(id)}?u=${encodeURIComponent(u)}`,
      z.object({ to: z.string() }),
      { req },
    );
    return NextResponse.redirect(res.to, 302);
  } catch {
    return home;
  }
}
