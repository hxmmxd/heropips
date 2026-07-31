import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { FoundingService, type FoundingVerifyRes } from "./founding.service";

/** Internal endpoint for identity-svc: verifies a founding purchase during redeem. */
@Controller("v1/founding")
export class VerifyController {
  constructor(@Inject(FoundingService) private readonly founding: FoundingService) {}

  /**
   * 60/min + 600/hour per IP. Called once per access redemption by identity, so
   * real volume is tiny; the limit exists because an (order_id, email) pair is
   * an ownership oracle if this is ever reachable from outside the network.
   */
  @Post("verify")
  @HttpCode(200)
  @RateLimit(perMinute(60, "ip"), perHour(600, "ip"))
  verify(@Body() body: unknown): Promise<FoundingVerifyRes> {
    return this.founding.verifyPurchase(body);
  }
}
