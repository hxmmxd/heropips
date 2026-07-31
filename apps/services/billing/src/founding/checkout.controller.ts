import { Body, Controller, Headers, HttpCode, Inject, Post, Req } from "@nestjs/common";
import { z } from "zod";
import type { CheckoutRes } from "@heropips/contracts";
import { clientIp, type HttpRequest } from "../common/http";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { FoundingService } from "./founding.service";

/**
 * Optional growth-issued verified-email token. Accepted from the header or from
 * the body (`CheckoutReq` strips unknown keys, so the body copy is read here);
 * enforced only when LTD_REQUIRE_VERIFIED_CHECKOUT=true.
 */
const VERIFY_TOKEN_HEADER = "x-hp-verify-token";
const CheckoutExtras = z.object({ verify_token: z.string().min(1).max(512).optional() });

@Controller("v1/founding")
export class CheckoutController {
  constructor(@Inject(FoundingService) private readonly founding: FoundingService) {}

  /**
   * 5/min + 20/hour per IP. Each accepted call takes a seat off the shelf and
   * creates a payment invoice with a third party, so this is the money class.
   * 5/min still covers a buyer who mistypes an address, switches coin, and
   * retries; the concurrent-hold caps in FoundingService do the real work (M6).
   */
  @Post("checkout")
  @HttpCode(200)
  @RateLimit(perMinute(5, "ip"), perHour(20, "ip"))
  checkout(
    @Body() body: unknown,
    @Req() req: HttpRequest,
    @Headers(VERIFY_TOKEN_HEADER) headerToken: string | undefined,
  ): Promise<CheckoutRes> {
    const extras = CheckoutExtras.safeParse(body ?? {});
    const verifyToken = headerToken ?? (extras.success ? extras.data.verify_token : undefined);
    return this.founding.checkout(body, {
      ip: clientIp(req),
      ...(verifyToken !== undefined ? { verifyToken } : {}),
    });
  }
}
