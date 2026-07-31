import { Body, Controller, Get, HttpCode, Inject, Post, Req } from "@nestjs/common";
import type { AuthSessionRes, SessionUserRes } from "@heropips/contracts";
import { bearerHeader, requestMeta, type HttpRequest } from "../common/http";
import { perHour, perMinute, RateLimit } from "../common/rate-limit";
import { AuthService } from "./auth.service";

@Controller("v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  /**
   * AuthService already runs the credential-class buckets (5/min/IP redeem,
   * 10/min/IP + 5/min/email login) — now keyed on the forwarded client IP
   * rather than the web container's, which is what made them global (B1).
   * The hourly bucket here is the slow-drip backstop those per-minute buckets
   * cannot see: 60 redeem attempts an hour from one address is already far
   * beyond a human fumbling an access code.
   */
  @Post("redeem")
  @HttpCode(200)
  @RateLimit(perHour(60, "ip"))
  redeem(@Body() body: unknown, @Req() req: HttpRequest): Promise<AuthSessionRes> {
    return this.auth.redeem(body, requestMeta(req));
  }

  /** 120 login attempts/hour/IP: ~one every 30s sustained, well above a human retry loop. */
  @Post("login")
  @HttpCode(200)
  @RateLimit(perHour(120, "ip"))
  login(@Body() body: unknown, @Req() req: HttpRequest): Promise<AuthSessionRes> {
    return this.auth.login(body, requestMeta(req));
  }

  /** 60/min/session, 120/min/IP: logout is one click; this only stops a loop. */
  @Post("logout")
  @HttpCode(200)
  @RateLimit(perMinute(60, "principal"), perMinute(120, "ip"))
  logout(@Req() req: HttpRequest): Promise<{ ok: true }> {
    return this.auth.logout(bearerHeader(req));
  }

  /**
   * Hot path: the BFF introspects on every authenticated request, and trading
   * introspects too (behind a 30s cache). Two deliberately loose rules:
   * - 900/min/session (15/s for one member) — no real page load approaches it.
   *   Note this does NOT bound token guessing: an invalid bearer hashes to a
   *   fresh key each time. Guessing is bounded by 32 bytes of token entropy,
   *   not by a bucket, and 429-ing per-IP here is what created B1.
   * - 30000/min/IP (500/s) as a pure circuit breaker. If the BFF forwards the
   *   real client IP this is absurdly generous per member; if it does not, all
   *   traffic keys on the web container and 500/s is still above what a
   *   2-CPU web tier can emit — so it cannot become the B1 outage again.
   */
  @Get("introspect")
  @RateLimit(perMinute(900, "principal"), { scope: "ip", limit: 30_000, windowMs: 60_000 })
  introspect(@Req() req: HttpRequest): Promise<SessionUserRes> {
    return this.auth.introspect(bearerHeader(req));
  }
}
