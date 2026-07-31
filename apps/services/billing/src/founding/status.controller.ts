import { Controller, Get, Inject, Query } from "@nestjs/common";
import { z } from "zod";
import type { OrderStatusRes } from "@heropips/contracts";
import { ApiException } from "../common/errors";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { FoundingService } from "./founding.service";

/** M4: bounded before it is used as a lookup key. */
const StatusToken = z.string().min(1).max(512);

@Controller("v1/founding")
export class StatusController {
  constructor(@Inject(FoundingService) private readonly founding: FoundingService) {}

  /**
   * HMAC status-token oracle: unlimited guesses before. 60/min + 600/hour per
   * IP — the status page polls while a payment confirms, which is a few calls a
   * minute, so this leaves an order of magnitude of headroom.
   */
  @Get("status")
  @RateLimit(perMinute(60, "ip"), perHour(600, "ip"))
  status(@Query("token") token?: string): Promise<OrderStatusRes> {
    const parsed = StatusToken.safeParse(token);
    if (!parsed.success) {
      throw new ApiException(
        401,
        "invalid_token",
        "Status token is missing or invalid.",
        "Use the link from your checkout confirmation.",
      );
    }
    return this.founding.status(parsed.data);
  }
}
