import { eq, sql } from "drizzle-orm";
import type { TraderProfile } from "@heropips/contracts";
import type { Db } from "../db/client";
import { outbox, earlyAccessEntries, earlyAccessVerifications } from "../db/schema";

export interface EarlyAccessEntryRow {
  id: string;
  email: string;
  code: string;
  referredBy: string | null;
  basePosition: number;
}

export interface NewEarlyAccessEntry {
  email: string;
  code: string;
  referredBy: string | null;
  basePosition: number;
  utm: Record<string, string> | null;
  profile: TraderProfile | null;
  /** Every entry is created by a successful code check — never null. */
  verifiedAt: Date;
}

/** A pending email verification: one row per address, replaced on resend. */
export interface EarlyAccessVerificationRow {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  sends: number;
  lastSentAt: Date;
}

export interface IssueVerification {
  email: string;
  codeHash: string;
  expiresAt: Date;
  sentAt: Date;
}

/** Operations available inside the serialized join transaction. */
export interface EarlyAccessTxOps {
  findByEmail(email: string): Promise<EarlyAccessEntryRow | null>;
  findByCode(code: string): Promise<EarlyAccessEntryRow | null>;
  countEntries(): Promise<number>;
  countReferrals(entryId: string): Promise<number>;
  insertEntry(input: NewEarlyAccessEntry): Promise<EarlyAccessEntryRow>;
  /** Replaces the stored trader profile on an existing entry. */
  updateProfile(entryId: string, profile: TraderProfile): Promise<void>;
  insertOutbox(topic: string, payload: unknown): Promise<void>;
}

/** DI seam: EarlyAccessService depends on this, tests inject an in-memory impl. */
export interface EarlyAccessRepo {
  /** Runs fn atomically; the pg impl holds pg_advisory_xact_lock(42) for the duration. */
  joinTx<T>(fn: (ops: EarlyAccessTxOps) => Promise<T>): Promise<T>;
  findByEmail(email: string): Promise<EarlyAccessEntryRow | null>;
  countEntries(): Promise<number>;
  countReferrals(entryId: string): Promise<number>;
  /** Entries created at or after `since` — powers the public queue counters. */
  countEntriesSince(since: Date): Promise<number>;

  findVerification(email: string): Promise<EarlyAccessVerificationRow | null>;
  /** Upsert: a resend replaces the code, resets attempts and counts the send. */
  issueVerification(input: IssueVerification): Promise<EarlyAccessVerificationRow>;
  /** Returns the attempt count after the increment. */
  bumpVerificationAttempts(email: string): Promise<number>;
  clearVerification(email: string): Promise<void>;
}

export const EARLY_ACCESS_REPO = Symbol("EARLY_ACCESS_REPO");

/* ---------- drizzle/pg implementation ---------- */

type Executor = Pick<Db, "select" | "insert" | "execute">;

const ENTRY_COLUMNS = {
  id: earlyAccessEntries.id,
  email: earlyAccessEntries.email,
  code: earlyAccessEntries.code,
  referredBy: earlyAccessEntries.referredBy,
  basePosition: earlyAccessEntries.basePosition,
} as const;

async function findByEmailOn(ex: Executor, email: string): Promise<EarlyAccessEntryRow | null> {
  const rows = await ex
    .select(ENTRY_COLUMNS)
    .from(earlyAccessEntries)
    .where(sql`lower(${earlyAccessEntries.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

async function countEntriesOn(ex: Executor): Promise<number> {
  const rows = await ex.select({ n: sql<number>`count(*)::int` }).from(earlyAccessEntries);
  return rows[0]?.n ?? 0;
}

async function countReferralsOn(ex: Executor, entryId: string): Promise<number> {
  const rows = await ex
    .select({ n: sql<number>`count(*)::int` })
    .from(earlyAccessEntries)
    .where(eq(earlyAccessEntries.referredBy, entryId));
  return rows[0]?.n ?? 0;
}

export class DrizzleEarlyAccessRepo implements EarlyAccessRepo {
  constructor(private readonly db: Db) {}

  joinTx<T>(fn: (ops: EarlyAccessTxOps) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(42)`);
      const ops: EarlyAccessTxOps = {
        findByEmail: (email) => findByEmailOn(tx, email),
        findByCode: async (code) => {
          const rows = await tx
            .select(ENTRY_COLUMNS)
            .from(earlyAccessEntries)
            .where(sql`upper(${earlyAccessEntries.code}) = ${code.toUpperCase()}`)
            .limit(1);
          return rows[0] ?? null;
        },
        countEntries: () => countEntriesOn(tx),
        countReferrals: (entryId) => countReferralsOn(tx, entryId),
        insertEntry: async (input) => {
          const rows = await tx
            .insert(earlyAccessEntries)
            .values({
              email: input.email,
              code: input.code,
              referredBy: input.referredBy,
              basePosition: input.basePosition,
              utm: input.utm ?? undefined,
              profile: input.profile ?? undefined,
              verifiedAt: input.verifiedAt,
            })
            .returning(ENTRY_COLUMNS);
          return rows[0];
        },
        updateProfile: async (entryId, profile) => {
          await tx
            .update(earlyAccessEntries)
            .set({ profile })
            .where(eq(earlyAccessEntries.id, entryId));
        },
        insertOutbox: async (topic, payload) => {
          await tx.insert(outbox).values({ topic, payload });
        },
      };
      return fn(ops);
    });
  }

  findByEmail(email: string): Promise<EarlyAccessEntryRow | null> {
    return findByEmailOn(this.db, email);
  }

  countEntries(): Promise<number> {
    return countEntriesOn(this.db);
  }

  countReferrals(entryId: string): Promise<number> {
    return countReferralsOn(this.db, entryId);
  }

  async countEntriesSince(since: Date): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(earlyAccessEntries)
      .where(sql`${earlyAccessEntries.createdAt} >= ${since.toISOString()}`);
    return rows[0]?.n ?? 0;
  }

  async findVerification(email: string): Promise<EarlyAccessVerificationRow | null> {
    const rows = await this.db
      .select()
      .from(earlyAccessVerifications)
      .where(eq(earlyAccessVerifications.email, email.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  }

  async issueVerification(input: IssueVerification): Promise<EarlyAccessVerificationRow> {
    const rows = await this.db
      .insert(earlyAccessVerifications)
      .values({
        email: input.email.toLowerCase(),
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        attempts: 0,
        sends: 1,
        lastSentAt: input.sentAt,
      })
      .onConflictDoUpdate({
        target: earlyAccessVerifications.email,
        set: {
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
          attempts: 0,
          sends: sql`${earlyAccessVerifications.sends} + 1`,
          lastSentAt: input.sentAt,
        },
      })
      .returning();
    return rows[0];
  }

  async bumpVerificationAttempts(email: string): Promise<number> {
    const rows = await this.db
      .update(earlyAccessVerifications)
      .set({ attempts: sql`${earlyAccessVerifications.attempts} + 1` })
      .where(eq(earlyAccessVerifications.email, email.toLowerCase()))
      .returning({ attempts: earlyAccessVerifications.attempts });
    return rows[0]?.attempts ?? 0;
  }

  async clearVerification(email: string): Promise<void> {
    await this.db
      .delete(earlyAccessVerifications)
      .where(eq(earlyAccessVerifications.email, email.toLowerCase()));
  }
}
