import { describe, expect, it } from "vitest";
import { ACADEMY_EVENTS, ACADEMY_LESSONS, ACADEMY_NUDGE } from "@heropips/contracts";
import type { AcademyCompletionEntry } from "@heropips/contracts";
import { AcademyNudges } from "../src/academy/nudges";
import { MemAcademyRepo } from "./academy-mem-repo";

// Sweeps run against a fixed "now"; dates below are relative to this day.
const NOW = new Date("2026-07-15T06:00:00Z");
const TODAY = "2026-07-15";

function make(): { nudges: AcademyNudges; repo: MemAcademyRepo } {
  const repo = new MemAcademyRepo();
  return { nudges: new AcademyNudges(repo), repo };
}

function doneEntry(): AcademyCompletionEntry {
  return { score: 1, total: 1, xp: 0, at: "2026-06-01T00:00:00.000Z" };
}

function payloadsOf(repo: MemAcademyRepo, type: string): Array<Record<string, unknown>> {
  return repo.outbox
    .filter((r) => r.payload.type === type)
    .map((r) => r.payload.payload as Record<string, unknown>);
}

describe("daily nudge", () => {
  it("fires for a protected streak that missed exactly one day", async () => {
    const { nudges, repo } = make();
    repo.seed("u1", {
      streakDays: ACADEMY_NUDGE.DAILY_MIN_STREAK,
      lastActiveDate: "2026-07-14", // yesterday
      xp: 320,
    });
    await nudges.sweep(NOW);

    expect(repo.nudges).toEqual([{ userId: "u1", cadence: "daily", sentOn: TODAY }]);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeDaily)).toEqual([
      {
        user_id: "u1",
        email: "u1@example.com",
        display_name: "u1",
        streak_days: ACADEMY_NUDGE.DAILY_MIN_STREAK,
        xp: 320,
      },
    ]);
  });

  it("skips short streaks, still-active users, and 2-day gaps", async () => {
    const { nudges, repo } = make();
    repo.seed("shortStreak", { streakDays: ACADEMY_NUDGE.DAILY_MIN_STREAK - 1, lastActiveDate: "2026-07-14" });
    repo.seed("activeToday", { streakDays: 9, lastActiveDate: TODAY });
    repo.seed("gapTwoDays", { streakDays: 9, lastActiveDate: "2026-07-13" });
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeDaily)).toEqual([]);
  });

  it("dedupes across repeated sweeps on the same day", async () => {
    const { nudges, repo } = make();
    repo.seed("u1", { streakDays: 5, lastActiveDate: "2026-07-14" });
    await nudges.sweep(NOW);
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeDaily)).toHaveLength(1);
    expect(repo.nudges).toHaveLength(1);
  });
});

describe("weekly nudge", () => {
  it("fires between 7 and 27 days of inactivity with lessons left, naming the next slug", async () => {
    const { nudges, repo } = make();
    repo.seed("u1", {
      lastActiveDate: "2026-07-05", // 10 days ago
      xp: 125,
      completions: { [ACADEMY_LESSONS[0].slug]: doneEntry() },
    });
    await nudges.sweep(NOW);

    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeWeekly)).toEqual([
      {
        user_id: "u1",
        email: "u1@example.com",
        display_name: "u1",
        streak_days: 0,
        xp: 125,
        completed_count: 1,
        total_lessons: ACADEMY_LESSONS.length,
        next_slug: ACADEMY_LESSONS[1].slug,
      },
    ]);
  });

  it("skips users outside the window and curriculum finishers", async () => {
    const { nudges, repo } = make();
    repo.seed("tooRecent", { lastActiveDate: "2026-07-09" }); // 6 days ago
    repo.seed("tooOld", { lastActiveDate: "2026-06-17" }); // 28 days ago → monthly territory
    repo.seed("finisher", {
      lastActiveDate: "2026-07-05",
      completions: Object.fromEntries(ACADEMY_LESSONS.map((l) => [l.slug, doneEntry()])),
    });
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeWeekly)).toEqual([]);
  });

  it("waits a full 7 days between weekly nudges", async () => {
    const { nudges, repo } = make();
    repo.seed("u1", { lastActiveDate: "2026-07-01" }); // 14 days ago
    repo.nudges.push({ userId: "u1", cadence: "weekly", sentOn: "2026-07-12" }); // 3 days ago
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeWeekly)).toEqual([]);

    repo.nudges.length = 0;
    repo.nudges.push({ userId: "u1", cadence: "weekly", sentOn: "2026-07-07" }); // 8 days ago
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeWeekly)).toHaveLength(1);
  });
});

describe("monthly nudge", () => {
  it("fires after 28+ days of inactivity", async () => {
    const { nudges, repo } = make();
    repo.seed("u1", { lastActiveDate: "2026-06-10", xp: 60 }); // 35 days ago
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeMonthly)).toEqual([
      { user_id: "u1", email: "u1@example.com", display_name: "u1", streak_days: 0, xp: 60 },
    ]);
    expect(repo.nudges).toEqual([{ userId: "u1", cadence: "monthly", sentOn: TODAY }]);
  });

  it("skips users inactive fewer than 28 days and never-active rows", async () => {
    const { nudges, repo } = make();
    repo.seed("recent", { lastActiveDate: "2026-06-20" }); // 25 days ago
    repo.seed("neverActive", { lastActiveDate: null });
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeMonthly)).toEqual([]);
  });

  it("waits a full 28 days between monthly nudges", async () => {
    const { nudges, repo } = make();
    repo.seed("u1", { lastActiveDate: "2026-05-01" });
    repo.nudges.push({ userId: "u1", cadence: "monthly", sentOn: "2026-07-05" }); // 10 days ago
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeMonthly)).toEqual([]);

    repo.nudges.length = 0;
    repo.nudges.push({ userId: "u1", cadence: "monthly", sentOn: "2026-06-17" }); // 28 days ago
    await nudges.sweep(NOW);
    expect(payloadsOf(repo, ACADEMY_EVENTS.nudgeMonthly)).toHaveLength(1);
  });
});

describe("sweep resilience", () => {
  it("a failing repo degrades to a warning — the sweep never throws", async () => {
    const { nudges, repo } = make();
    repo.listActiveBetween = async () => {
      throw new Error("db down");
    };
    await expect(nudges.sweep(NOW)).resolves.toBeUndefined();
  });

  it("one cadence firing does not block the others in the same pass", async () => {
    const { nudges, repo } = make();
    repo.seed("daily", { streakDays: 4, lastActiveDate: "2026-07-14" });
    repo.seed("weekly", { lastActiveDate: "2026-07-05" });
    repo.seed("monthly", { lastActiveDate: "2026-06-01" });
    await nudges.sweep(NOW);
    expect(repo.eventTypes().sort()).toEqual(
      [ACADEMY_EVENTS.nudgeDaily, ACADEMY_EVENTS.nudgeMonthly, ACADEMY_EVENTS.nudgeWeekly].sort(),
    );
  });
});
