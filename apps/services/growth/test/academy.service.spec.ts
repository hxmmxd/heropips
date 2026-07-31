import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACADEMY_EVENTS,
  ACADEMY_XP,
  academyTrackSlugs,
  type AcademyCertTrack,
  type AcademyCompletionEntry,
  type AcademySyncReq,
} from "@heropips/contracts";
import { ApiHttpError } from "../src/common/errors";
import { AcademyService } from "../src/academy/academy.service";
import { MemAcademyRepo } from "./academy-mem-repo";

const DAY1 = "2026-07-01";
const DAY2 = "2026-07-02";

function makeService(): { svc: AcademyService; repo: MemAcademyRepo } {
  const repo = new MemAcademyRepo();
  return { svc: new AcademyService(repo), repo };
}

function syncReq(userId: string, extra: Partial<AcademySyncReq> = {}): AcademySyncReq {
  return { user_id: userId, email: `${userId}@example.com`, display_name: `User ${userId}`, ...extra };
}

function doneEntry(): AcademyCompletionEntry {
  return { score: 1, total: 1, xp: 0, at: "2026-06-01T00:00:00.000Z" };
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string): Promise<void> {
  try {
    await promise;
    expect.unreachable(`expected ApiHttpError ${status}/${code}`);
  } catch (err) {
    expect(err).toBeInstanceOf(ApiHttpError);
    const apiErr = err as ApiHttpError;
    expect(apiErr.status).toBe(status);
    expect(apiErr.body.error_code).toBe(code);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${DAY1}T12:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("lesson completion", () => {
  // "what-is-trading": xp 60, quiz 4.
  it("perfect quiz pays lesson + per-correct + perfect bonus, plus first-day streak", async () => {
    const { svc, repo } = makeService();
    await svc.sync(syncReq("u1"));

    const res = await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });
    expect(res.awarded_xp).toBe(60 + 4 * 10 + 20); // 120
    expect(res.streak_bonus).toBe(5); // streak day 1
    expect(res.progress.xp).toBe(125);
    expect(res.progress.completions["what-is-trading"]).toMatchObject({ score: 4, total: 4, xp: 120 });
    expect(res.progress.streak_days).toBe(1);
    expect(res.progress.last_active_date).toBe(DAY1);

    const event = repo.outbox.find((r) => r.payload.type === ACADEMY_EVENTS.lessonCompleted);
    expect(event?.payload.payload).toEqual({
      user_id: "u1",
      slug: "what-is-trading",
      xp_awarded: 120,
      xp_total: 125,
    });
  });

  it("partial score gets no perfect bonus", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    const res = await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 2, total: 4 });
    expect(res.awarded_xp).toBe(60 + 2 * 10); // 80
  });

  it("re-completion is a no-op: 0 XP, no streak change, no second event", async () => {
    const { svc, repo } = makeService();
    await svc.sync(syncReq("u1"));
    await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });
    const eventsBefore = repo.eventTypes().length;

    const res = await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });
    expect(res.awarded_xp).toBe(0);
    expect(res.streak_bonus).toBe(0);
    expect(res.progress.xp).toBe(125);
    expect(res.progress.streak_days).toBe(1);
    expect(repo.eventTypes()).toHaveLength(eventsBefore);
  });

  it("clamps a client-claimed score to the real question count", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    const res = await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 99, total: 99 });
    expect(res.awarded_xp).toBe(120); // clamped to 4/4
    expect(res.progress.completions["what-is-trading"].score).toBe(4);
  });

  it("clamps a negative score to zero", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    const res = await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: -3, total: 4 });
    expect(res.awarded_xp).toBe(60); // 0 correct, no bonuses
  });

  it("rejects an unknown slug with 422", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    await expectApiError(
      svc.complete({ user_id: "u1", lesson_slug: "not-a-lesson", score: 1, total: 1 }),
      422,
      "validation_failed",
    );
  });

  it("404s for a user who never synced", async () => {
    const { svc } = makeService();
    await expectApiError(
      svc.complete({ user_id: "ghost", lesson_slug: "what-is-trading", score: 1, total: 4 }),
      404,
      "academy_not_found",
    );
  });
});

