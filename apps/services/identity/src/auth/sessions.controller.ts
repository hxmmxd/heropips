import { Controller, Delete, Get, Inject, Param, Req } from "@nestjs/common";
import { z } from "zod";
import type { SessionsRes } from "@heropips/contracts";
import { ApiException } from "../common/errors";
import { bearerHeader, type HttpRequest } from "../common/http";
import { perMinute, RateLimit } from "../common/rate-limit";
import { AuthService } from "./auth.service";

/** M4: path params are validated before use, not just trusted downstream. */
const SessionId = z.string().uuid();

@Controller("v1/sessions")
export class SessionsController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  /** 120/min/session: the settings page refetches after each revoke; a human clicks a handful of times. */
  @Get()
  @RateLimit(perMinute(120, "principal"))
  list(@Req() req: HttpRequest): Promise<SessionsRes> {
    return this.auth.sessions(bearerHeader(req));
  }

  /** 60/min/session: "revoke all" from a device list of a few dozen sessions still fits. */
  @Delete(":id")
  @RateLimit(perMinute(60, "principal"))
  revoke(@Req() req: HttpRequest, @Param("id") id: string): Promise<{ ok: true }> {
    const parsed = SessionId.safeParse(id);
    if (!parsed.success) throw new ApiException(422, "validation_failed", "Session id must be a uuid.");
    return this.auth.revokeSessionById(bearerHeader(req), parsed.data);
  }
}
