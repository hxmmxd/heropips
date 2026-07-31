import { Body, Controller, Get, HttpCode, Inject, Post, Query } from "@nestjs/common";
import { z } from "zod";
import {
  EarlyAccessCodeReq,
  EarlyAccessVerifyReq,
  type EarlyAccessCodeRes,
  type EarlyAccessJoinRes,
  type EarlyAccessStatsRes,
  type EarlyAccessStatusRes,
} from "@heropips/contracts";
import { apiError, zodDetails } from "../common/errors";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { EarlyAccessService } from "./early-access.service";

/** M4: the status token is a bounded string before it is used as a lookup key. */
const StatusToken = z.string().min(1).max(512);

@Controller("v1/early-access")
export class EarlyAccessController {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(EarlyAccessService) private readonly earlyAccess: EarlyAccessService) {}

  /**
   * Step 1 — email a 6-digit code. Nothing is written to the queue yet.
   * 10/min + 40/hour per IP. The service already enforces a per-address resend
   * cooldown; this bounds address *enumeration* (each attempt costs an email
   * send) while leaving room for a family or an office behind one address.
   */
  @Post("code")
  @HttpCode(200)
  @RateLimit(perMinute(10, "ip"), perHour(40, "ip"))
  async requestCode(@Body() body: unknown): Promise<EarlyAccessCodeRes> {
    const parsed = EarlyAccessCodeReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Enter a valid email address.");
    }
    return this.earlyAccess.requestCode(parsed.data);
  }

  /**
   * Step 2 — a correct code is what actually claims the place in line.
   * 20/min + 100/hour per IP. Per-code attempts are already capped in the
   * service; this stops walking codes across many addresses from one host.
   */
  @Post("verify")
  @HttpCode(200)
  @RateLimit(perMinute(20, "ip"), perHour(100, "ip"))
  async verify(@Body() body: unknown): Promise<EarlyAccessJoinRes> {
    const parsed = EarlyAccessVerifyReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.earlyAccess.verify(parsed.data);
  }

  /** 60/min/IP: a public counter on the marketing page, cheap but not free. */
  @Get("stats")
  @RateLimit(perMinute(60, "ip"))
  async stats(): Promise<EarlyAccessStatsRes> {
    return this.earlyAccess.stats();
  }

  /**
   * HMAC status-token oracle: unlimited guesses before. 30/min + 300/hour per
   * IP — a member refreshing their queue position does a handful.
   */
  @Get("status")
  @RateLimit(perMinute(30, "ip"), perHour(300, "ip"))
  async status(@Query("token") token?: string): Promise<EarlyAccessStatusRes> {
    const parsed = StatusToken.safeParse(token);
    if (!parsed.success) {
      throw apiError(401, "invalid_token", "Missing status token.");
    }
    return this.earlyAccess.status(parsed.data);
  }
}
