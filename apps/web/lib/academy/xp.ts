/* =========================================================================
 * XP + rank math — pure, dependency-free, shared by client store, HUD and
 * server-rendered member pages. Mirrors growth-svc's authoritative rules
 * (constants come from @heropips/contracts, so they cannot drift).
 * ======================================================================= */

import { ACADEMY_RANKS, ACADEMY_XP, type AcademyLessonMeta } from "@heropips/contracts";

export type RankView = {
  index: number;
  name: string;
  at: number;
  /** Next rank, or null at Hero Trader. */
  next: { name: string; at: number } | null;
  /** 0..1 progress from current threshold to the next. 1 at top rank. */
  pct: number;
};

export function rankFor(xp: number): RankView {
  let index = 0;
  for (let i = ACADEMY_RANKS.length - 1; i >= 0; i--) {
    if (xp >= ACADEMY_RANKS[i].at) {
      index = i;
      break;
    }
  }
  const rank = ACADEMY_RANKS[index];
  const nextRank = index + 1 < ACADEMY_RANKS.length ? ACADEMY_RANKS[index + 1] : null;
  const pct = nextRank ? Math.min(1, (xp - rank.at) / (nextRank.at - rank.at)) : 1;
  return {
    index,
    name: rank.name,
    at: rank.at,
    next: nextRank ? { name: nextRank.name, at: nextRank.at } : null,
    pct,
  };
}

/** XP earned by a quiz result. Perfect scores carry a bonus. */
export function quizXp(score: number, total: number): number {
  const correct = Math.max(0, Math.min(score, total));
  return correct * ACADEMY_XP.QUIZ_CORRECT + (correct === total ? ACADEMY_XP.QUIZ_PERFECT_BONUS : 0);
}

/** Full award for completing a lesson with a quiz result. */
export function lessonAward(meta: Pick<AcademyLessonMeta, "xp">, score: number, total: number): number {
  return meta.xp + quizXp(score, total);
}

/** First-activity-of-the-day streak bonus. */
export function streakBonus(streakDays: number): number {
  return Math.min(streakDays * ACADEMY_XP.STREAK_BONUS_PER_DAY, ACADEMY_XP.STREAK_BONUS_CAP);
}

/** UTC calendar day, "YYYY-MM-DD" — streaks and daily caps key on this. */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Yesterday's UTC day string relative to `day`. */
export function utcDayBefore(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Streak transition when activity happens on `today`.
 * Same day → unchanged; consecutive → +1; gap → reset to 1.
 */
export function nextStreak(
  prev: { days: number; last: string | null },
  today: string,
): { days: number; isNewDay: boolean } {
  if (prev.last === today) return { days: prev.days, isNewDay: false };
  if (prev.last === utcDayBefore(today)) return { days: prev.days + 1, isNewDay: true };
  return { days: 1, isNewDay: true };
}

export function fmtXp(xp: number): string {
  return xp.toLocaleString("en-US");
}
