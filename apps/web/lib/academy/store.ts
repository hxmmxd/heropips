/* =========================================================================
 * Academy client store — the gamification engine on the browser side.
 *
 * Anonymous: XP, completions, games and streaks bank into localStorage.
 * Signed in: the store hydrates from GET /api/academy/progress, mutations
 * POST to the BFF and reconcile from the authoritative response; local
 * state remains the offline cache. First successful sync CLAIMS the
 * device-banked completions into the account.
 *
 * Vanilla store (subscribe/getSnapshot) so components consume it through
 * useSyncExternalStore without a context re-render cascade.
 * ======================================================================= */

import {
  ACADEMY_LESSON_BY_SLUG,
  ACADEMY_XP,
  type AcademyGameId,
  type AcademyProgressRes,
} from "@heropips/contracts";
import { lessonAward, nextStreak, rankFor, streakBonus, utcDay } from "./xp";
import { track } from "@/lib/analytics";

const LS_KEY = "hp_academy_v1";
const REF_KEY = "hp_academy_ref";

export type LocalCompletion = { score: number; total: number; at: string };
export type LocalGameState = { date: string; plays: number; wins: number; best_streak: number };

export type LocalState = {
  v: 1;
  xp: number;
  completions: Record<string, LocalCompletion>;
  games: Record<string, LocalGameState>;
  streak: { days: number; best: number; last: string | null };
  spinLast: string | null;
};

export type AcademyStatus = "anon" | "member" | "loading";

export type AwardEvent = {
  id: number;
  xp: number;
  reason: string;
  streakBonus: number;
  rankUp: string | null;
};

export type AcademySnapshot = {
  status: AcademyStatus;
  /** Authoritative when member; local mirror when anon. */
  xp: number;
  streakDays: number;
  streakBest: number;
  completions: Record<string, LocalCompletion>;
  games: Record<string, LocalGameState>;
  spinLast: string | null;
  /** Server progress when signed in (certificates, referral code…). */
  server: AcademyProgressRes | null;
  /** Lessons completed anonymously — drives the claim wall. */
  anonCompletions: number;
  /** Claim wall active: anon AND at/over the free-earn limit. */
  wallActive: boolean;
  lastAward: AwardEvent | null;
  /** Bumps once per successful device-XP claim sync — UIs may router.refresh(). */
  claimSeq: number;
};

const EMPTY: LocalState = {
  v: 1,
  xp: 0,
  completions: {},
  games: {},
  streak: { days: 0, best: 0, last: null },
  spinLast: null,
};

/* ---------- persistence ---------- */

function loadLocal(): LocalState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as LocalState;
    if (parsed?.v !== 1 || typeof parsed.xp !== "number") return EMPTY;
    return {
      ...EMPTY,
      ...parsed,
      completions: parsed.completions ?? {},
      games: parsed.games ?? {},
      streak: parsed.streak ?? EMPTY.streak,
    };
  } catch {
    return EMPTY;
  }
}

function saveLocal(state: LocalState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* storage full/blocked — gamification degrades, lessons still work */
  }
}

/* ---------- store core ---------- */

type Listener = () => void;

let local: LocalState = EMPTY;
let server: AcademyProgressRes | null = null;
let status: AcademyStatus = "loading";
let lastAward: AwardEvent | null = null;
let awardSeq = 0;
let claimSeq = 0;
let snapshot: AcademySnapshot | null = null;
let hydrated = false;
let progressFetch: Promise<void> | null = null;

const listeners = new Set<Listener>();

function emit(): void {
  snapshot = null;
  for (const fn of listeners) fn();
}

function buildSnapshot(): AcademySnapshot {
  const isMember = status === "member" && server !== null;
  const xp = isMember ? server!.xp : local.xp;
  const completions: Record<string, LocalCompletion> = isMember
    ? Object.fromEntries(
        Object.entries(server!.completions).map(([slug, c]) => [
          slug,
          { score: c.score, total: c.total, at: c.at },
        ]),
      )
    : local.completions;
  const anonCompletions = Object.keys(local.completions).length;
  return {
    status,
    xp,
    streakDays: isMember ? server!.streak_days : local.streak.days,
    streakBest: isMember ? server!.streak_best : local.streak.best,
    completions,
    games: isMember
      ? Object.fromEntries(
          Object.entries(server!.games).map(([id, g]) => [
            id,
            { date: g.date, plays: g.plays, wins: g.wins, best_streak: g.best_streak },
          ]),
        )
      : local.games,
    spinLast: isMember ? server!.spin_last_date : local.spinLast,
    server: isMember ? server : null,
    anonCompletions,
    wallActive: !isMember && status !== "loading" && anonCompletions >= ACADEMY_XP.ANON_LESSON_LIMIT,
    lastAward,
    claimSeq,
  };
}