describe("streak transitions", () => {
  it("second activity the same day earns no extra bonus", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });
    const res = await svc.complete({ user_id: "u1", lesson_slug: "markets-and-pairs", score: 4, total: 4 });
    expect(res.streak_bonus).toBe(0);
    expect(res.progress.streak_days).toBe(1);
  });

  it("consecutive days extend the streak and scale the bonus", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });

    vi.setSystemTime(new Date(`${DAY2}T09:00:00Z`));
    const res = await svc.complete({ user_id: "u1", lesson_slug: "markets-and-pairs", score: 4, total: 4 });
    expect(res.streak_bonus).toBe(10); // day 2 × 5
    expect(res.progress.streak_days).toBe(2);
    expect(res.progress.streak_best).toBe(2);
  });

  it("a gap resets the streak to 1", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });

    vi.setSystemTime(new Date("2026-07-05T09:00:00Z"));
    const res = await svc.complete({ user_id: "u1", lesson_slug: "markets-and-pairs", score: 4, total: 4 });
    expect(res.streak_bonus).toBe(5);
    expect(res.progress.streak_days).toBe(1);
    expect(res.progress.streak_best).toBe(1);
  });

  it("caps the daily bonus at STREAK_BONUS_CAP", async () => {
    const { svc, repo } = makeService();
    repo.seed("u1", { streakDays: 20, streakBest: 20, lastActiveDate: "2026-06-30" });
    const res = await svc.complete({ user_id: "u1", lesson_slug: "what-is-trading", score: 4, total: 4 });
    expect(res.progress.streak_days).toBe(21);
    expect(res.streak_bonus).toBe(ACADEMY_XP.STREAK_BONUS_CAP); // min(21×5, 50)
  });
});

describe("arcade games", () => {
  it("a win pays GAME_WIN plus the first-activity streak bonus", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    const res = await svc.game({ user_id: "u1", game: "long-short", won: true, streak: 3 });
    expect(res.awarded_xp).toBe(15);
    expect(res.streak_bonus).toBe(5);
    expect(res.progress.games["long-short"]).toEqual({ date: DAY1, plays: 1, wins: 1, best_streak: 3 });
  });

  it("a loss pays nothing and does not touch the streak", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    const res = await svc.game({ user_id: "u1", game: "long-short", won: false });
    expect(res.awarded_xp).toBe(0);
    expect(res.streak_bonus).toBe(0);
    expect(res.progress.streak_days).toBe(0);
    expect(res.progress.last_active_date).toBeNull();
    expect(res.progress.games["long-short"]).toEqual({ date: DAY1, plays: 1, wins: 0, best_streak: 0 });
  });

  it("stops paying after GAME_DAILY_CAP plays, then resets the next UTC day", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    for (let i = 0; i < ACADEMY_XP.GAME_DAILY_CAP; i++) {
      const res = await svc.game({ user_id: "u1", game: "long-short", won: true });
      expect(res.awarded_xp).toBe(15);
    }
    const capped = await svc.game({ user_id: "u1", game: "long-short", won: true });
    expect(capped.awarded_xp).toBe(0);
    expect(capped.progress.games["long-short"].plays).toBe(11);
    expect(capped.progress.games["long-short"].wins).toBe(11);
    // 10 paying wins + one streak bonus (first win of the day).
    expect(capped.progress.xp).toBe(10 * 15 + 5);

    vi.setSystemTime(new Date(`${DAY2}T08:00:00Z`));
    const fresh = await svc.game({ user_id: "u1", game: "long-short", won: true });
    expect(fresh.awarded_xp).toBe(15);
    expect(fresh.streak_bonus).toBe(10); // consecutive day 2
    expect(fresh.progress.games["long-short"]).toMatchObject({ date: DAY2, plays: 1, wins: 1 });
  });

  it("keeps the all-time best round streak across resets", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));
    await svc.game({ user_id: "u1", game: "risk-sizer", won: true, streak: 7 });
    vi.setSystemTime(new Date(`${DAY2}T08:00:00Z`));
    const res = await svc.game({ user_id: "u1", game: "risk-sizer", won: true, streak: 2 });
    expect(res.progress.games["risk-sizer"].best_streak).toBe(7);
  });
});

describe("daily spin", () => {
  it("pays a listed prize once per UTC day, then 409s until tomorrow", async () => {
    const { svc } = makeService();
    await svc.sync(syncReq("u1"));

    const first = await svc.spin("u1");
    expect(ACADEMY_XP.SPIN_PRIZES).toContain(first.prize_xp);
    expect(first.progress.spin_last_date).toBe(DAY1);
    expect(first.progress.xp).toBe(first.prize_xp + 5); // prize + day-1 streak bonus

    await expectApiError(svc.spin("u1"), 409, "academy_spin_used");

    vi.setSystemTime(new Date(`${DAY2}T00:30:00Z`));
    const second = await svc.spin("u1");
    expect(ACADEMY_XP.SPIN_PRIZES).toContain(second.prize_xp);
    expect(second.progress.spin_last_date).toBe(DAY2);
  });

  it("404s for a user who never synced", async () => {
    const { svc } = makeService();
    await expectApiError(svc.spin("ghost"), 404, "academy_not_found");
  });
});

