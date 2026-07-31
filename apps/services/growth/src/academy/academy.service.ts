import { randomInt } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  ACADEMY_EVENTS,
  ACADEMY_LESSON_BY_SLUG,
  ACADEMY_XP,
  academyTrackSlugs,
  TOPICS,
  type AcademyCertIssueReq,
  type AcademyCertRes,
  type AcademyCompleteReq,
  type AcademyGameReq,
  type AcademyGameState,
  type AcademyLeaderboardRes,
  type AcademyMutationRes,
  type AcademyProgressRes,
  type AcademySpinRes,
  type AcademySyncReq,
  type AcademyVerifyRes,
} from "@heropips/contracts";
import { apiError } from "../common/errors";
import { makeEnvelope } from "../outbox/outbox.service";
import {
  ACADEMY_REPO,
  type AcademyCertRow,
  type AcademyProgressRow,
  type AcademyRepo,
  type AcademyTxOps,
} from "./academy.repo";
import {
  clampScore,
  generateAcademyReferralCode,
  generateCertificateCode,
  nextStreak,
  quizXp,
  streakBonus,
  utcDay,
} from "./xp";

/** Collision retries before giving up (32^8 codes — practically unreachable). */
const CODE_RETRIES = 5;

function toCertRes(cert: AcademyCertRow): AcademyCertRes {
  return {
    code: cert.code,
    track: cert.track,
    recipient: cert.recipient,
    issued_at: cert.issuedAt.toISOString(),
    xp_at_issue: cert.xpAtIssue,
  };
}

