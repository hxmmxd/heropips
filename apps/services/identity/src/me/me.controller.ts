import { Body, Controller, Get, HttpCode, Inject, Patch, Post, Query, Req } from "@nestjs/common";
import type { AuditListRes, PackageRes, SessionUserRes } from "@heropips/contracts";
import { bearerHeader, type HttpRequest } from "../common/http";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { MeService } from "./me.service";

@Controller("v1/me")
export class MeController {
  constructor(@Inject(MeService) private readonly me: MeService) {}

  /** 300/min/session: authed-read class. Every app page hydrates from this. */
  @Get()
  @RateLimit(perMinute(300, "principal"))
  get(@Req() req: HttpRequest): Promise<SessionUserRes> {
    return this.me.me(bearerHeader(req));
  }

  /** 60/min/session: a DB write plus an audit row per call; nobody edits their profile 60×/min. */
  @Patch()
  @RateLimit(perMinute(60, "principal"))
  update(@Req() req: HttpRequest, @Body() body: unknown): Promise<SessionUserRes> {
    return this.me.updateProfile(bearerHeader(req), body);
  }

  /**
   * The audit's worst offender: two scrypt runs (N=2^15, ~32 MiB + ~100ms CPU
   * each) per request, so ~24 concurrent calls can pin a 768M container.
   * 10/min + 60/hour per session is ~10× a human changing their password and
   * still caps this route's CPU share; the IP rules are the unauthenticated-ish
   * backstop for a stolen-session flood from one address.
   */
  @Post("password")
  @HttpCode(200)
  @RateLimit(perMinute(10, "principal"), perHour(60, "principal"), perMinute(20, "ip"))
  changePassword(@Req() req: HttpRequest, @Body() body: unknown): Promise<{ ok: true }> {
    return this.me.changePassword(bearerHeader(req), body);
  }

  /** 120/min/session: keyset-paged list; a fast scroll-back is a burst of a few. */
  @Get("audit")
  @RateLimit(perMinute(120, "principal"))
  audit(@Req() req: HttpRequest, @Query("cursor") cursor?: string): Promise<AuditListRes> {
    return this.me.auditList(bearerHeader(req), cursor);
  }

  /** 300/min/session: authed-read class, same as GET /v1/me. */
  @Get("package")
  @RateLimit(perMinute(300, "principal"))
  package(@Req() req: HttpRequest): Promise<PackageRes> {
    return this.me.packageInfo(bearerHeader(req));
  }
}
