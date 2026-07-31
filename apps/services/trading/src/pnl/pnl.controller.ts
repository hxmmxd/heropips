import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import type { EquityCurveRes, PnlSummaryRes, PositionsRes, TradesRes } from "@heropips/contracts";
import { INTROSPECTOR, requireUser, type Introspector, type RequestLike } from "../auth/introspect";
import { perMinute, RateLimit } from "../common/rate-limit";
import { ReadService } from "./read.service";

/**
 * Authed-read class: 300/min/session (5/s) with a 600/min/IP backstop. The
 * dashboard polls equity, positions and summary together on a timer, so a
 * member legitimately makes several calls every few seconds; these are set to
 * absorb that plus a hard refresh loop.
 */
const AUTHED_READ = [perMinute(300, "principal"), perMinute(600, "ip")] as const;

@Controller("v1")
export class PnlController {
  constructor(
    @Inject(ReadService) private readonly reads: ReadService,
    @Inject(INTROSPECTOR) private readonly introspector: Introspector,
  ) {}

  @Get("pnl/summary")
  @RateLimit(...AUTHED_READ)
  async summary(@Req() req: RequestLike): Promise<PnlSummaryRes> {
    const user = await requireUser(req, this.introspector);
    return this.reads.summary(user);
  }

  @Get("pnl/equity")
  @RateLimit(...AUTHED_READ)
  async equity(@Req() req: RequestLike, @Query("points") points?: string): Promise<EquityCurveRes> {
    const user = await requireUser(req, this.introspector);
    const parsed = points === undefined ? undefined : Number(points);
    return this.reads.equityCurve(user, Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get("positions")
  @RateLimit(...AUTHED_READ)
  async positions(@Req() req: RequestLike): Promise<PositionsRes> {
    const user = await requireUser(req, this.introspector);
    return this.reads.positions(user);
  }

  @Get("trades")
  @RateLimit(...AUTHED_READ)
  async trades(@Req() req: RequestLike, @Query("cursor") cursor?: string): Promise<TradesRes> {
    const user = await requireUser(req, this.introspector);
    return this.reads.trades(user, cursor || undefined);
  }
}
