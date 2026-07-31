import { and, asc, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  academyProgress,
  earlyAccessEntries,
  msgContacts,
  msgJourneys,
  msgSends,
  msgSignalWeeks,
  msgSuppressions,
} from "../db/schema";
import type { JourneyKey } from "./journeys";

/* ---------- row shapes ---------- */

export type ContactRow = {
  email: string;
  userId: string | null;
  displayName: string | null;
  source: string;
  founding: boolean;
  packageSku: string | null;
  earlyAccessEntryId: string | null;
  registeredAt: Date | null;
  purchasedAt: Date | null;
  firstTradeAt: Date | null;
  lastLessonAt: Date | null;
};

/** Merge-patch: undefined = keep existing; null is never written over data. */
export type ContactUpsert = {
  email: string;
  source: string;
  userId?: string;
  displayName?: string;
  founding?: boolean;
  packageSku?: string;
  earlyAccessEntryId?: string;
  registeredAt?: Date;
  purchasedAt?: Date;
  firstTradeAt?: Date;
  lastLessonAt?: Date;
};

export type JourneyRow = {
  id: string;
  email: string;
  journey: JourneyKey;
  step: number;
  status: "active" | "completed" | "cancelled";
  context: Record<string, unknown>;
  startedAt: Date;
  nextRunAt: Date | null;
};

export type SendStatus = "queued" | "sent" | "failed" | "suppressed" | "capped";

export type NewSend = {
  email: string;
  template: string;
  category: "transactional" | "lifecycle";
  dedupeKey: string;
};

export type SendRow = {
  id: string;
  email: string;
  template: string;
  category: string;
  status: SendStatus;
  openedAt: Date | null;
  clickedAt: Date | null;
};

export type SignalWeekRow = { week: string; generated: number; targetHit: number; stopped: number };

export type EarlyAccessLookup = {
  id: string;
  email: string;
  code: string;
  basePosition: number;
  referredBy: string | null;
};

/* ---------- DI seam: service depends on this; tests inject in-memory ---------- */

export interface MessagingRepo {
  /* contacts */
  upsertContact(patch: ContactUpsert): Promise<ContactRow>;
  findContactByEmail(email: string): Promise<ContactRow | null>;
  findContactByUserId(userId: string): Promise<ContactRow | null>;

  /* suppression (lifecycle lane only) */
  isSuppressed(email: string): Promise<boolean>;
  suppress(email: string, reason: string): Promise<void>;

  /* journeys */
  startJourney(
    email: string,
    journey: JourneyKey,
    startedAt: Date,
    nextRunAt: Date,
    context: Record<string, unknown>,
  ): Promise<boolean>; // false = already exists (idempotent)
  cancelJourneys(email: string, journeys: readonly JourneyKey[]): Promise<number>;
  dueJourneys(now: Date, limit: number): Promise<JourneyRow[]>;
  advanceJourney(
    id: string,
    step: number,
    nextRunAt: Date | null,
    status: "active" | "completed",
  ): Promise<void>;

  /* send ledger */
  insertSend(row: NewSend): Promise<string | null>; // null = dedupe hit
  markSend(
    id: string,
    patch: { status: SendStatus; subject?: string; providerId?: string | null; error?: string | null; sentAt?: Date },
  ): Promise<void>;
  recordOpen(id: string, at: Date): Promise<SendRow | null>;
  recordClick(id: string, at: Date): Promise<SendRow | null>;
  /** Latest lifecycle send (sent status) for the frequency cap. */
  lastLifecycleSendAt(email: string): Promise<Date | null>;

  /* weekly signal digest */
  bumpSignalWeek(week: string, field: "generated" | "target_hit" | "stopped"): Promise<void>;
  getSignalWeek(week: string): Promise<SignalWeekRow | null>;
  /** Non-suppressed contacts, stable order, keyset by email. */
  listAudience(afterEmail: string | null, limit: number): Promise<ContactRow[]>;

