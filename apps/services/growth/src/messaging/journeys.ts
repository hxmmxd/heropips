/* =========================================================================
 * Journey definitions — the lifecycle state machines.
 *
 * A journey is an ordered list of (template, day-offset) steps started by a
 * trigger event and cancelled by "goal reached" events. Steps fire at
 * SEND_HOUR_UTC on start-day + delayDays; the sweeper advances one step per
 * pass and the send ledger's dedupe key makes every step exactly-once.
 * ======================================================================= */
import { IDENTITY_EVENTS, PAYMENT_EVENTS } from "@heropips/contracts";

export const SEND_HOUR_UTC = 14; // 14:00 UTC — morning US / afternoon EU

export const JOURNEY_KEYS = [
  "early_access_nurture",
  "founding_onboarding",
  "member_activation",
] as const;
export type JourneyKey = (typeof JOURNEY_KEYS)[number];

export type JourneyStepDef = {
  /** Template key in the registry (service maps key → props builder). */
  templateKey: string;
  /** Days after journey start; fires at SEND_HOUR_UTC UTC that day. */
  delayDays: number;
};

export type JourneyDef = {
  key: JourneyKey;
  /** Envelope types that cancel this journey for the same contact. */
  cancelOn: readonly string[];
  steps: readonly JourneyStepDef[];
};

export const JOURNEYS: Record<JourneyKey, JourneyDef> = {
  /** Queue joiner → founding buyer / registered member. */
  early_access_nurture: {
    key: "early_access_nurture",
    cancelOn: [PAYMENT_EVENTS.finished, IDENTITY_EVENTS.userRegistered],
    steps: [
      { templateKey: "ea_d1_story", delayDays: 1 },
      { templateKey: "ea_d3_academy", delayDays: 3 },
      { templateKey: "ea_d5_founding", delayDays: 5 },
      { templateKey: "ea_d8_referral", delayDays: 8 },
      { templateKey: "ea_d12_proof", delayDays: 12 },
      { templateKey: "ea_d19_lastcall", delayDays: 19 },
    ],
  },
  /** Paid but not yet redeemed → account created. */
  founding_onboarding: {
    key: "founding_onboarding",
    cancelOn: [IDENTITY_EVENTS.userRegistered, PAYMENT_EVENTS.refunded],
    steps: [
      { templateKey: "fo_d1_redeem", delayDays: 1 },
      { templateKey: "fo_d3_redeem2", delayDays: 3 },
    ],
  },
  /** Registered → learning, paper trading, broker connected. */
  member_activation: {
    key: "member_activation",
    cancelOn: [],
    steps: [
      { templateKey: "ma_d2_academy", delayDays: 2 },
      { templateKey: "ma_d5_paper", delayDays: 5 },
      { templateKey: "ma_d10_broker", delayDays: 10 },
    ],
  },
};

/** Step run time: start-day (UTC midnight) + delayDays, at SEND_HOUR_UTC. */
export function stepRunAt(startedAt: Date, delayDays: number): Date {
  const d = new Date(startedAt.getTime());
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + delayDays);
  d.setUTCHours(SEND_HOUR_UTC, 0, 0, 0);
  return d;
}

/** ISO-8601 week label (e.g. "2026-W31") for digest bucketing. */
export function isoWeek(at: Date): string {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday decides the year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
