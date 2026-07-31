/* =========================================================================
 * HeroPips Academy curriculum — content registry.
 * META (slugs, levels, XP, quiz sizes) lives in @heropips/contracts and is
 * the single source of truth shared with growth-svc. This module merges
 * that meta with the rich CONTENT (sections, quizzes, interactives) from
 * ./content/level-*.ts and exposes typed helpers for every academy surface.
 * ======================================================================= */

import {
  ACADEMY_LESSONS,
  ACADEMY_LEVELS,
  ACADEMY_TRACK_LEVELS,
  academyTrackSlugs,
  type AcademyAccess,
  type AcademyCertTrack,
  type AcademyLessonMeta,
  type AcademyLevelMeta,
} from "@heropips/contracts";
import { LEVEL_0 } from "./content/level-0";
import { LEVEL_1 } from "./content/level-1";
import { LEVEL_2 } from "./content/level-2";
import { LEVEL_3 } from "./content/level-3";
import { LEVEL_4 } from "./content/level-4";
import { LEVEL_5 } from "./content/level-5";
import { LEVEL_6 } from "./content/level-6";
import { LEVEL_7 } from "./content/level-7";
import { LEVEL_8 } from "./content/level-8";
import { LEVEL_9 } from "./content/level-9";

/* ---------- content types (authoring schema for level files) ---------- */

export type LessonCallout = {
  tone: "tip" | "warn" | "story";
  title: string;
  body: string;
};

export type LessonTerm = { term: string; def: string };

/**
 * Inline diagram ids — every id maps to a crisp, theme-aware SVG in
 * components/academy/diagrams.tsx. Content files reference ONLY these.
 */
export type FigureKind =
  | "spread-anatomy"        // bid/ask/spread on a price ladder
  | "pip-scale"             // which digit is the pip (and the pipette)
  | "candle-anatomy"        // static labeled OHLC candle pair
  | "trend-structure"       // HH/HL uptrend vs LH/LL downtrend
  | "market-structure"      // swing points, break of structure, sweep
  | "support-resistance"    // bounce, break, retest at a level
  | "supply-demand"         // zones as areas, not lines
  | "chart-patterns"        // range, flag, false break — the three that matter
  | "risk-reward"           // 1R risk vs 2R target on a trade
  | "position-size-math"    // account → risk% → stop distance → size flow
  | "leverage-double-edge"  // same move, three leverage levels, both directions
  | "session-clock"         // Sydney/Tokyo/London/NY across 24h UTC
  | "order-types"           // market/limit/stop placement around price
  | "equity-curve"          // two equity curves: 1% vs 10% risk drawdown
  | "confluence-stack"      // independent reasons stacking into one setup
  | "strategy-loop"         // idea → rules → backtest → forward test → live
  | "emotion-cycle"         // the tilt spiral and its exit ramps
  | "automation-pipeline"   // data → signal → guardrail → order → journal
  | "prop-funnel"           // challenge → verification → funded → payout
  | "compounding-curve";    // compounding at honest monthly rates

export type LessonFigure = {
  kind: FigureKind;
  /** One-line caption under the figure — what the reader should SEE. */
  caption: string;
};

export type LessonSection = {
  h: string;
  paras: string[];
  table?: { caption: string; head: string[]; rows: string[][] };
  callout?: LessonCallout;
  /** Inline diagram rendered after the paragraphs. */
  figure?: LessonFigure;
  /** One-question "Quick check" — instant feedback, no XP, pure understanding. */
  check?: QuizQuestion;
};

export type QuizQuestion = {
  q: string;
  options: string[]; // 3-4 options
  answer: number; // index into options
  explain: string; // shown after answering, right or wrong
};

export type LessonInteractive =
  | { kind: "candle-anatomy" }
  | { kind: "replay"; scenario: string } // ReplayScenario id from ./scenarios
  | { kind: "risk-sizer" }
  | { kind: "capstone" }; // paper-trading mission block (member app verifies)

export type LessonContent = {
  slug: string;
  title: string;
  /** One punchy line for the lesson card on the level path. */
  hook: string;
  /** 1-2 sentence meta-description-grade summary. */
  summary: string;
  sections: LessonSection[];
  /** Glossary chips — every new term a beginner meets in this lesson. */
  terms: LessonTerm[];
  interactive?: LessonInteractive;
  quiz: QuizQuestion[];
};

/** Fully resolved lesson: authored content + contracts meta + order.
 * meta.quiz (the question COUNT) is dropped — content.quiz is the questions,
 * and the integrity check below guarantees the count matches. */
export type Lesson = LessonContent &
  Omit<AcademyLessonMeta, "quiz"> & {
    /** 1-based position across the whole curriculum ("Lesson 07"). */
    number: number;
    access: AcademyAccess;
  };

export type Level = AcademyLevelMeta & { lessons: Lesson[] };

/* ---------- assembly + integrity checks (fail the build, not the user) --- */

const CONTENT: readonly LessonContent[] = [
  ...LEVEL_0,
  ...LEVEL_1,
  ...LEVEL_2,
  ...LEVEL_3,
  ...LEVEL_4,
  ...LEVEL_5,
  ...LEVEL_6,
  ...LEVEL_7,
  ...LEVEL_8,
  ...LEVEL_9,
];

const CONTENT_BY_SLUG: Record<string, LessonContent> = Object.fromEntries(
  CONTENT.map((c) => [c.slug, c]),
);

