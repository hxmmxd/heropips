import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  ACADEMY_LIVE,
  academyTrackSlugs,
  type AcademyCertTrack,
  type AcademyCompletionEntry,
  type AcademyGameState,
} from "@heropips/contracts";
import type { Db } from "../db/client";
import { academyCertificates, academyNudges, academyProgress, outbox } from "../db/schema";

/**
 * A referral "qualifies" once the invitee finishes every lesson of the
 * qualifying level (ACADEMY_LIVE.QUALIFIED_REFERRAL_LEVEL). Slugs are derived
 * from contracts — never hardcoded.
 */
export const QUALIFIED_REFERRAL_SLUGS: readonly string[] = academyTrackSlugs(
  `level-${ACADEMY_LIVE.QUALIFIED_REFERRAL_LEVEL}` as AcademyCertTrack,
);

export interface AcademyProgressRow {
  userId: string;
  email: string;
  displayName: string;
  xp: number;
  streakDays: number;
  streakBest: number;
  lastActiveDate: string | null; // UTC day "YYYY-MM-DD"
  spinLastDate: string | null;
  referralCode: string;
  referredBy: string | null;
  completions: Record<string, AcademyCompletionEntry>;
  games: Record<string, AcademyGameState>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAcademyProgressRow {
  userId: string;
  email: string;
  displayName: string;
  referralCode: string;
}

export interface AcademyCertRow {
  code: string;
  userId: string;
  track: AcademyCertTrack;
  recipient: string;
  xpAtIssue: number;
  issuedAt: Date;
}

export interface NewAcademyCertRow {
  code: string;
  userId: string;
  track: AcademyCertTrack;
  recipient: string;
  xpAtIssue: number;
}

export interface AcademyLeaderboardRow {
  displayName: string;
  xp: number;
  streakDays: number;
}

export type AcademyNudgeCadence = "daily" | "weekly" | "monthly";

/** Operations available inside an academy transaction. */
export interface AcademyTxOps {
  /** SELECT ... FOR UPDATE — serializes concurrent mutations per user. */
  getProgressForUpdate(userId: string): Promise<AcademyProgressRow | null>;
  insertProgress(row: NewAcademyProgressRow): Promise<AcademyProgressRow>;
  /** Full-row write by PK; bumps updated_at. */
  saveProgress(row: AcademyProgressRow): Promise<AcademyProgressRow>;
  findByReferralCode(code: string): Promise<AcademyProgressRow | null>;
  listCertificates(userId: string): Promise<AcademyCertRow[]>;
  getCertificate(userId: string, track: AcademyCertTrack): Promise<AcademyCertRow | null>;
  getCertificateByCode(code: string): Promise<AcademyCertRow | null>;
  insertCertificate(row: NewAcademyCertRow): Promise<AcademyCertRow>;
  /** Most recent sent_on for (user, cadence), or null when never nudged. */
  lastNudgeOn(userId: string, cadence: AcademyNudgeCadence): Promise<string | null>;
  /** ON CONFLICT (user_id, cadence, sent_on) DO NOTHING; true when inserted. */
  insertNudge(userId: string, cadence: AcademyNudgeCadence, sentOn: string): Promise<boolean>;
  insertOutbox(topic: string, payload: unknown): Promise<void>;
  /** Invitees (referred_by = userId) who completed every qualifying-level lesson. */
  countQualifiedReferrals(userId: string): Promise<number>;
}

/** DI seam: AcademyService/AcademyNudges depend on this, tests inject an in-memory impl. */
export interface AcademyRepo {
  tx<T>(fn: (ops: AcademyTxOps) => Promise<T>): Promise<T>;
  getProgress(userId: string): Promise<AcademyProgressRow | null>;
  listCertificates(userId: string): Promise<AcademyCertRow[]>;
  getCertificateByCode(code: string): Promise<AcademyCertRow | null>;
  /** Top N by xp desc, ties by updated_at asc (earlier achiever ranks first). */
  leaderboard(limit: number): Promise<AcademyLeaderboardRow[]>;
  /** Rows with last_active_date in [minDate, maxDate] — nudge candidates. */
  listActiveBetween(minDate: string, maxDate: string): Promise<AcademyProgressRow[]>;
  /** Rows with last_active_date on or before maxDate — monthly candidates. */
  listActiveOnOrBefore(maxDate: string): Promise<AcademyProgressRow[]>;
  /** Invitees (referred_by = userId) who completed every qualifying-level lesson. */
  countQualifiedReferrals(userId: string): Promise<number>;
}

export const ACADEMY_REPO = Symbol("ACADEMY_REPO");

/* ---------- drizzle/pg implementation ---------- */

type Executor = Pick<Db, "select" | "insert" | "update" | "execute">;

const PROGRESS_COLUMNS = {
  userId: academyProgress.userId,
  email: academyProgress.email,
  displayName: academyProgress.displayName,
  xp: academyProgress.xp,
  streakDays: academyProgress.streakDays,
  streakBest: academyProgress.streakBest,
  lastActiveDate: academyProgress.lastActiveDate,
  spinLastDate: academyProgress.spinLastDate,
  referralCode: academyProgress.referralCode,
  referredBy: academyProgress.referredBy,
  completions: academyProgress.completions,
  games: academyProgress.games,
  createdAt: academyProgress.createdAt,
  updatedAt: academyProgress.updatedAt,
} as const;

const CERT_COLUMNS = {
  code: academyCertificates.code,
  userId: academyCertificates.userId,
  track: academyCertificates.track,
  recipient: academyCertificates.recipient,
  xpAtIssue: academyCertificates.xpAtIssue,
  issuedAt: academyCertificates.issuedAt,
} as const;

async function getProgressOn(ex: Executor, userId: string): Promise<AcademyProgressRow | null> {
  const rows = await ex
    .select(PROGRESS_COLUMNS)
    .from(academyProgress)
    .where(eq(academyProgress.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function listCertificatesOn(ex: Executor, userId: string): Promise<AcademyCertRow[]> {
  return ex
    .select(CERT_COLUMNS)
    .from(academyCertificates)
    .where(eq(academyCertificates.userId, userId))
    .orderBy(asc(academyCertificates.issuedAt));
}

async function getCertificateByCodeOn(ex: Executor, code: string): Promise<AcademyCertRow | null> {
  const rows = await ex
    .select(CERT_COLUMNS)
    .from(academyCertificates)
    .where(eq(academyCertificates.code, code))
    .limit(1);
  return rows[0] ?? null;
}

/** PG array literal — a JS array param would expand to a record, not text[]. */
const QUALIFIED_SLUGS_LITERAL = `{${QUALIFIED_REFERRAL_SLUGS.join(",")}}`;

async function countQualifiedReferralsOn(ex: Executor, userId: string): Promise<number> {
  // jsonb ?& — completions must contain ALL qualifying-level slugs as keys.
  const rows = await ex
    .select({ count: sql<number>`count(*)::int` })
    .from(academyProgress)
    .where(
      and(
        eq(academyProgress.referredBy, userId),
        sql`${academyProgress.completions} ?& ${QUALIFIED_SLUGS_LITERAL}::text[]`,
      ),
    );
  return rows[0]?.count ?? 0;
}

export class DrizzleAcademyRepo implements AcademyRepo {
  constructor(private readonly db: Db) {}

  tx<T>(fn: (ops: AcademyTxOps) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const ops: AcademyTxOps = {
        getProgressForUpdate: async (userId) => {
          const rows = await tx
            .select(PROGRESS_COLUMNS)
            .from(academyProgress)
            .where(eq(academyProgress.userId, userId))
            .limit(1)
            .for("update");
          return rows[0] ?? null;
        },
        insertProgress: async (row) => {
          const inserted = await tx.insert(academyProgress).values(row).returning(PROGRESS_COLUMNS);
          return inserted[0];
        },
        saveProgress: async (row) => {
          const updated = await tx
            .update(academyProgress)
            .set({
              email: row.email,
              displayName: row.displayName,
              xp: row.xp,
              streakDays: row.streakDays,
              streakBest: row.streakBest,
              lastActiveDate: row.lastActiveDate,
              spinLastDate: row.spinLastDate,
              referredBy: row.referredBy,
              completions: row.completions,
              games: row.games,
              updatedAt: new Date(),
            })
            .where(eq(academyProgress.userId, row.userId))
            .returning(PROGRESS_COLUMNS);
          const saved = updated[0];
          if (!saved) throw new Error(`academy_progress row vanished mid-transaction: ${row.userId}`);
          return saved;
        },
        findByReferralCode: async (code) => {
          const rows = await tx
            .select(PROGRESS_COLUMNS)
            .from(academyProgress)
            .where(eq(academyProgress.referralCode, code))
            .limit(1);
          return rows[0] ?? null;
        },
        listCertificates: (userId) => listCertificatesOn(tx, userId),
        getCertificate: async (userId, track) => {
          const rows = await tx
            .select(CERT_COLUMNS)
            .from(academyCertificates)
            .where(and(eq(academyCertificates.userId, userId), eq(academyCertificates.track, track)))
            .limit(1);
          return rows[0] ?? null;
        },
        getCertificateByCode: (code) => getCertificateByCodeOn(tx, code),
        insertCertificate: async (row) => {
          const inserted = await tx.insert(academyCertificates).values(row).returning(CERT_COLUMNS);
          return inserted[0];
        },
        lastNudgeOn: async (userId, cadence) => {
          const rows = await tx
            .select({ sentOn: academyNudges.sentOn })
            .from(academyNudges)
            .where(and(eq(academyNudges.userId, userId), eq(academyNudges.cadence, cadence)))
            .orderBy(desc(academyNudges.sentOn))
            .limit(1);
          return rows[0]?.sentOn ?? null;
        },
        insertNudge: async (userId, cadence, sentOn) => {
          const inserted = await tx
            .insert(academyNudges)
            .values({ userId, cadence, sentOn })
            .onConflictDoNothing({
              target: [academyNudges.userId, academyNudges.cadence, academyNudges.sentOn],
            })
            .returning({ userId: academyNudges.userId });
          return inserted.length > 0;
        },
        insertOutbox: async (topic, payload) => {
          await tx.insert(outbox).values({ topic, payload });
        },
        countQualifiedReferrals: (userId) => countQualifiedReferralsOn(tx, userId),
      };
      return fn(ops);
    });
  }

  getProgress(userId: string): Promise<AcademyProgressRow | null> {
    return getProgressOn(this.db, userId);
  }

  listCertificates(userId: string): Promise<AcademyCertRow[]> {
    return listCertificatesOn(this.db, userId);
  }

  getCertificateByCode(code: string): Promise<AcademyCertRow | null> {
    return getCertificateByCodeOn(this.db, code);
  }

  countQualifiedReferrals(userId: string): Promise<number> {
    return countQualifiedReferralsOn(this.db, userId);
  }

  leaderboard(limit: number): Promise<AcademyLeaderboardRow[]> {
    return this.db
      .select({
        displayName: academyProgress.displayName,
        xp: academyProgress.xp,
        streakDays: academyProgress.streakDays,
      })
      .from(academyProgress)
      .orderBy(desc(academyProgress.xp), asc(academyProgress.updatedAt))
      .limit(limit);
  }

  listActiveBetween(minDate: string, maxDate: string): Promise<AcademyProgressRow[]> {
    return this.db
      .select(PROGRESS_COLUMNS)
      .from(academyProgress)
      .where(and(gte(academyProgress.lastActiveDate, minDate), lte(academyProgress.lastActiveDate, maxDate)));
  }

  listActiveOnOrBefore(maxDate: string): Promise<AcademyProgressRow[]> {
    return this.db
      .select(PROGRESS_COLUMNS)
      .from(academyProgress)
      .where(lte(academyProgress.lastActiveDate, maxDate));
  }
}
