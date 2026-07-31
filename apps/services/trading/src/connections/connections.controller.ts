import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ConnectionCreateReq, type ConnectionRes, type ConnectionsRes } from "@heropips/contracts";
import { INTROSPECTOR, requireUser, type Introspector, type RequestLike } from "../auth/introspect";
import { apiError, zodDetails } from "../common/errors";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { ConnectionsService } from "./connections.service";

/** M4: validated before it reaches an ownership query. */
const ConnectionId = z.string().uuid();

@Controller("v1/connections")
export class ConnectionsController {
  // Explicit tokens: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(
    @Inject(ConnectionsService) private readonly connections: ConnectionsService,
    @Inject(INTROSPECTOR) private readonly introspector: Introspector,
  ) {}

  /** 120/min/session: read path, but it also runs `ensurePaper`, which can write. */
  @Get()
  @RateLimit(perMinute(120, "principal"), perMinute(300, "ip"))
  async list(@Req() req: RequestLike): Promise<ConnectionsRes> {
    const user = await requireUser(req, this.introspector);
    return this.connections.list(user);
  }

  /**
   * 10/min + 60/hour per session: each call does an AES-GCM encrypt and an
   * outbound broker `validate()` call. A member adds a broker once and may retry
   * a few times after a bad key, so 10/min is ~10× real use.
   */
  @Post()
  @HttpCode(201)
  @RateLimit(perMinute(10, "principal"), perHour(60, "principal"), perMinute(30, "ip"))
  async create(@Req() req: RequestLike, @Body() body: unknown): Promise<ConnectionRes> {
    const user = await requireUser(req, this.introspector);
    const parsed = ConnectionCreateReq.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiError(422, "validation_failed", zodDetails(parsed.error), "Fix the listed fields and retry.");
    }
    return this.connections.create(user, parsed.data);
  }

  /** 30/min/session: deleting a handful of connections in a session is plenty. */
  @Delete(":id")
  @HttpCode(204)
  @RateLimit(perMinute(30, "principal"), perMinute(60, "ip"))
  async remove(@Req() req: RequestLike, @Param("id") id: string): Promise<void> {
    const user = await requireUser(req, this.introspector);
    const parsed = ConnectionId.safeParse(id);
    if (!parsed.success) throw apiError(422, "validation_failed", "Connection id must be a uuid.");
    await this.connections.remove(user, parsed.data);
  }
}
