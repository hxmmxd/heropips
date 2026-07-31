import type { BillingRepo } from "../db/repo";

const TICK_MS = 60_000;

/** Every 60s: release seat holds whose TTL passed without a finished payment. */
export class HoldsJob {
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly repo: BillingRepo) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<void> {
    try {
      const released = await this.repo.expireHolds(new Date());
      if (released > 0) {
        // eslint-disable-next-line no-console
        console.log(`[billing] hold expiry: released ${released} seat hold(s)`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[billing] hold expiry failed: ${(err as Error).message}`);
    }
  }
}
