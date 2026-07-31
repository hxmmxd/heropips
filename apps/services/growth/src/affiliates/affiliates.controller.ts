import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { AffiliateApplyReq } from "@heropips/contracts";
import { apiError, zodDetails } from "../common/errors";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { AffiliatesService } from "./affiliates.service";

@Controller("v1/affiliates")
export class AffiliatesController {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(AffiliatesService) private readonly affiliates: AffiliatesService) {}

  /**
   * 5/min + 20/hour per IP: an application is a once-ever form submission, and
   * each accepted call is a DB insert plus an operational email. 5/min still
   * absorbs a double-click and a retry after a validation error.
   */
  @Post("apply")
  @HttpCode(202)
  @RateLimit(perMinute(5, "ip"), perHour(20, "ip"))
  async apply(@Body() body: unknown): Promise<{ ok: true }> {
    const parsed = AffiliateApplyReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    await this.affiliates.apply(parsed.data);
    return { ok: true };
  }
}