  /* enrichment lookups (same database, other modules' tables — read-only) */
  findEarlyAccessEntry(id: string): Promise<EarlyAccessLookup | null>;
  countEarlyAccessEntries(): Promise<number>;
  countVerifiedReferrals(entryId: string): Promise<number>;
  findAcademyIdentity(userId: string): Promise<{ email: string; displayName: string; xp: number } | null>;
  anyLessonComplete(userId: string): Promise<boolean>;
}

export const MESSAGING_REPO = Symbol("MESSAGING_REPO");

/* ---------- drizzle/pg implementation ---------- */

const CONTACT_COLUMNS = {
  email: msgContacts.email,
  userId: msgContacts.userId,
  displayName: msgContacts.displayName,
  source: msgContacts.source,
  founding: msgContacts.founding,
  packageSku: msgContacts.packageSku,
  earlyAccessEntryId: msgContacts.earlyAccessEntryId,
  registeredAt: msgContacts.registeredAt,
  purchasedAt: msgContacts.purchasedAt,
  firstTradeAt: msgContacts.firstTradeAt,
  lastLessonAt: msgContacts.lastLessonAt,
} as const;

export class DrizzleMessagingRepo implements MessagingRepo {
  constructor(private readonly db: Db) {}

  async upsertContact(patch: ContactUpsert): Promise<ContactRow> {
    const email = patch.email.toLowerCase();
    const insert = {
      email,
      source: patch.source,
      userId: patch.userId ?? null,
      displayName: patch.displayName ?? null,
      founding: patch.founding ?? false,
      packageSku: patch.packageSku ?? null,
      earlyAccessEntryId: patch.earlyAccessEntryId ?? null,
      registeredAt: patch.registeredAt ?? null,
      purchasedAt: patch.purchasedAt ?? null,
      firstTradeAt: patch.firstTradeAt ?? null,
      lastLessonAt: patch.lastLessonAt ?? null,
    };
    const [row] = await this.db
      .insert(msgContacts)
      .values(insert)
      .onConflictDoUpdate({
        target: msgContacts.email,
        set: {
          // COALESCE(new, old): a later event never erases known facts.
          userId: sql`COALESCE(excluded.user_id, ${msgContacts.userId})`,
          displayName: sql`COALESCE(excluded.display_name, ${msgContacts.displayName})`,
          founding: sql`(excluded.founding OR ${msgContacts.founding})`,
          packageSku: sql`COALESCE(excluded.package_sku, ${msgContacts.packageSku})`,
          earlyAccessEntryId: sql`COALESCE(excluded.early_access_entry_id, ${msgContacts.earlyAccessEntryId})`,
          registeredAt: sql`COALESCE(${msgContacts.registeredAt}, excluded.registered_at)`,
          purchasedAt: sql`COALESCE(${msgContacts.purchasedAt}, excluded.purchased_at)`,
          firstTradeAt: sql`COALESCE(${msgContacts.firstTradeAt}, excluded.first_trade_at)`,
          lastLessonAt: sql`COALESCE(excluded.last_lesson_at, ${msgContacts.lastLessonAt})`,
          updatedAt: sql`now()`,
        },
      })
      .returning(CONTACT_COLUMNS);
    return row as ContactRow;
  }

  async findContactByEmail(email: string): Promise<ContactRow | null> {
    const [row] = await this.db
      .select(CONTACT_COLUMNS)
      .from(msgContacts)
      .where(eq(msgContacts.email, email.toLowerCase()));
    return (row as ContactRow | undefined) ?? null;
  }

  async findContactByUserId(userId: string): Promise<ContactRow | null> {
    const [row] = await this.db
      .select(CONTACT_COLUMNS)
      .from(msgContacts)
      .where(eq(msgContacts.userId, userId))
      .limit(1);
    return (row as ContactRow | undefined) ?? null;
  }