export function getSnapshot(): AcademySnapshot {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    local = loadLocal();
    captureRef();
  }
  if (snapshot === null) snapshot = buildSnapshot();
  return snapshot;
}

/** Stable server snapshot for useSyncExternalStore SSR pass. */
const SSR_SNAPSHOT: AcademySnapshot = {
  status: "loading",
  xp: 0,
  streakDays: 0,
  streakBest: 0,
  completions: {},
  games: {},
  spinLast: null,
  server: null,
  anonCompletions: 0,
  wallActive: false,
  lastAward: null,
  claimSeq: 0,
};

export function getServerSnapshot(): AcademySnapshot {
  return SSR_SNAPSHOT;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- referral capture (?ref= on any academy page) ---------- */

function captureRef(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[a-z0-9-]{4,40}$/i.test(ref)) window.localStorage.setItem(REF_KEY, ref);
  } catch {
    /* no-op */
  }
}

export function pendingRefCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

/* ---------- server hydration + claim ---------- */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (res.status === 204 || !res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Hydrate membership status. 401/network → anon (local mode). On success,
 * claims any device-banked completions the server has not seen (sync).
 */
export function hydrateProgress(): Promise<void> {
  if (progressFetch) return progressFetch;
  progressFetch = (async () => {
    getSnapshot(); // ensure local is loaded
    const progress = await fetchJson<AcademyProgressRes>("/api/academy/progress");
    if (!progress) {
      status = "anon";
      emit();
      return;
    }
    server = progress;
    status = "member";
    emit();
    // Claim device-banked lessons the account lacks.
    const unclaimed = Object.entries(local.completions).filter(
      ([slug]) => progress.completions[slug] === undefined && ACADEMY_LESSON_BY_SLUG[slug],
    );
    const ref = pendingRefCode();
    if (unclaimed.length > 0 || ref) {
      const synced = await fetchJson<AcademyProgressRes>("/api/academy/sync", {
        method: "POST",
        body: JSON.stringify({
          ref_code: ref ?? undefined,
          client: { completions: Object.fromEntries(unclaimed) },
        }),
      });
      if (synced) {
        const claimedXp = synced.xp - progress.xp;
        if (claimedXp > 0) pushAward(claimedXp, "XP claimed", 0, progress.xp, synced.xp);
        server = synced;
        claimSeq += 1;
        try {
          window.localStorage.removeItem(REF_KEY);
        } catch {
          /* no-op */
        }
        emit();
      }
    }
  })().finally(() => {
    progressFetch = null;
  });
  return progressFetch;
}

/* ---------- mutations ---------- */

function pushAward(xp: number, reason: string, bonus: number, prevXp: number, newXp: number): void {
  const prevRank = rankFor(prevXp);
  const newRank = rankFor(newXp);
  lastAward = {
    id: ++awardSeq,
    xp,
    reason,
    streakBonus: bonus,
    rankUp: newRank.index > prevRank.index ? newRank.name : null,
  };
}

function applyLocalStreak(today: string): number {
  const t = nextStreak({ days: local.streak.days, last: local.streak.last }, today);
  if (!t.isNewDay) return 0;
  const bonus = streakBonus(t.days);
  local.streak = { days: t.days, best: Math.max(local.streak.best, t.days), last: today };
  return bonus;
}

export type CompleteResult = { awarded: number; streakBonus: number; alreadyDone: boolean };

/**
 * Complete a lesson with a quiz result. Anon: local award (respecting the
 * wall — callers gate UI, this guards state). Member: POST + reconcile.
 */
export async function completeLesson(slug: string, score: number, total: number): Promise<CompleteResult> {
  const meta = ACADEMY_LESSON_BY_SLUG[slug];
  if (!meta) return { awarded: 0, streakBonus: 0, alreadyDone: false };
  const snap = getSnapshot();
  if (snap.completions[slug]) return { awarded: 0, streakBonus: 0, alreadyDone: true };

  if (snap.status === "member" && server) {
    const res = await fetchJson<{ awarded_xp: number; streak_bonus: number; progress: AcademyProgressRes }>(
      "/api/academy/complete",
      { method: "POST", body: JSON.stringify({ lesson_slug: slug, score, total }) },
    );
    if (!res) return { awarded: 0, streakBonus: 0, alreadyDone: false };
    const prevXp = server.xp;
    server = res.progress;
    pushAward(res.awarded_xp, "Lesson complete", res.streak_bonus, prevXp, res.progress.xp);
    track("academy_lesson_complete", { slug });
    emit();
    return { awarded: res.awarded_xp, streakBonus: res.streak_bonus, alreadyDone: false };
  }

  // Anonymous: the wall blocks EARNING past the limit; reading stays free.
  if (snap.wallActive) return { awarded: 0, streakBonus: 0, alreadyDone: false };
  const today = utcDay();
  const prevXp = local.xp;
  const bonus = applyLocalStreak(today);
  const awarded = lessonAward(meta, score, total);
  local = {
    ...local,
    xp: local.xp + awarded + bonus,
    completions: { ...local.completions, [slug]: { score, total, at: new Date().toISOString() } },
  };
  saveLocal(local);
  pushAward(awarded, "Lesson complete", bonus, prevXp, local.xp);
  track("academy_lesson_complete", { slug });
  emit();
  return { awarded, streakBonus: bonus, alreadyDone: false };
}

export type GameResult = { awarded: number; capped: boolean };

/** Record an arcade round. XP for wins only, capped per game per UTC day. */
export async function recordGame(game: AcademyGameId, won: boolean, roundStreak = 0): Promise<GameResult> {
  const snap = getSnapshot();

  if (snap.status === "member" && server) {
    const res = await fetchJson<{ awarded_xp: number; streak_bonus: number; progress: AcademyProgressRes }>(
      "/api/academy/game",
      { method: "POST", body: JSON.stringify({ game, won, streak: roundStreak }) },
    );
    if (!res) return { awarded: 0, capped: false };
    const prevXp = server.xp;
    server = res.progress;
    if (res.awarded_xp > 0) pushAward(res.awarded_xp, "Arcade win", res.streak_bonus, prevXp, res.progress.xp);
    emit();
    return { awarded: res.awarded_xp, capped: won && res.awarded_xp === 0 };
  }

  const today = utcDay();
  const prev = local.games[game];
  const state: LocalGameState =
    prev && prev.date === today ? { ...prev } : { date: today, plays: 0, wins: 0, best_streak: prev?.best_streak ?? 0 };
  state.plays += 1;
  if (won) state.wins += 1;
  state.best_streak = Math.max(state.best_streak, roundStreak);
  const capped = state.plays > ACADEMY_XP.GAME_DAILY_CAP;
  const awarded = won && !capped ? ACADEMY_XP.GAME_WIN : 0;
  const prevXp = local.xp;
  const bonus = awarded > 0 ? applyLocalStreak(today) : 0;
  local = { ...local, xp: local.xp + awarded + bonus, games: { ...local.games, [game]: state } };
  saveLocal(local);
  if (awarded > 0) pushAward(awarded, "Arcade win", bonus, prevXp, local.xp);
  emit();
  return { awarded, capped };
}

/** Daily spin — members only, server-authoritative. */
export async function spinWheel(): Promise<{ prize: number } | { error: "used" | "unavailable" }> {
  if (getSnapshot().status !== "member" || !server) return { error: "unavailable" };
  try {
    const res = await fetch("/api/academy/spin", { method: "POST" });
    if (res.status === 409) return { error: "used" };
    if (!res.ok) return { error: "unavailable" };
    const data = (await res.json()) as { prize_xp: number; progress: AcademyProgressRes };
    const prevXp = server.xp;
    server = data.progress;
    pushAward(data.prize_xp, "Daily spin", 0, prevXp, data.progress.xp);
    emit();
    return { prize: data.prize_xp };
  } catch {
    return { error: "unavailable" };
  }
}

/** Clear the last award toast after the UI consumed it. */
export function consumeAward(id: number): void {
  if (lastAward?.id === id) {
    lastAward = null;
    emit();
  }
}

/** Refresh server progress (after cert claim, capstone, etc.). */
export async function refreshProgress(): Promise<void> {
  const progress = await fetchJson<AcademyProgressRes>("/api/academy/progress");
  if (progress) {
    server = progress;
    status = "member";
    emit();
  }
}
