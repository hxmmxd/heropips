import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { SignalListRes } from "@heropips/contracts";
import { apiError } from "../common/errors";
import { perMinute, RateLimit } from "../common/rate-limit";
import type { StatusFilter } from "./signals.repo";
import { SignalsService } from "./signals.service";

const STATUS_FILTERS: Record<string, true> = { active: true, resolved: true, all: true };
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** No auth by design: signals are platform-gated at the web BFF. */
@Controller("v1/signals")
export class SignalsController {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(SignalsService) private readonly signals: SignalsService) {}

  /** 600/min/session, 1200/min/IP: a read of at most 200 indexed rows; loose on purpose. */
  @Get()
  @RateLimit(perMinute(600, "principal"), perMinute(1200, "ip"))
  async list(@Query("status") status?: string, @Query("limit") limit?: string): Promise<SignalListRes> {
    const filter = (status ?? "active").trim();
    if (!STATUS_FILTERS[filter]) {
      throw apiError(422, "validation_failed", "status must be one of: active, resolved, all.");
    }
    const parsed = limit === undefined ? DEFAULT_LIMIT : Number.parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      throw apiError(422, "validation_failed", `limit must be an integer between 1 and ${MAX_LIMIT}.`);
    }
    return this.signals.list(filter as StatusFilter, parsed);
  }
}