const ACCESS_BY_LEVEL: Record<string, AcademyAccess> = Object.fromEntries(
  ACADEMY_LEVELS.map((l) => [l.id, l.access]),
);

function resolveLesson(meta: AcademyLessonMeta, index: number): Lesson {
  const content = CONTENT_BY_SLUG[meta.slug];
  if (!content) {
    throw new Error(`academy: missing content for lesson "${meta.slug}"`);
  }
  if (content.quiz.length !== meta.quiz) {
    throw new Error(
      `academy: lesson "${meta.slug}" has ${content.quiz.length} quiz questions; contracts meta says ${meta.quiz}`,
    );
  }
  for (const q of content.quiz) {
    if (q.answer < 0 || q.answer >= q.options.length) {
      throw new Error(`academy: lesson "${meta.slug}" quiz answer index out of range`);
    }
  }
  const { quiz: _expectedCount, ...metaRest } = meta;
  return { ...metaRest, ...content, number: index + 1, access: ACCESS_BY_LEVEL[meta.level] };
}

/** Every lesson, curriculum order. Built once at module init. */
export const LESSONS_FULL: readonly Lesson[] = ACADEMY_LESSONS.map(resolveLesson);

/** Levels ("worlds") with their lessons attached, in order. */
export const LEVELS: readonly Level[] = ACADEMY_LEVELS.map((level) => ({
  ...level,
  lessons: LESSONS_FULL.filter((l) => l.level === level.id),
}));

const LESSON_INDEX: Record<string, number> = Object.fromEntries(
  LESSONS_FULL.map((l, i) => [l.slug, i]),
);

/* ---------- lookups ---------- */

export function findLesson(slug: string): Lesson | null {
  const i = LESSON_INDEX[slug];
  return i === undefined ? null : LESSONS_FULL[i];
}

export function adjacentLessons(slug: string): { prev: Lesson | null; next: Lesson | null } {
  const i = LESSON_INDEX[slug];
  if (i === undefined) return { prev: null, next: null };
  return {
    prev: i > 0 ? LESSONS_FULL[i - 1] : null,
    next: i < LESSONS_FULL.length - 1 ? LESSONS_FULL[i + 1] : null,
  };
}

export function findLevel(id: string): Level | null {
  return LEVELS.find((l) => l.id === id) ?? null;
}

/** Total XP available from lessons + perfect quizzes (marketing math). */
export function curriculumMaxLessonXp(): number {
  return LESSONS_FULL.reduce((sum, l) => sum + l.xp + l.quiz.length * 10 + 20, 0);
}

export const TOTAL_LESSONS = ACADEMY_LESSONS.length;
export const TOTAL_MINUTES = ACADEMY_LESSONS.reduce((s, l) => s + l.minutes, 0);

/* ---------- certificate tracks (display info; rules in contracts) -------- */

export type TrackInfo = {
  id: AcademyCertTrack;
  name: string;
  desc: string;
  levels: readonly string[];
  slugs: string[];
};

/** Certificate display names — the credential wording on the certificate itself. */
const LEVEL_CERT_NAMES: readonly { name: string; desc: string }[] = [
  { name: "First Steps Certificate", desc: "Level 0 complete: what markets are, how pairs work and how orders actually fill." },
  { name: "Market Reader Certificate", desc: "Level 1 complete: pips, candlesticks and trends read fluently on a live chart." },
  { name: "Risk Keeper Certificate", desc: "Level 2 complete: the 1% rule, stops, leverage and position sizing — the survival kit." },
  { name: "Structure Scout Certificate", desc: "Level 3 complete: market structure, support/resistance and the patterns that repeat." },
  { name: "Trade Finder Certificate", desc: "Level 4 complete: sessions, confluence and a written, testable trading plan." },
  { name: "Strategy Builder Certificate", desc: "Level 5 complete: indicators as context, entry archetypes and a first real strategy." },
  { name: "Proven Trader Certificate", desc: "Level 6 complete: honest backtests, a professional journal and the paper capstone." },
  { name: "Steel Mind Certificate", desc: "Level 7 complete: tilt defused, streaks understood and a discipline system installed." },
  { name: "Machine Tamer Certificate", desc: "Level 8 complete: decision intelligence, automation and guardrails mastered." },
  { name: "Live Hero Certificate", desc: "Level 9 complete: going live, funded accounts and scaling that survives." },
];

export const TRACKS: readonly TrackInfo[] = [
  ...ACADEMY_LEVELS.map((level, i) => ({
    id: `level-${level.number}` as AcademyCertTrack,
    name: LEVEL_CERT_NAMES[i].name,
    desc: LEVEL_CERT_NAMES[i].desc,
    levels: ACADEMY_TRACK_LEVELS[`level-${level.number}` as AcademyCertTrack],
    slugs: academyTrackSlugs(`level-${level.number}` as AcademyCertTrack),
  })),
  {
    id: "hero-trader",
    name: "Hero Trader Certificate",
    desc: "All 10 levels including the paper-trading capstone — curious trader to confident trader, proven and verifiable.",
    levels: ACADEMY_TRACK_LEVELS["hero-trader"],
    slugs: academyTrackSlugs("hero-trader"),
  },
] as const;

/** Per-level tracks are ordered: TRACKS[levelNumber] is that level's certificate. */

export function trackProgress(
  track: TrackInfo,
  completions: Record<string, unknown>,
): { done: number; total: number; complete: boolean } {
  const done = track.slugs.filter((s) => completions[s] !== undefined).length;
  return { done, total: track.slugs.length, complete: done === track.slugs.length };
}