function toProgressRes(
  row: AcademyProgressRow,
  certs: AcademyCertRow[],
  referralsQualified: number,
): AcademyProgressRes {
  return {
    user_id: row.userId,
    display_name: row.displayName,
    xp: row.xp,
    streak_days: row.streakDays,
    streak_best: row.streakBest,
    last_active_date: row.lastActiveDate,
    spin_last_date: row.spinLastDate,
    referral_code: row.referralCode,
    referred_by: row.referredBy,
    referrals_qualified: referralsQualified,
    completions: row.completions,
    games: row.games,
    certificates: certs.map(toCertRes),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/**
 * Streak transition applied to a mutable working row. Returns the new-day
 * bonus (0 on a same-day repeat). Marks the user active today.
 */
function applyStreak(row: AcademyProgressRow, today: string): number {
  const t = nextStreak({ days: row.streakDays, last: row.lastActiveDate }, today);
  const bonus = t.isNewDay ? streakBonus(t.days) : 0;
  row.streakDays = t.days;
  row.streakBest = Math.max(row.streakBest, t.days);
  row.lastActiveDate = today;
  return bonus;
}

@Injectable()
export class AcademyService {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(ACADEMY_REPO) private readonly repo: AcademyRepo) {}

  /**
   * Upsert the user's row, claim device-banked completions (idempotent per
   * slug, one streak application for the whole batch) and resolve a pending
   * referral code — bonus to both sides, once ever, self-referral ignored.
   */
  async sync(req: AcademySyncReq): Promise<AcademyProgressRes> {
    return this.repo.tx(async (ops) => {
      const existing = await ops.getProgressForUpdate(req.user_id);
      const created = existing === null;
      const row: AcademyProgressRow = existing
        ? { ...existing, email: req.email, displayName: req.display_name }
        : await ops.insertProgress({
            userId: req.user_id,
            email: req.email,
            displayName: req.display_name,
            referralCode: await this.uniqueReferralCode(ops),
          });

      // Merge client completions: only valid slugs the server has not seen.
      // `at` is stamped SERVER-side, never taken from the client: the contract
      // types it as a free-form string, it lands in a jsonb column, and it is
      // the only timeline evidence a certificate can lean on (see
      // issueCertificate) — so it has to be ours (M4/M5, L3).
      const today = utcDay();
      const syncedAt = new Date().toISOString();
      const merged: string[] = [];
      let awarded = 0;
      for (const [slug, entry] of Object.entries(req.client?.completions ?? {})) {
        const meta = ACADEMY_LESSON_BY_SLUG[slug];
        if (!meta || row.completions[slug]) continue;
        const score = clampScore(entry.score, meta.quiz);
        const xp = meta.xp + quizXp(score, meta.quiz);
        row.completions = {
          ...row.completions,
          [slug]: { score, total: meta.quiz, xp, at: syncedAt },
        };
        awarded += xp;
        merged.push(slug);
      }
      if (merged.length > 0) awarded += applyStreak(row, today);
      row.xp += awarded;

      // Referral resolution: once ever, never self, both sides awarded.
      const refCode = req.ref_code?.trim().toLowerCase();
      if (refCode && row.referredBy === null) {
        const parent = await ops.findByReferralCode(refCode);
        if (parent && parent.userId !== row.userId) {
          row.referredBy = parent.userId;
          row.xp += ACADEMY_XP.REFERRAL_BONUS;
          await ops.saveProgress({ ...parent, xp: parent.xp + ACADEMY_XP.REFERRAL_BONUS });
          await ops.insertOutbox(
            TOPICS.growthEvents,
            makeEnvelope(ACADEMY_EVENTS.referralAwarded, {
              user_id: row.userId,
              referrer_id: parent.userId,
              xp_awarded: ACADEMY_XP.REFERRAL_BONUS,
            }),
          );
        }
      }

      const saved = await ops.saveProgress(row);
      for (const slug of merged) {
        await ops.insertOutbox(
          TOPICS.growthEvents,
          makeEnvelope(ACADEMY_EVENTS.lessonCompleted, {
            user_id: saved.userId,
            slug,
            xp_awarded: saved.completions[slug].xp,
            xp_total: saved.xp,
          }),
        );
      }
      await ops.insertOutbox(
        TOPICS.growthEvents,
        makeEnvelope(ACADEMY_EVENTS.synced, {
          user_id: saved.userId,
          email: saved.email,
          display_name: saved.displayName,
          created,
          merged_count: merged.length,
          xp_total: saved.xp,
        }),
      );
      return this.progressRes(ops, saved);
    });
  }

  async progress(userId: string): Promise<AcademyProgressRes> {
    const row = await this.repo.getProgress(userId);
    if (!row) {
      throw apiError(
        404,
        "academy_not_found",
        "No academy progress for this user.",
        "POST /v1/academy/sync to create it.",
      );
    }
    return this.progressRes(this.repo, row);
  }

  /**
   * Complete a lesson. Server recomputes the award from curriculum meta —
   * the client-claimed score is clamped to [0, meta.quiz]. Re-completing is
   * a no-op: 0 XP, no streak change, no event.
   */
  async complete(req: AcademyCompleteReq): Promise<AcademyMutationRes> {
    const meta = ACADEMY_LESSON_BY_SLUG[req.lesson_slug];
    if (!meta) {
      throw apiError(422, "validation_failed", `Unknown lesson slug "${req.lesson_slug}".`);
    }
    return this.repo.tx(async (ops) => {
      const row = await this.requireForUpdate(ops, req.user_id);
      if (row.completions[req.lesson_slug]) {
        return {
          awarded_xp: 0,
          streak_bonus: 0,
          progress: await this.progressRes(ops, row),
        };
      }
      const score = clampScore(req.score, meta.quiz);
      const awarded = meta.xp + quizXp(score, meta.quiz);
      const bonus = applyStreak(row, utcDay());
      row.xp += awarded + bonus;
      row.completions = {
        ...row.completions,
        [req.lesson_slug]: { score, total: meta.quiz, xp: awarded, at: new Date().toISOString() },
      };
      const saved = await ops.saveProgress(row);
      await ops.insertOutbox(
        TOPICS.growthEvents,
        makeEnvelope(ACADEMY_EVENTS.lessonCompleted, {
          user_id: saved.userId,
          slug: req.lesson_slug,
          xp_awarded: awarded,
          xp_total: saved.xp,
        }),
      );
      return {
        awarded_xp: awarded,
        streak_bonus: bonus,
        progress: await this.progressRes(ops, saved),
      };
    });
  }

  /**
   * Record an arcade round. Wins pay GAME_WIN, but only the first
   * GAME_DAILY_CAP rounds per game per UTC day can earn. Streak advances
   * only when XP was actually earned (mirrors the client store).
   */
  async game(req: AcademyGameReq): Promise<AcademyMutationRes> {
    return this.repo.tx(async (ops) => {
      const row = await this.requireForUpdate(ops, req.user_id);
      const today = utcDay();
      const prev = row.games[req.game];
      const state: AcademyGameState =
        prev && prev.date === today
          ? { ...prev }
          : { date: today, plays: 0, wins: 0, best_streak: prev?.best_streak ?? 0 };
      state.plays += 1;
      if (req.won) state.wins += 1;
      state.best_streak = Math.max(state.best_streak, req.streak ?? 0);

      const capped = state.plays > ACADEMY_XP.GAME_DAILY_CAP;
      const awarded = req.won && !capped ? ACADEMY_XP.GAME_WIN : 0;
      const bonus = awarded > 0 ? applyStreak(row, today) : 0;
      row.xp += awarded + bonus;
      row.games = { ...row.games, [req.game]: state };
      const saved = await ops.saveProgress(row);
      return {
        awarded_xp: awarded,
        streak_bonus: bonus,
        progress: await this.progressRes(ops, saved),
      };
    });
  }

  /** Daily spin: once per UTC day, prize drawn server-side (uniform). */
  async spin(userId: string): Promise<AcademySpinRes> {
    return this.repo.tx(async (ops) => {
      const row = await this.requireForUpdate(ops, userId);
      const today = utcDay();
      if (row.spinLastDate === today) {
        throw apiError(
          409,
          "academy_spin_used",
          "Today's spin is already used.",
          "Come back after midnight UTC for another spin.",
        );
      }
      const prize = ACADEMY_XP.SPIN_PRIZES[randomInt(ACADEMY_XP.SPIN_PRIZES.length)];
      const bonus = applyStreak(row, today);
      row.xp += prize + bonus;
      row.spinLastDate = today;
      const saved = await ops.saveProgress(row);
      return {
        prize_xp: prize,
        progress: await this.progressRes(ops, saved),
      };
    });
  }

  /**
   * Issue a track certificate. Requires every lesson of the track complete
   * (409 otherwise). Idempotent: re-issue returns the existing certificate.
   *
   * L3 — REMAINING GAP, deliberately not closed here. A certificate attests
   * only that the server *recorded* a completion for every lesson of the track.
   * The quiz score inside each completion is asserted by the client: the server
   * clamps it to the lesson's real question count (xp.ts `clampScore`) but has
   * no way to recompute it, because nothing server-side knows the answers or
   * which questions were served. So any authenticated member can POST
   * /v1/academy/complete for each lesson and claim a publicly verifiable
   * credential without reading a word.
   *
   * Adding a score threshold here would NOT fix that — a forger simply claims a
   * perfect score — it would only penalise honest low scorers, so it is not
   * done. Closing the gap needs a schema migration this task cannot make:
   *   1. an answer key per lesson server-side (curriculum content moves into
   *      contracts or a table; today only the question COUNT is shared),
   *   2. an attempts table recording the questions served and the answers
   *      submitted, so the score is computed, not received,
   *   3. certificate issuance keyed on those attempt rows rather than on the
   *      `completions` jsonb.
   * Until then the controls that DO apply are: authentication on the whole
   * surface (H4), server-stamped completion timestamps (see `sync`), and rate
   * limits on issuance and on public verification (L4).
   */
  async issueCertificate(req: AcademyCertIssueReq): Promise<AcademyCertRes> {
    return this.repo.tx(async (ops) => {
      const row = await this.requireForUpdate(ops, req.user_id);
      const existing = await ops.getCertificate(row.userId, req.track);
      if (existing) return toCertRes(existing);

      const missing = academyTrackSlugs(req.track).filter((slug) => !row.completions[slug]);
      if (missing.length > 0) {
        throw apiError(
          409,
          "academy_track_incomplete",
          `Track "${req.track}" still needs ${missing.length} lesson(s).`,
          "Finish every lesson in the track, then claim again.",
        );
      }

      let code = generateCertificateCode();
      for (let i = 0; i < CODE_RETRIES && (await ops.getCertificateByCode(code)); i++) {
        code = generateCertificateCode();
      }
      const cert = await ops.insertCertificate({
        code,
        userId: row.userId,
        track: req.track,
        recipient: row.displayName,
        xpAtIssue: row.xp,
      });
      await ops.insertOutbox(
        TOPICS.growthEvents,
        makeEnvelope(ACADEMY_EVENTS.certificateIssued, {
          user_id: cert.userId,
          track: cert.track,
          code: cert.code,
          recipient: cert.recipient,
          xp_at_issue: cert.xpAtIssue,
        }),
      );
      return toCertRes(cert);
    });
  }

  /** Public verification — always 200, invalid codes are not an error. */
  async verify(code: string): Promise<AcademyVerifyRes> {
    const cert = await this.repo.getCertificateByCode(code.trim().toUpperCase());
    return { valid: cert !== null, certificate: cert ? toCertRes(cert) : null };
  }

  async leaderboard(limit: number): Promise<AcademyLeaderboardRes> {
    const rows = await this.repo.leaderboard(limit);
    return {
      entries: rows.map((r) => ({ display_name: r.displayName, xp: r.xp, streak_days: r.streakDays })),
    };
  }

  private async requireForUpdate(ops: AcademyTxOps, userId: string): Promise<AcademyProgressRow> {
    const row = await ops.getProgressForUpdate(userId);
    if (!row) {
      throw apiError(
        404,
        "academy_not_found",
        "No academy progress for this user.",
        "POST /v1/academy/sync to create it.",
      );
    }
    return row;
  }

  /** Progress payload shared by every read/mutation response (one cheap count query). */
  private async progressRes(
    ops: Pick<AcademyTxOps, "listCertificates" | "countQualifiedReferrals">,
    row: AcademyProgressRow,
  ): Promise<AcademyProgressRes> {
    return toProgressRes(
      row,
      await ops.listCertificates(row.userId),
      await ops.countQualifiedReferrals(row.userId),
    );
  }

  private async uniqueReferralCode(ops: AcademyTxOps): Promise<string> {
    for (let i = 0; i < CODE_RETRIES; i++) {
      const code = generateAcademyReferralCode();
      if (!(await ops.findByReferralCode(code))) return code;
    }
    // The unique index would still reject a race; this is unreachable in practice.
    throw new Error("academy referral code generation exhausted retries");
  }
}
