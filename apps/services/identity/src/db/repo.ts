import { and, asc, desc, eq, gt, isNull, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { EventEnvelope } from "@heropips/contracts";
import type { Cursor } from "../common/cursor";
import type { Db } from "./client";
import { auditLog, chatMessages, outbox, sessions, users } from "./schema";

/* ---------- row shapes ---------- */

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: "member" | "admin";
  founding: boolean;
  packageSku: string;
  createdAt: Date;
};

export type NewUser = Omit<UserRow, "createdAt"> & { createdAt: Date };

export type SessionRow = {
  id: string;
  userId: string;
  tokenSha256: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
  revokedAt: Date | null;
};

export type NewSession = Omit<SessionRow, "revokedAt">;

export type AuditRow = {
  id: string;
  actorId: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};

export type ChatRow = {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: Date;
};

export type NewChatMessage = { id: string; userId: string; body: string; createdAt: Date };

export type OutboxInsert = { topic: string; envelope: EventEnvelope };
export type OutboxRow = { id: string; topic: string; payload: EventEnvelope };

/* ---------- repo contract (services depend on this; tests use MemRepo) ---------- */

export interface IdentityRepo {
  /** Insert unless the email is taken (citext unique). */
  createUser(user: NewUser): Promise<"created" | "duplicate_email">;
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(id: string): Promise<UserRow | null>;
  setDisplayName(userId: string, displayName: string): Promise<void>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;

  createSession(session: NewSession): Promise<void>;
  /** Introspect hot path: ONE query, unique index on token_sha256 + PK join. */
  getSessionWithUser(tokenSha256: string): Promise<{ session: SessionRow; user: UserRow } | null>;
  /** Sliding window: bump last_seen and push expiry out. */
  touchSession(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
  /** Live sessions only (unrevoked, unexpired at `now`), newest first. */
  listSessions(userId: string, now: Date): Promise<SessionRow[]>;
  /** Revoke one of the user's own sessions. False = not found / not theirs / already revoked. */
  revokeSession(id: string, userId: string, at: Date): Promise<boolean>;
  /** Revoke every live session of the user except `keepSessionId`. Returns count. */
  revokeOtherSessions(userId: string, keepSessionId: string, at: Date): Promise<number>;

  /** Audit row + outbox events land in one tx. */
  insertAudit(row: AuditRow, events?: OutboxInsert[]): Promise<void>;
  /** Own rows, newest first, keyset on (created_at, id). */
  listAudit(actorId: string, limit: number, before: Cursor | null): Promise<AuditRow[]>;

  insertChatMessage(message: NewChatMessage): Promise<void>;
  /** Newest first, keyset on (created_at, id); display_name joined from users. */
  listChatMessages(limit: number, before: Cursor | null): Promise<ChatRow[]>;

  fetchUnsentOutbox(limit: number): Promise<OutboxRow[]>;
  markOutboxSent(ids: string[]): Promise<void>;
}

/* ---------- Postgres implementation ---------- */

export class PgIdentityRepo implements IdentityRepo {
  constructor(private readonly db: Db) {}

  async createUser(user: NewUser): Promise<"created" | "duplicate_email"> {
    const inserted = await this.db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        role: user.role,
        founding: user.founding,
        packageSku: user.packageSku,
        createdAt: user.createdAt,
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    return inserted.length > 0 ? "created" : "duplicate_email";
  }

  private static userRow(row: typeof users.$inferSelect): UserRow {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      displayName: row.displayName,
      role: row.role as UserRow["role"],
      founding: row.founding,
      packageSku: row.packageSku,
      createdAt: row.createdAt,
    };
  }

  async getUserByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    return row ? PgIdentityRepo.userRow(row) : null;
  }

  async getUserById(id: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row ? PgIdentityRepo.userRow(row) : null;
  }

  async setDisplayName(userId: string, displayName: string): Promise<void> {
    await this.db.update(users).set({ displayName }).where(eq(users.id, userId));
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async createSession(session: NewSession): Promise<void> {
    await this.db.insert(sessions).values(session);
  }

  async getSessionWithUser(
    tokenSha256: string,
  ): Promise<{ session: SessionRow; user: UserRow } | null> {
    const [row] = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenSha256, tokenSha256));
    if (!row) return null;
    return { session: row.session, user: PgIdentityRepo.userRow(row.user) };
  }

  async touchSession(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void> {
    await this.db.update(sessions).set({ lastSeenAt, expiresAt }).where(eq(sessions.id, id));
  }

  async listSessions(userId: string, now: Date): Promise<SessionRow[]> {
    return this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
      .orderBy(desc(sessions.createdAt), desc(sessions.id));
  }

  async revokeSession(id: string, userId: string, at: Date): Promise<boolean> {
    const updated = await this.db
      .update(sessions)
      .set({ revokedAt: at })
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return updated.length > 0;
  }

  async revokeOtherSessions(userId: string, keepSessionId: string, at: Date): Promise<number> {
    const updated = await this.db
      .update(sessions)
      .set({ revokedAt: at })
      .where(
        and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId), isNull(sessions.revokedAt)),
      )
      .returning({ id: sessions.id });
    return updated.length;
  }

  async insertAudit(row: AuditRow, events: OutboxInsert[] = []): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(auditLog).values(row);
      if (events.length > 0) {
        await tx.insert(outbox).values(
          events.map((e) => ({ id: e.envelope.event_id, topic: e.topic, payload: e.envelope })),
        );
      }
    });
  }

  async listAudit(actorId: string, limit: number, before: Cursor | null): Promise<AuditRow[]> {
    const cursorCond = before
      ? or(
          lt(auditLog.createdAt, before.createdAt),
          and(eq(auditLog.createdAt, before.createdAt), lt(auditLog.id, before.id)),
        )
      : undefined;
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(cursorCond ? and(eq(auditLog.actorId, actorId), cursorCond) : eq(auditLog.actorId, actorId))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      action: r.action,
      target: r.target,
      meta: r.meta as Record<string, unknown> | null,
      createdAt: r.createdAt,
    }));
  }

  async insertChatMessage(message: NewChatMessage): Promise<void> {
    await this.db.insert(chatMessages).values(message);
  }

  async listChatMessages(limit: number, before: Cursor | null): Promise<ChatRow[]> {
    const cursorCond = before
      ? or(
          lt(chatMessages.createdAt, before.createdAt),
          and(eq(chatMessages.createdAt, before.createdAt), lt(chatMessages.id, before.id)),
        )
      : sql`true`;
    const rows = await this.db
      .select({
        id: chatMessages.id,
        userId: chatMessages.userId,
        displayName: users.displayName,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.userId))
      .where(cursorCond)
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
      .limit(limit);
    return rows;
  }

  async fetchUnsentOutbox(limit: number): Promise<OutboxRow[]> {
    const rows = await this.db
      .select({ id: outbox.id, topic: outbox.topic, payload: outbox.payload })
      .from(outbox)
      .where(isNull(outbox.sentAt))
      .orderBy(asc(outbox.createdAt))
      .limit(limit);
    return rows.map((r) => ({ id: r.id, topic: r.topic, payload: r.payload as EventEnvelope }));
  }

  async markOutboxSent(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.update(outbox).set({ sentAt: new Date() }).where(inArray(outbox.id, ids));
  }
}
