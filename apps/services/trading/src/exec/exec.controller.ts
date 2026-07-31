import { Body, Controller, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { OrderReq, type OrderRes } from "@heropips/contracts";
import { INTROSPECTOR, requireUser, type Introspector, type RequestLike } from "../auth/introspect";
import { apiError, zodDetails } from "../common/errors";
import { perMinute, RateLimit } from "../common/rate-limit";
import { ExecService } from "./exec.service";

/** M4: validated before it reaches an ownership query. */
const PositionId = z.string().uuid();

@Controller("v1")
export class ExecController {
  constructor(
    @Inject(ExecService) private readonly exec: ExecService,
    @Inject(INTROSPECTOR) private readonly introspector: Introspector,
  ) {}

  /**
   * Order placement had no limit at any layer: only `idempotency_key` stopped
   * an exact replay, so distinct keys meant unbounded order flow into a DB
   * transaction. 60/min/session — a fast discretionary trader places a few
   * orders a minute and an algo client is not a product we sell, so 1/s is
   * generous — with a 120/min/IP backstop.
   */
  @Post("orders")
  @HttpCode(200)
  @RateLimit(perMinute(60, "principal"), perMinute(120, "ip"))
  async placeOrder(@Req() req: RequestLike, @Body() body: unknown): Promise<OrderRes> {
    const user = await requireUser(req, this.introspector);
    const parsed = OrderReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.exec.placeOrder(user, parsed.data);
  }

  /** 60/min/session: a market order per call. Closing every open position still fits. */
  @Post("positions/:id/close")
  @HttpCode(200)
  @RateLimit(perMinute(60, "principal"), perMinute(120, "ip"))
  async closePosition(@Req() req: RequestLike, @Param("id") id: string): Promise<OrderRes> {
    const user = await requireUser(req, this.introspector);
    const parsed = PositionId.safeParse(id);
    if (!parsed.success) throw apiError(422, "validation_failed", "Position id must be a uuid.");
    return this.exec.closePosition(user, parsed.data);
  }
}