describe("sync", () => {
  it("creates a row with a lowercase crockford referral code and emits synced", async () => {
    const { svc, repo } = makeService();
    const res = await svc.sync(syncReq("u1"));
    expect(res.user_id).toBe("u1");
    expect(res.xp).toBe(0);
    expect(res.referral_code).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{8}$/);
    expect(res.referred_by).toBeNull();
    expect(repo.eventTypes()).toEqual([ACADEMY_EVENTS.synced]);
  });

  it("merges only unknown valid client completions, one streak application for the batch", async () => {
    const { svc, repo } = makeService();
    const res = await svc.sync(
      syncReq("u1", {
        client: {
          completions: {
            "what-is-trading": { score: 4, total: 4, at: "2026-06-30T10:00:00.000Z" },
            "markets-and-pairs": { score: 99, total: 4, at: "2026-06-30T11:00:00.000Z" }, // clamped
            "not-a-lesson": { score: 5, total: 5, at: "2026-06-30T12:00:00.000Z" }, // dropped
          },
        },
      }),
    );
    // 120 + 120 lesson awards + a single day-1 streak bonus.
    expect(res.xp).toBe(245);
    expect(res.streak_days).toBe(1);
    expect(res.completions["markets-and-pairs"]).toMatchObject({ score: 4, total: 4, xp: 120 });
    expect(res.completions["not-a-lesson"]).toBeUndefined();
    expect(repo.eventTypes()).toEqual([
      ACADEMY_EVENTS.lessonCompleted,
      ACADEMY_EVENTS.lessonCompleted,
      ACADEMY_EVENTS.synced,
    ]);
  });

  it("re-syncing the same completions awards nothing more", async () => {
    const { svc } = makeService();
    const client = { completions: { "what-is-trading": { score: 4, total: 4, at: "2026-06-30T10:00:00.000Z" } } };
    const first = await svc.sync(syncReq("u1", { client }));
    const again = await svc.sync(syncReq("u1", { client }));
    expect(again.xp).toBe(first.xp);
    expect(again.streak_days).toBe(first.streak_days);
  });
});

describe("referrals", () => {
  it("awards REFERRAL_BONUS to both sides exactly once", async () => {
    const { svc, repo } = makeService();
    const parent = await svc.sync(syncReq("alice"));
    const child = await svc.sync(syncReq("bob", { ref_code: parent.referral_code }));

    expect(child.referred_by).toBe("alice");
    expect(child.xp).toBe(ACADEMY_XP.REFERRAL_BONUS);
    expect((await svc.progress("alice")).xp).toBe(ACADEMY_XP.REFERRAL_BONUS);
    expect(repo.eventTypes().filter((t) => t === ACADEMY_EVENTS.referralAwarded)).toHaveLength(1);

    // Re-sync with the same (or any) code: already referred, no double award.
    const again = await svc.sync(syncReq("bob", { ref_code: parent.referral_code }));
    expect(again.xp).toBe(ACADEMY_XP.REFERRAL_BONUS);
    expect(repo.eventTypes().filter((t) => t === ACADEMY_EVENTS.referralAwarded)).toHaveLength(1);
  });

  it("ignores self-referral", async () => {
    const { svc, repo } = makeService();
    const me = await svc.sync(syncReq("carol"));
    const res = await svc.sync(syncReq("carol", { ref_code: me.referral_code }));
    expect(res.referred_by).toBeNull();
    expect(res.xp).toBe(0);
    expect(repo.eventTypes()).not.toContain(ACADEMY_EVENTS.referralAwarded);
  });

  it("ignores an unknown ref code", async () => {
    const { svc } = makeService();
    const res = await svc.sync(syncReq("dave", { ref_code: "nosuchcode" }));
    expect(res.referred_by).toBeNull();
    expect(res.xp).toBe(0);
  });

  it("referrals_qualified counts only invitees who finished every qualifying-level lesson", async () => {
    const { svc, repo } = makeService();
    const level5 = academyTrackSlugs("level-5");
    const allDone = Object.fromEntries(level5.map((s) => [s, doneEntry()]));
    const partial = Object.fromEntries(level5.slice(0, -1).map((s) => [s, doneEntry()]));

    repo.seed("referrer");
    repo.seed("finisher", { referredBy: "referrer", completions: allDone });
    repo.seed("halfway", { referredBy: "referrer", completions: partial });
    repo.seed("stranger", { completions: allDone }); // finished, but not referred

    expect((await svc.progress("referrer")).referrals_qualified).toBe(1);
    expect((await svc.progress("finisher")).referrals_qualified).toBe(0);
  });
});

