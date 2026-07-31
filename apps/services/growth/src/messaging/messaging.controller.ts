import { Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import type { UnsubscribeRes } from "@heropips/contracts";
import { apiError } from "../common/errors";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { MessagingService } from "./messaging.service";

/**
 * M4: query/path inputs are shape-checked before use. Tokens are bounded
 * strings; tracking ids are `<sendId>.<hmac>` (M7), base64url + one dot.
 */
const StatusToken = z.string().min(1).max(512);
const TrackingId = z
  .string()
  .max(200)
  .regex(/^[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{16,64}$/);
const ClickTarget = z.string().max(2048);

/**
 * Internal HTTP surface, exposed publicly ONLY through the web BFF:
 *   /api/mail/unsubscribe → GET/POST /v1/messaging/unsubscribe
 *   /api/mail/o/:id       → GET /v1/messaging/open/:id (BFF serves the gif)
 *   /api/mail/c/:id       → GET /v1/messaging/click/:id (BFF issues the 302)
 *
 * These stay unauthenticated by design — they are reached from a mail client,
 * which carries no session — so each one is rate limited on the client IP and
 * validates its own inputs.
 */
@Controller("v1/messaging")
export class MessagingController {
  constructor(@Inject(MessagingService) private readonly messaging: MessagingService) {}

  /**
   * 30/min + 120/hour per IP. Unsubscribing is a once-ever click, so this is
   * pure headroom for a mail client that prefetches links; it caps the
   * token-guessing rate against an HMAC that is not guessable anyway.
   */
  @Get("unsubscribe")
  @RateLimit(perMinute(30, "ip"), perHour(120, "ip"))
  unsubscribe(@Query("token") token: string | undefined): Promise<UnsubscribeRes> {
    return this.messaging.unsubscribe(requireStatusToken(token));
  }

  /** RFC 8058 one-click target (mail clients POST with no body semantics we need). */
  @Post("unsubscribe")
  @RateLimit(perMinute(30, "ip"), perHour(120, "ip"))
  unsubscribeOneClick(@Query("token") token: string | undefined): Promise<UnsubscribeRes> {
    return this.messaging.unsubscribe(requireStatusToken(token));
  }

  /**
   * 120/min/IP: one pixel per opened mail, but corporate mail gateways and
   * image proxies fetch on behalf of many recipients from a single address, so
   * this is set well above one-per-mail. A bad tag never reaches the DB (M7).
   */
  @Get("open/:id")
  @RateLimit(perMinute(120, "ip"))
  open(@Param("id") id: string): Promise<{ ok: true }> {
    const parsed = TrackingId.safeParse(id);
    // Unparseable ids are indistinguishable from unknown ones: same 200, no write.
    if (!parsed.success) return Promise.resolve({ ok: true });
    return this.messaging.trackOpen(parsed.data);
  }

  /** 120/min/IP, same reasoning as the open pixel; an invalid id still redirects. */
  @Get("click/:id")
  @RateLimit(perMinute(120, "ip"))
  click(@Param("id") id: string, @Query("u") u: string | undefined): Promise<{ to: string }> {
    const parsed = TrackingId.safeParse(id);
    const target = ClickTarget.safeParse(u);
    const url = target.success ? target.data : undefined;
    // "" can never carry a valid tag, so a malformed id takes the same
    // no-write path as an unknown one and still gets the safe redirect.
    return this.messaging.trackClick(parsed.success ? parsed.data : "", url);
  }
}

function requireStatusToken(token: string | undefined): string {
  const parsed = StatusToken.safeParse(token);
  if (!parsed.success) {
    throw apiError(401, "invalid_token", "This unsubscribe link is invalid or expired.");
  }
  return parsed.data;
}
