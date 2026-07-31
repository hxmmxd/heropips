import type { EventEnvelope } from "@heropips/contracts";
import type { Cursor } from "../src/common/cursor";
import type {
  AuditRow,
  ChatRow,
  IdentityRepo,
  NewChatMessage,
  NewSession,
  NewUser,
  OutboxInsert,
  OutboxRow,
  SessionRow,
  UserRow,
} from "../src/db/repo";

function keysetBefore(row: { createdAt: Date; id: string }, before: Cursor | null): boolean {
  if (!before) return true;
  if (row.createdAt.getTime() !== before.createdAt.getTime()) {
    return row.createdAt.getTime() < before.createdAt.getTime();
  }
  return row.id < before.id;
}

function newestFirst(a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }): number {
  const dt = b.createdAt.getTime() - a.createdAt.getTime();
  return dt !== 0 ? dt : b.id < a.id ? -1 : 1;
}

/** In-memory IdentityRepo with the same guards as the Pg implementation. */
export class MemRepo implements IdentityRepo {
  users: UserRow[] = [];
  sessions: SessionRow[] = [];
  auditRows: AuditRow[] = [];
  chatRows: NewChatMessage[] = [];
  outboxRows: Array<{ id: string; topic: string; payload: EventEnvelope; sentAt: Date | null }> = [];

  async createUser(user: NewUser): Promise<"created" | "duplicate_email"> {
    if (this.users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
      return "duplicate_email";
    }
    this.users.push({ ...user });
    return "created";
  }

  async getUserByEmail(email: string): Promise<UserRow | null> {
    const row = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return row ? { ...row } : null;
  }

  async getUserById(id: string): Promise<UserRow | null> {
    const row = this.users.find((u) => u.id === id);
    return row ? { ...row } : null;
  }

  async setDisplayName(userId: string, displayName: string): Promise<void> {
    const row = this.users.find((u) => u.id === userId);
    if (row) row.displayName = displayName;
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const row = this.users.find((u) => u.id === userId);
    if (row) row.passwordHash = passwordHash;
  }

  async createSession(session: NewSession): Promise<void> {
    this.sessions.push({ ...session, revokedAt: null });
  }

  async getSessionWithUser(
    tokenSha256: string,
  ): Promise<{ session: SessionRow; user: UserRow } | null> {
    const session = this.sessions.find((s) => s.tokenSha256 === tokenSha256);
    if (!session) return null;
    const user = this.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { session: { ...session }, user: { ...user } };
  }

  async touchSession(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void> {
    const session = this.sessions.find((s) => s.id === id);
    if (session) {
      session.lastSeenAt = lastSeenAt;
      session.expiresAt = expiresAt;
    }
  }

  async listSessions(userId: string, now: Date): Promise<SessionRow[]> {
    return this.sessions
      .filter((s) => s.userId === userId && s.revokedAt === null && s.expiresAt > now)
      .sort(newestFirst)
      .map((s) => ({ ...s }));
  }

  async revokeSession(id: string, userId: string, at: Date): Promise<boolean> {
    const session = this.sessions.find(
      (s) => s.id === id && s.userId === userId && s.revokedAt === null,
    );
    if (!session) return false;
    session.revokedAt = at;
    return true;
  }

  async revokeOtherSessions(userId: string, keepSessionId: string, at: Date): Promise<number> {
    let count = 0;
    for (const session of this.sessions) {
      if (session.userId === userId && session.id !== keepSessionId && session.revokedAt === null) {
        session.revokedAt = at;
        count += 1;
      }
    }
    return count;
  }

  async insertAudit(row: AuditRow, events: OutboxInsert[] = []): Promise<void> {
    this.auditRows.push({ ...row });
    for (const e of events) {
      this.outboxRows.push({ id: e.envelope.event_id, topic: e.topic, payload: e.envelope, sentAt: null });
    }
  }

  async listAudit(actorId: string, limit: number, before: Cursor | null): Promise<AuditRow[]> {
    return this.auditRows
      .filter((r) => r.actorId === actorId && keysetBefore(r, before))
      .sort(newestFirst)
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  async insertChatMessage(message: NewChatMessage): Promise<void> {
    this.chatRows.push({ ...message });
  }

  async listChatMessages(limit: number, before: Cursor | null): Promise<ChatRow[]> {
    return this.chatRows
      .filter((r) => keysetBefore(r, before))
      .sort(newestFirst)
      .slice(0, limit)
      .map((r) => {
        const user = this.users.find((u) => u.id === r.userId);
        return {
          id: r.id,
          userId: r.userId,
          displayName: user?.displayName ?? "?",
          body: r.body,
          createdAt: r.createdAt,
        };
      });
  }

  async fetchUnsentOutbox(limit: number): Promise<OutboxRow[]> {
    return this.outboxRows
      .filter((r) => r.sentAt === null)
      .slice(0, limit)
      .map((r) => ({ id: r.id, topic: r.topic, payload: r.payload }));
  }

  async markOutboxSent(ids: string[]): Promise<void> {
    for (const row of this.outboxRows) {
      if (ids.includes(row.id)) row.sentAt = new Date();
    }
  }

  /** Test helper: audit actions in insertion order. */
  auditActions(): string[] {
    return this.auditRows.map((r) => r.action);
  }
}