  async isSuppressed(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ email: msgSuppressions.email })
      .from(msgSuppressions)
      .where(eq(msgSuppressions.email, email.toLowerCase()));
    return row !== undefined;
  }

  async suppress(email: string, reason: string): Promise<void> {
    await this.db
      .insert(msgSuppressions)
      .values({ email: email.toLowerCase(), reason })
      .onConflictDoNothing({ target: msgSuppressions.email });
  }

  async startJourney(
    email: string,
    journey: JourneyKey,
    startedAt: Date,
    nextRunAt: Date,
    context: Record<string, unknown>,
  ): Promise<boolean> {
    const inserted = await this.db
      .insert(msgJourneys)
      .values({ email: email.toLowerCase(), journey, startedAt, nextRunAt, context })
      .onConflictDoNothing()
      .returning({ id: msgJourneys.id });
    return inserted.length > 0;
  }

  async cancelJourneys(email: string, journeys: readonly JourneyKey[]): Promise<number> {
    if (journeys.length === 0) return 0;
    const rows = await this.db
      .update(msgJourneys)
      .set({ status: "cancelled", nextRunAt: null })
      .where(
        and(
          eq(msgJourneys.email, email.toLowerCase()),
          eq(msgJourneys.status, "active"),
          inArray(msgJourneys.journey, journeys as JourneyKey[]),
        ),
      )
      .returning({ id: msgJourneys.id });
    return rows.length;
  }

  async dueJourneys(now: Date, limit: number): Promise<JourneyRow[]> {
    const rows = await this.db
      .select()
      .from(msgJourneys)
      .where(and(eq(msgJourneys.status, "active"), lte(msgJourneys.nextRunAt, now)))
      .orderBy(asc(msgJourneys.nextRunAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      journey: r.journey as JourneyKey,
      step: r.step,
      status: r.status as JourneyRow["status"],
      context: r.context,
      startedAt: r.startedAt,
      nextRunAt: r.nextRunAt,
    }));
  }

  async advanceJourney(
    id: string,
    step: number,
    nextRunAt: Date | null,
    status: "active" | "completed",
  ): Promise<void> {
    await this.db.update(msgJourneys).set({ step, nextRunAt, status }).where(eq(msgJourneys.id, id));
  }

  async insertSend(row: NewSend): Promise<string | null> {
    const inserted = await this.db
      .insert(msgSends)
      .values({ ...row, email: row.email.toLowerCase() })
      .onConflictDoNothing()
      .returning({ id: msgSends.id });
    return inserted[0]?.id ?? null;
  }

  async markSend(
    id: string,
    patch: { status: SendStatus; subject?: string; providerId?: string | null; error?: string | null; sentAt?: Date },
  ): Promise<void> {
    await this.db
      .update(msgSends)
      .set({
        status: patch.status,
        ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
        ...(patch.providerId !== undefined ? { providerId: patch.providerId } : {}),
        ...(patch.error !== undefined ? { error: patch.error } : {}),
        ...(patch.sentAt !== undefined ? { sentAt: patch.sentAt } : {}),
      })
      .where(eq(msgSends.id, id));
  }

  private static sendRow(r: typeof msgSends.$inferSelect): SendRow {
    return {
      id: r.id,
      email: r.email,
      template: r.template,
      category: r.category,
      status: r.status as SendStatus,
      openedAt: r.openedAt,
      clickedAt: r.clickedAt,
    };
  }

  async recordOpen(id: string, at: Date): Promise<SendRow | null> {
    const [row] = await this.db
      .update(msgSends)
      .set({ openedAt: sql`COALESCE(${msgSends.openedAt}, ${at})` })
      .where(eq(msgSends.id, id))
      .returning();
    return row ? DrizzleMessagingRepo.sendRow(row) : null;
  }

  async recordClick(id: string, at: Date): Promise<SendRow | null> {
    const [row] = await this.db
      .update(msgSends)
      .set({
        clickedAt: sql`COALESCE(${msgSends.clickedAt}, ${at})`,
        openedAt: sql`COALESCE(${msgSends.openedAt}, ${at})`, // a click implies an open
      })
      .where(eq(msgSends.id, id))
      .returning();
    return row ? DrizzleMessagingRepo.sendRow(row) : null;
  }

  async lastLifecycleSendAt(email: string): Promise<Date | null> {
    const [row] = await this.db
      .select({ sentAt: msgSends.sentAt })
      .from(msgSends)
      .where(
        and(
          eq(msgSends.email, email.toLowerCase()),
          eq(msgSends.category, "lifecycle"),
          eq(msgSends.status, "sent"),
        ),
      )
      .orderBy(desc(msgSends.sentAt))
      .limit(1);
    return row?.sentAt ?? null;
  }

  async bumpSignalWeek(week: string, field: "generated" | "target_hit" | "stopped"): Promise<void> {
    const col =
      field === "generated"
        ? msgSignalWeeks.generated
        : field === "target_hit"
          ? msgSignalWeeks.targetHit
          : msgSignalWeeks.stopped;
    await this.db
      .insert(msgSignalWeeks)
      .values({
        week,
        generated: field === "generated" ? 1 : 0,
        targetHit: field === "target_hit" ? 1 : 0,
        stopped: field === "stopped" ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: msgSignalWeeks.week,
        set: { [field === "generated" ? "generated" : field === "target_hit" ? "targetHit" : "stopped"]: sql`${col} + 1`, updatedAt: sql`now()` },
      });
  }

  async getSignalWeek(week: string): Promise<SignalWeekRow | null> {
    const [row] = await this.db.select().from(msgSignalWeeks).where(eq(msgSignalWeeks.week, week));
    return row ? { week: row.week, generated: row.generated, targetHit: row.targetHit, stopped: row.stopped } : null;
  }

  async listAudience(afterEmail: string | null, limit: number): Promise<ContactRow[]> {
    const notSuppressed = isNull(msgSuppressions.email);
    const rows = await this.db
      .select(CONTACT_COLUMNS)
      .from(msgContacts)
      .leftJoin(msgSuppressions, eq(msgSuppressions.email, msgContacts.email))
      .where(afterEmail ? and(notSuppressed, gt(msgContacts.email, afterEmail)) : notSuppressed)
      .orderBy(asc(msgContacts.email))
      .limit(limit);
    return rows as unknown as ContactRow[];
  }

  async findEarlyAccessEntry(id: string): Promise<EarlyAccessLookup | null> {
    const [row] = await this.db
      .select({
        id: earlyAccessEntries.id,
        email: earlyAccessEntries.email,
        code: earlyAccessEntries.code,
        basePosition: earlyAccessEntries.basePosition,
        referredBy: earlyAccessEntries.referredBy,
      })
      .from(earlyAccessEntries)
      .where(eq(earlyAccessEntries.id, id));
    return row ?? null;
  }

  async countEarlyAccessEntries(): Promise<number> {
    const [row] = await this.db.select({ n: sql<number>`count(*)::int` }).from(earlyAccessEntries);
    return row?.n ?? 0;
  }

  async countVerifiedReferrals(entryId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(earlyAccessEntries)
      .where(eq(earlyAccessEntries.referredBy, entryId));
    return row?.n ?? 0;
  }

  async findAcademyIdentity(
    userId: string,
  ): Promise<{ email: string; displayName: string; xp: number } | null> {
    const [row] = await this.db
      .select({
        email: academyProgress.email,
        displayName: academyProgress.displayName,
        xp: academyProgress.xp,
      })
      .from(academyProgress)
      .where(eq(academyProgress.userId, userId));
    return row ?? null;
  }

  async anyLessonComplete(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ n: sql<number>`(SELECT count(*) FROM jsonb_object_keys(${academyProgress.completions}))::int` })
      .from(academyProgress)
      .where(eq(academyProgress.userId, userId));
    return (row?.n ?? 0) > 0;
  }
}
