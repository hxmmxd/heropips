import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { MESSAGING_CONFIG, type MessagingConfig } from "./config";
import { MessagingService } from "./messaging.service";

const WARN_THROTTLE_MS = 30_000;

/**
 * Interval sweeper driving due journey steps + the weekly digest — same
 * resilience pattern as AcademyNudges: failures degrade to throttled
 * warnings, the loop never crashes.
 */
@Injectable()
export class MessagingScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("messaging-scheduler");
  private timer: NodeJS.Timeout | undefined;
  private lastWarnAt = 0;

  // Explicit tokens: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(
    @Inject(MessagingService) private readonly service: MessagingService,
    @Inject(MESSAGING_CONFIG) private readonly cfg: MessagingConfig,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.cfg.enabled) return;
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.service.sweep().catch((err: unknown) => {
        const at = Date.now();
        if (at - this.lastWarnAt >= WARN_THROTTLE_MS) {
          this.lastWarnAt = at;
          this.logger.warn(`sweep failed: ${err instanceof Error ? err.message : "error"}`);
        }
      });
    }, this.cfg.sweepIntervalSec * 1000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
