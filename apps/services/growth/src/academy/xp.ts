/* =========================================================================
 * Authoritative XP + streak + UTC-day math for the academy. The web client
 * mirrors these rules in apps/web/lib/academy/xp.ts; constants come from
 * @heropips/contracts on both sides, so the numbers cannot drift.
 * ======================================================================= */

import { randomBytes } from "node:crypto";
import { ACADEMY_XP } from "@heropips/contracts";

/** UTC calendar day, "YYYY-MM-DD" — streaks, spins and caps key on this. */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** `day` shifted by `days` (negative = past), still "YYYY-MM-DD". */
export function dayOffset(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Clamp a client-claimed quiz score to the lesson's real question count. */
export function clampScore(score: number, quizTotal: number): number {
  return Math.max(0, Math.min(Math.floor(score), quizTotal));
}

/** XP earned by a quiz result. Perfect scores carry a bonus. */
export function quizXp(score: number, total: number): number {
  return score * ACADEMY_XP.QUIZ_CORRECT + (score === total ? ACADEMY_XP.QUIZ_PERFECT_BONUS : 0);
}

/** First-activity-of-the-day streak bonus. */
export function streakBonus(streakDays: number): number {
  return Math.min(streakDays * ACADEMY_XP.STREAK_BONUS_PER_DAY, ACADEMY_XP.STREAK_BONUS_CAP);
}

/**
 * Streak transition when activity happens on `today`.
 * Same day → unchanged; consecutive → +1; gap (or first ever) → reset to 1.
 */
export function nextStreak(
  prev: { days: number; last: string | null },
  today: string,
): { days: number; isNewDay: boolean } {
  if (prev.last === today) return { days: prev.days, isNewDay: false };
  if (prev.last === dayOffset(today, -1)) return { days: prev.days + 1, isNewDay: true };
  return { days: 1, isNewDay: true };
}

/** Crockford base32 — no I, L, O, U; 32 symbols so `byte % 32` is unbiased. */
const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

/** 8-char lowercase referral code (~1e12 space; DB unique index backstops). */
export function generateAcademyReferralCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += CROCKFORD[bytes[i] % 32];
  return out;
}

/** Public certificate verification key, "HP-XXXXX-XXXXX". */
export function generateCertificateCode(): string {
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += CROCKFORD[bytes[i] % 32];
  const upper = out.toUpperCase();
  return `HP-${upper.slice(0, 5)}-${upper.slice(5)}`;
}
