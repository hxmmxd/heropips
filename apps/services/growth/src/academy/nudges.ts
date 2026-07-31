import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { ACADEMY_EVENTS, ACADEMY_LESSONS, ACADEMY_NUDGE, TOPICS } from "@heropips/contracts";
import { makeEnvelope } from "../outbox/outbox.service";
import { ACADEMY_REPO, type AcademyProgressRow, type AcademyRepo } from "./academy.repo";
import { dayOffset, daysBetween, utcDay } from "./xp";

const DEFAULT_INTERVAL_SEC = 3600;
const MIN_INTERVAL_SEC = 5; // floor keeps tests fast without hot-looping prod
const WARN_THROTTLE_MS = 30_000;

/** Base payload shared by every nudge event. */
function nudgePayload(row: AcademyProgressRow): Record<string, unknown> {
  return {
    user_id: row.userId,
    email: row.email,
    display_name: row.displayName,
    streak_days: row.streakDays,
    xp: row.xp,
  };
}

/**
 * Hourly sweeper that turns inactivity into email-nudge events. Each due
 * user gets a ledger row + outbox event in ONE transaction — the ledger PK
 * (user, cadence, day) makes re-sweeps and restarts idempotent. Failures
 * degrade to a throttled warning; the loop never crashes (OutboxRelay's
 * pattern).
 */
@Injectable()
export class AcademyNudges implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("academy-nudges");
  private timer: NodeJS.Timeout | undefined;
  private lastWarnAt = 0;

  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(ACADEMY_REPO) private readonly repo: AcademyRepo) {}

  onApplicationBootstrap(): void {
    this.start();
  }

  onApplicationShutdown(): void {
    this.stop();
  }

  start(): void {
    if (this.timer) return;
    const raw = Number(process.env.ACADEMY_NUDGE_INTERVAL_SEC);
    const sec = Number.isFinite(raw) && raw > 0 ? Math.max(MIN_INTERVAL_SEC, raw) : DEFAULT_INTERVAL_SEC;
    this.timer = setInterval(() => {
      void this.sweep();
    }, sec * 1000);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** One full pass over all three cadences. Public so tests drive it directly. */
  async sweep(now: Date = new Date()): Promise<void> {
    try {
      const today = utcDay(now);
      await this.sweepDaily(today);
      await this.sweepWeekly(today);
      await this.sweepMonthly(today);
    } catch (err) {
      const nowMs = Date.now();
      if (nowMs - this.lastWarnAt >= WARN_THROTTLE_MS) {
        this.lastWarnAt = nowMs;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`nudge sweep failed (will retry next tick): ${message}`);
      }
    }
  }

  /** Streak worth protecting (≥ DAILY_MIN_STREAK) and missed exactly one day. */
  private async sweepDaily(today: string): Promise<void> {
    const yesterday = dayOffset(today, -1);
    const candidates = await this.repo.listActiveBetween(yesterday, yesterday);
    for (const row of candidates) {
      if (row.streakDays < ACADEMY_NUDGE.DAILY_MIN_STREAK) continue;
      await this.repo.tx(async (ops) => {
        if (!(await ops.insertNudge(row.userId, "daily", today))) return;
        await ops.insertOutbox(
          TOPICS.growthEvents,
          makeEnvelope(ACADEMY_EVENTS.nudgeDaily, nudgePayload(row)),
        );
      });
    }
  }

  /**
   * Inactive 7–27 days with lessons left: point at the next one. At most
   * one weekly nudge per rolling 7 days.
   */
  private async sweepWeekly(today: string): Promise<void> {
    const candidates = await this.repo.listActiveBetween(
      dayOffset(today, -(ACADEMY_NUDGE.MONTHLY_AFTER_DAYS - 1)),
      dayOffset(today, -ACADEMY_NUDGE.WEEKLY_AFTER_DAYS),
    );
    for (const row of candidates) {
      const next = ACADEMY_LESSONS.find((l) => !row.completions[l.slug]);
      if (!next) continue; // curriculum done — nothing to nudge toward
      await this.repo.tx(async (ops) => {
        const last = await ops.lastNudgeOn(row.userId, "weekly");
        if (last && daysBetween(last, today) < ACADEMY_NUDGE.WEEKLY_AFTER_DAYS) return;
        if (!(await ops.insertNudge(row.userId, "weekly", today))) return;
        await ops.insertOutbox(
          TOPICS.growthEvents,
          makeEnvelope(ACADEMY_EVENTS.nudgeWeekly, {
            ...nudgePayload(row),
            completed_count: Object.keys(row.completions).length,
            total_lessons: ACADEMY_LESSONS.length,
            next_slug: next.slug,
          }),
        );
      });
    }
  }

  /** Inactive ≥ 28 days. At most one monthly nudge per rolling 28 days. */
  private async sweepMonthly(today: string): Promise<void> {
    const candidates = await this.repo.listActiveOnOrBefore(
      dayOffset(today, -ACADEMY_NUDGE.MONTHLY_AFTER_DAYS),
    );
    for (const row of candidates) {
      await this.repo.tx(async (ops) => {
        const last = await ops.lastNudgeOn(row.userId, "monthly");
        if (last && daysBetween(last, today) < ACADEMY_NUDGE.MONTHLY_AFTER_DAYS) return;
        if (!(await ops.insertNudge(row.userId, "monthly", today))) return;
        await ops.insertOutbox(
          TOPICS.growthEvents,
          makeEnvelope(ACADEMY_EVENTS.nudgeMonthly, nudgePayload(row)),
        );
      });
    }
  }
}
