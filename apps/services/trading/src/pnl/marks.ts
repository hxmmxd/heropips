import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { TRADING_CONFIG, type TradingConfig } from "../common/config";
import { TRADING_REPO, type TradingRepo } from "../db/repo";
import { QUOTE_PROVIDER, type QuoteProvider } from "../quotes/provider";
import { computeUserAccount } from "./account";

/**
 * Mark-to-market sweep: every MARK_INTERVAL_SEC (default 30, 0 disables —
 * tests call sweep() directly) append an equity snapshot for every user
 * holding open positions, so the equity curve moves between fills.
 */
@Injectable()
export class MarkSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("mark-sweeper");
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(TRADING_REPO) private readonly repo: TradingRepo,
    @Inject(QUOTE_PROVIDER) private readonly quotes: QuoteProvider,
    @Inject(TRADING_CONFIG) private readonly config: TradingConfig,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.markIntervalSec > 0) {
      this.timer = setInterval(() => {
        void this.sweep().catch((err: unknown) => {
          this.logger.warn(`mark sweep failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }, this.config.markIntervalSec * 1_000);
      this.timer.unref?.();
    }
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async sweep(nowIso: string = new Date().toISOString()): Promise<void> {
    const userIds = await this.repo.userIdsWithPositions();
    for (const userId of userIds) {
      const account = await computeUserAccount(userId, this.repo, this.quotes);
      await this.repo.insertSnapshot(userId, nowIso, account.equityUsdMinor);
    }
  }
}
