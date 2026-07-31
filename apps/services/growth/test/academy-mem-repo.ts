import type { AcademyCertTrack, EventEnvelope } from "@heropips/contracts";
import {
  QUALIFIED_REFERRAL_SLUGS,
  type AcademyCertRow,
  type AcademyLeaderboardRow,
  type AcademyNudgeCadence,
  type AcademyProgressRow,
  type AcademyRepo,
  type AcademyTxOps,
  type NewAcademyCertRow,
  type NewAcademyProgressRow,
} from "../src/academy/academy.repo";

/** In-memory AcademyRepo — same semantics as the pg impl, minus transactions. */
export class MemAcademyRepo implements AcademyRepo, AcademyTxOps {
  rows = new Map<string, AcademyProgressRow>();
  certs: AcademyCertRow[] = [];
  nudges: Array<{ userId: string; cadence: AcademyNudgeCadence; sentOn: string }> = [];
  outbox: Array<{ topic: string; payload: EventEnvelope }> = [];

  async tx<T>(fn: (ops: AcademyTxOps) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async getProgress(userId: string): Promise<AcademyProgressRow | null> {
    const row = this.rows.get(userId);
    return row ? structuredClone(row) : null;
  }

  async getProgressForUpdate(userId: string): Promise<AcademyProgressRow | null> {
    return this.getProgress(userId);
  }

  async insertProgress(row: NewAcademyProgressRow): Promise<AcademyProgressRow> {
    if (this.rows.has(row.userId)) throw new Error(`duplicate academy_progress pk: ${row.userId}`);
    const full: AcademyProgressRow = {
      ...row,
      xp: 0,
      streakDays: 0,
      streakBest: 0,
      lastActiveDate: null,
      spinLastDate: null,
      referredBy: null,
      completions: {},
      games: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(row.userId, full);
    return structuredClone(full);
  }

  async saveProgress(row: AcademyProgressRow): Promise<AcademyProgressRow> {
    if (!this.rows.has(row.userId)) throw new Error(`academy_progress row missing: ${row.userId}`);
    const saved = { ...structuredClone(row), updatedAt: new Date() };
    this.rows.set(row.userId, saved);
    return structuredClone(saved);
  }

  async findByReferralCode(code: string): Promise<AcademyProgressRow | null> {
    for (const row of this.rows.values()) {
      if (row.referralCode === code) return structuredClone(row);
    }
    return null;
  }

  async listCertificates(userId: string): Promise<AcademyCertRow[]> {
    return this.certs.filter((c) => c.userId === userId).map((c) => structuredClone(c));
  }

  async getCertificate(userId: string, track: AcademyCertTrack): Promise<AcademyCertRow | null> {
    const cert = this.certs.find((c) => c.userId === userId && c.track === track);
    return cert ? structuredClone(cert) : null;
  }

  async getCertificateByCode(code: string): Promise<AcademyCertRow | null> {
    const cert = this.certs.find((c) => c.code === code);
    return cert ? structuredClone(cert) : null;
  }

  async insertCertificate(row: NewAcademyCertRow): Promise<AcademyCertRow> {
    if (this.certs.some((c) => c.userId === row.userId && c.track === row.track)) {
      throw new Error("duplicate certificate (user_id, track)");
    }
    const cert: AcademyCertRow = { ...row, issuedAt: new Date() };
    this.certs.push(cert);
    return structuredClone(cert);
  }

  async lastNudgeOn(userId: string, cadence: AcademyNudgeCadence): Promise<string | null> {
    let last: string | null = null;
    for (const n of this.nudges) {
      if (n.userId !== userId || n.cadence !== cadence) continue;
      if (last === null || n.sentOn > last) last = n.sentOn;
    }
    return last;
  }

  async insertNudge(userId: string, cadence: AcademyNudgeCadence, sentOn: string): Promise<boolean> {
    if (this.nudges.some((n) => n.userId === userId && n.cadence === cadence && n.sentOn === sentOn)) {
      return false;
    }
    this.nudges.push({ userId, cadence, sentOn });
    return true;
  }

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    this.outbox.push({ topic, payload: payload as EventEnvelope });
  }

  async countQualifiedReferrals(userId: string): Promise<number> {
    let count = 0;
    for (const row of this.rows.values()) {
      if (row.referredBy !== userId) continue;
      if (QUALIFIED_REFERRAL_SLUGS.every((slug) => row.completions[slug])) count += 1;
    }
    return count;
  }

  async leaderboard(limit: number): Promise<AcademyLeaderboardRow[]> {
    return [...this.rows.values()]
      .sort((a, b) => b.xp - a.xp || a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit)
      .map((r) => ({ displayName: r.displayName, xp: r.xp, streakDays: r.streakDays }));
  }

  async listActiveBetween(minDate: string, maxDate: string): Promise<AcademyProgressRow[]> {
    return [...this.rows.values()]
      .filter((r) => r.lastActiveDate !== null && r.lastActiveDate >= minDate && r.lastActiveDate <= maxDate)
      .map((r) => structuredClone(r));
  }

  async listActiveOnOrBefore(maxDate: string): Promise<AcademyProgressRow[]> {
    return [...this.rows.values()]
      .filter((r) => r.lastActiveDate !== null && r.lastActiveDate <= maxDate)
      .map((r) => structuredClone(r));
  }

  /** Test helper: outbox event types in insertion order. */
  eventTypes(): string[] {
    return this.outbox.map((r) => r.payload.type);
  }

  /** Test helper: seed a full progress row (defaults + patch). */
  seed(userId: string, patch: Partial<AcademyProgressRow> = {}): AcademyProgressRow {
    const row: AcademyProgressRow = {
      userId,
      email: `${userId}@example.com`,
      displayName: userId,
      xp: 0,
      streakDays: 0,
      streakBest: 0,
      lastActiveDate: null,
      spinLastDate: null,
      referralCode: `code-${userId}`,
      referredBy: null,
      completions: {},
      games: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...patch,
    };
    this.rows.set(userId, row);
    return row;
  }
}
