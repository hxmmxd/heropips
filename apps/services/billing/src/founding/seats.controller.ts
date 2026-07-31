import { Controller, Get, Inject } from "@nestjs/common";
import type { SeatsRes } from "@heropips/contracts";
import { perMinute, RateLimit } from "../common/rate-limit";
import { FoundingService } from "./founding.service";

@Controller("v1/founding")
export class SeatsController {
  constructor(@Inject(FoundingService) private readonly founding: FoundingService) {}

  /**
   * 120/min/IP: the founding page shows a live seat counter and the BFF caches
   * it for 5s, so real traffic is a trickle; 2/s per address is pure headroom
   * over a single indexed row read.
   */
  @Get("seats")
  @RateLimit(perMinute(120, "ip"))
  seats(): Promise<SeatsRes> {
    return this.founding.seats();
  }
}
