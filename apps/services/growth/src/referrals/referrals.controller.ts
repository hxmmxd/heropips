import { Body, Controller, Get, Headers, HttpCode, Inject, Patch, Post } from "@nestjs/common";
import {
  ReferralAttributeReq,
  ReferralConfigPatchReq,
  ReferralLinkReq,
  ReferralReverseReq,
  type ReferralAttributionRes,
  type ReferralConfigRes,
} from "@heropips/contracts";
import { apiError, zodDetails } from "../common/errors";
import { InternalOnly } from "../common/internal-auth";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { ReferralsService } from "./referrals.service";

/**
 * Internal endpoints — called service-to-service (BFF/billing), never public.
 * @InternalOnly() requires the shared INTERNAL_SVC_TOKEN (H4); the referral
 * tree is money, and these routes take the acting ids from the body.
 */
@Controller("v1/referrals")
export class ReferralsController {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(ReferralsService) private readonly referrals: ReferralsService) {}

  /** 60/min/IP: one link per new member; the IP here is a sibling service, so this is a flood stop only. */
  @Post("link")
  @HttpCode(201)
  @InternalOnly()
  @RateLimit(perMinute(60, "ip"))
  async link(@Body() body: unknown): Promise<{ ok: true }> {
    const parsed = ReferralLinkReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.referrals.link(parsed.data.child_id, parsed.data.parent_id);
  }

  /** 120/min/IP: read-only config, cached by callers; loose on purpose. */
  @Get("config")
  @InternalOnly()
  @RateLimit(perMinute(120, "ip"))
  config(): Promise<ReferralConfigRes> {
    return this.referrals.getConfig();
  }

  /**
   * Admin-token brute force was line-rate before (no limit, and the compare
   * was not constant time — M9). 10/min + 30/hour per IP: an operator patches
   * payout rates a few times a year.
   */
  @Patch("config")
  @InternalOnly()
  @RateLimit(perMinute(10, "ip"), perHour(30, "ip"))
  async patchConfig(
    @Headers("x-admin-token") adminToken: string | undefined,
    @Body() body: unknown,
  ): Promise<ReferralConfigRes> {
    const parsed = ReferralConfigPatchReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.referrals.patchConfig(adminToken, parsed.data);
  }

  /** 120/min/IP: one call per paid order, from billing. Idempotent per order. */
  @Post("attribute")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(120, "ip"))
  async attribute(@Body() body: unknown): Promise<ReferralAttributionRes> {
    const parsed = ReferralAttributeReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.referrals.attribute(
      parsed.data.order_id,
      parsed.data.buyer_id,
      parsed.data.total_usd_minor,
    );
  }

  /** 120/min/IP: one call per refund, from billing. */
  @Post("reverse")
  @HttpCode(200)
  @InternalOnly()
  @RateLimit(perMinute(120, "ip"))
  async reverse(@Body() body: unknown): Promise<{ ok: true; reversed: number }> {
    const parsed = ReferralReverseReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.referrals.reverse(parsed.data.order_id);
  }
}
