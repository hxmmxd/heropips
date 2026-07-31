import { Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import { perMinute, RateLimit } from "../common/rate-limit";
import { IpnService, type IpnResult } from "./ipn.service";

/** Fastify request, typed structurally; rawBody is attached by the content-type parser. */
type RawBodyRequest = {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
};

@Controller("v1/billing")
export class IpnController {
  constructor(@Inject(IpnService) private readonly ipn: IpnService) {}

  /**
   * 600/min/IP. Pre-auth work: an HMAC-SHA512 over the whole raw body runs
   * before anything is trusted, which is CPU an attacker can spend for free.
   * NOWPayments delivers a handful of callbacks per order and retries failures,
   * so 10/s from the provider's address is far above real traffic — and a
   * payment callback must never be dropped by our own limiter.
   */
  @Post("ipn")
  @HttpCode(200)
  @RateLimit(perMinute(600, "ip"))
  handle(@Req() req: RawBodyRequest): Promise<IpnResult> {
    const sig = req.headers["x-nowpayments-sig"];
    return this.ipn.handle(req.rawBody, Array.isArray(sig) ? sig[0] : sig);
  }
}