describe("certificates", () => {
  function completionsFor(track: AcademyCertTrack): Record<string, AcademyCompletionEntry> {
    return Object.fromEntries(academyTrackSlugs(track).map((slug) => [slug, doneEntry()]));
  }

  it("refuses an incomplete track with 409", async () => {
    const { svc, repo } = makeService();
    repo.seed("u1", { completions: { "what-is-trading": doneEntry() } });
    await expectApiError(
      svc.issueCertificate({ user_id: "u1", track: "level-2" }),
      409,
      "academy_track_incomplete",
    );
  });

  it("issues a well-formed certificate once the track is complete", async () => {
    const { svc, repo } = makeService();
    repo.seed("u1", { displayName: "Ada L.", xp: 900, completions: completionsFor("level-2") });

    const cert = await svc.issueCertificate({ user_id: "u1", track: "level-2" });
    expect(cert.code).toMatch(/^HP-[0-9A-Z]{5}-[0-9A-Z]{5}$/);
    expect(cert.track).toBe("level-2");
    expect(cert.recipient).toBe("Ada L.");
    expect(cert.xp_at_issue).toBe(900);
    expect(repo.eventTypes()).toEqual([ACADEMY_EVENTS.certificateIssued]);
  });

  it("level-0 issues with only its own 3 lessons; other levels stay locked", async () => {
    const { svc, repo } = makeService();
    expect(academyTrackSlugs("level-0")).toHaveLength(3);
    repo.seed("u1", { completions: completionsFor("level-0") });

    const cert = await svc.issueCertificate({ user_id: "u1", track: "level-0" });
    expect(cert.track).toBe("level-0");
    await expectApiError(
      svc.issueCertificate({ user_id: "u1", track: "level-1" }),
      409,
      "academy_track_incomplete",
    );
  });

  it("re-issue is idempotent: same code, no second event", async () => {
    const { svc, repo } = makeService();
    repo.seed("u1", { completions: completionsFor("level-2") });
    const first = await svc.issueCertificate({ user_id: "u1", track: "level-2" });
    const second = await svc.issueCertificate({ user_id: "u1", track: "level-2" });
    expect(second.code).toBe(first.code);
    expect(repo.certs).toHaveLength(1);
    expect(repo.eventTypes()).toEqual([ACADEMY_EVENTS.certificateIssued]);
  });

  it("hero-trader needs all 31 lessons, not just one level", async () => {
    const { svc, repo } = makeService();
    expect(academyTrackSlugs("hero-trader")).toHaveLength(31);
    repo.seed("u1", { completions: completionsFor("level-2") });
    await expectApiError(
      svc.issueCertificate({ user_id: "u1", track: "hero-trader" }),
      409,
      "academy_track_incomplete",
    );
    repo.seed("u2", { completions: completionsFor("hero-trader") });
    const cert = await svc.issueCertificate({ user_id: "u2", track: "hero-trader" });
    expect(cert.track).toBe("hero-trader");
  });

  it("verify: valid code (case-insensitive input) vs unknown code", async () => {
    const { svc, repo } = makeService();
    repo.seed("u1", { completions: completionsFor("level-2") });
    const cert = await svc.issueCertificate({ user_id: "u1", track: "level-2" });

    const ok = await svc.verify(cert.code.toLowerCase());
    expect(ok.valid).toBe(true);
    expect(ok.certificate?.code).toBe(cert.code);

    const bad = await svc.verify("HP-AAAAA-AAAAA");
    expect(bad).toEqual({ valid: false, certificate: null });
  });
});

describe("progress + leaderboard", () => {
  it("progress 404s before the first sync and includes certificates after", async () => {
    const { svc, repo } = makeService();
    await expectApiError(svc.progress("ghost"), 404, "academy_not_found");

    repo.seed("u1", {
      completions: Object.fromEntries(academyTrackSlugs("level-2").map((s) => [s, doneEntry()])),
    });
    await svc.issueCertificate({ user_id: "u1", track: "level-2" });
    const res = await svc.progress("u1");
    expect(res.certificates).toHaveLength(1);
    expect(res.certificates[0].track).toBe("level-2");
    expect(res.referrals_qualified).toBe(0);
  });

  it("orders by xp desc, ties by earlier updatedAt, and honors the limit", async () => {
    const { svc, repo } = makeService();
    repo.seed("low", { displayName: "Low", xp: 100, updatedAt: new Date("2026-06-01T00:00:00Z") });
    repo.seed("late", { displayName: "Late", xp: 500, updatedAt: new Date("2026-06-20T00:00:00Z") });
    repo.seed("early", { displayName: "Early", xp: 500, updatedAt: new Date("2026-06-10T00:00:00Z") });
    repo.seed("top", { displayName: "Top", xp: 900, streakDays: 4, updatedAt: new Date("2026-06-15T00:00:00Z") });

    const res = await svc.leaderboard(3);
    expect(res.entries).toEqual([
      { display_name: "Top", xp: 900, streak_days: 4 },
      { display_name: "Early", xp: 500, streak_days: 0 },
      { display_name: "Late", xp: 500, streak_days: 0 },
    ]);
  });
});
