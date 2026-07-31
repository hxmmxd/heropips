import { describe, expect, it } from "vitest";
import { ACADEMY_LESSONS, ACADEMY_RANKS, ACADEMY_XP } from "@heropips/contracts";
import { lessonAward, nextStreak, quizXp, rankFor, streakBonus, utcDay, utcDayBefore } from "./xp";

describe("rank ladder (contracts)", () => {
  it("has ten strictly ascending thresholds starting at zero", () => {
    expect(ACADEMY_RANKS).toHaveLength(10);
    expect(ACADEMY_RANKS[0].at).toBe(0);
    for (let i = 1; i < ACADEMY_RANKS.length; i++) {
      expect(ACADEMY_RANKS[i].at).toBeGreaterThan(ACADEMY_RANKS[i - 1].at);
    }
  });

  it("top rank is reachable from lessons + perfect quizzes alone", () => {
    // Max curriculum XP without streaks, games, spins or referrals.
    const maxCurriculumXp = ACADEMY_LESSONS.reduce(
      (sum, l) => sum + l.xp + l.quiz * ACADEMY_XP.QUIZ_CORRECT + ACADEMY_XP.QUIZ_PERFECT_BONUS,
      0,
    );
    const top = ACADEMY_RANKS[ACADEMY_RANKS.length - 1];
    expect(top.at).toBeLessThanOrEqual(maxCurriculumXp);
    expect(rankFor(maxCurriculumXp).name).toBe(top.name);
  });
});

describe("rankFor", () => {
  it("starts at Recruit with 0 XP", () => {
    const r = rankFor(0);
    expect(r.name).toBe("Recruit");
    expect(r.index).toBe(0);
    expect(r.pct).toBe(0);
    expect(r.next?.name).toBe(ACADEMY_RANKS[1].name);
  });

  it("promotes exactly at each threshold", () => {
    for (let i = 1; i < ACADEMY_RANKS.length; i++) {
      expect(rankFor(ACADEMY_RANKS[i].at - 1).index).toBe(i - 1);
      expect(rankFor(ACADEMY_RANKS[i].at).index).toBe(i);
    }
  });

  it("caps at Hero Trader with pct 1 and no next", () => {
    const top = ACADEMY_RANKS[ACADEMY_RANKS.length - 1];
    const r = rankFor(top.at + 10_000);
    expect(r.name).toBe(top.name);
    expect(r.next).toBeNull();
    expect(r.pct).toBe(1);
  });

  it("reports mid-band progress", () => {
    const a = ACADEMY_RANKS[0].at;
    const b = ACADEMY_RANKS[1].at;
    const mid = Math.floor((a + b) / 2);
    const r = rankFor(mid);
    expect(r.pct).toBeGreaterThan(0.4);
    expect(r.pct).toBeLessThan(0.6);
  });
});

describe("quizXp / lessonAward", () => {
  it("pays per correct answer", () => {
    expect(quizXp(3, 5)).toBe(3 * ACADEMY_XP.QUIZ_CORRECT);
  });

  it("adds the perfect bonus only on perfect", () => {
    expect(quizXp(5, 5)).toBe(5 * ACADEMY_XP.QUIZ_CORRECT + ACADEMY_XP.QUIZ_PERFECT_BONUS);
    expect(quizXp(4, 5)).toBe(4 * ACADEMY_XP.QUIZ_CORRECT);
  });

  it("clamps score into [0, total]", () => {
    expect(quizXp(-2, 5)).toBe(0);
    expect(quizXp(9, 5)).toBe(quizXp(5, 5));
  });

  it("lessonAward = lesson xp + quiz xp", () => {
    expect(lessonAward({ xp: 70 }, 5, 5)).toBe(70 + quizXp(5, 5));
    expect(lessonAward({ xp: 60 }, 0, 4)).toBe(60);
  });
});

describe("streaks", () => {
  it("same-day activity does not advance the streak", () => {
    const t = nextStreak({ days: 4, last: "2026-07-29" }, "2026-07-29");
    expect(t).toEqual({ days: 4, isNewDay: false });
  });

  it("consecutive day increments", () => {
    const t = nextStreak({ days: 4, last: "2026-07-28" }, "2026-07-29");
    expect(t).toEqual({ days: 5, isNewDay: true });
  });

  it("a gap resets to 1", () => {
    const t = nextStreak({ days: 9, last: "2026-07-25" }, "2026-07-29");
    expect(t).toEqual({ days: 1, isNewDay: true });
  });

  it("first-ever activity starts at 1", () => {
    expect(nextStreak({ days: 0, last: null }, "2026-07-29")).toEqual({ days: 1, isNewDay: true });
  });

  it("handles month boundaries via UTC day math", () => {
    expect(utcDayBefore("2026-03-01")).toBe("2026-02-28");
    expect(utcDayBefore("2026-01-01")).toBe("2025-12-31");
    const t = nextStreak({ days: 2, last: "2026-02-28" }, "2026-03-01");
    expect(t.days).toBe(3);
  });

  it("bonus scales with days and caps", () => {
    expect(streakBonus(1)).toBe(ACADEMY_XP.STREAK_BONUS_PER_DAY);
    expect(streakBonus(10)).toBe(ACADEMY_XP.STREAK_BONUS_CAP);
    expect(streakBonus(100)).toBe(ACADEMY_XP.STREAK_BONUS_CAP);
  });

  it("utcDay formats as YYYY-MM-DD", () => {
    expect(utcDay(new Date("2026-07-29T23:59:59Z"))).toBe("2026-07-29");
    expect(utcDay(new Date("2026-07-29T00:00:00Z"))).toBe("2026-07-29");
  });
});
