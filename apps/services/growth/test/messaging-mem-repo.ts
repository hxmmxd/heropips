import type { JourneyKey } from "../src/messaging/journeys";
import type {
  ContactRow,
  ContactUpsert,
  EarlyAccessLookup,
  JourneyRow,
  MessagingRepo,
  NewSend,
  SendRow,
  SendStatus,
  SignalWeekRow,
} from "../src/messaging/messaging.repo";

type MemSend = {
  id: string;
  email: string;
  template: string;
  category: "transactional" | "lifecycle";
  dedupeKey: string;
  subject: string;
  status: SendStatus;
  providerId: string | null;
  error: string | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  sentAt: Date | null;
};

/** In-memory MessagingRepo mirroring the Drizzle implementation's semantics. */
export class MemMessagingRepo implements MessagingRepo {
  contacts = new Map<string, ContactRow>();
  suppressions = new Map<string, string>();
  journeys: Array<JourneyRow & { id: string }> = [];
  sends: MemSend[] = [];
  signalWeeks = new Map<string, SignalWeekRow>();

  entries = new Map<string, EarlyAccessLookup>();
  academy = new Map<string, { email: string; displayName: string; xp: number; lessons: number }>();

  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  /* ---------- contacts ---------- */

  async upsertContact(patch: ContactUpsert): Promise<ContactRow> {
    const email = patch.email.toLowerCase();
    const prev = this.contacts.get(email);
    const row: ContactRow = {
      email,
      userId: patch.userId ?? prev?.userId ?? null,
      displayName: patch.displayName ?? prev?.displayName ?? null,
      source: prev?.source ?? patch.source,
      founding: (patch.founding ?? false) || (prev?.founding ?? false),
      packageSku: patch.packageSku ?? prev?.packageSku ?? null,
      earlyAccessEntryId: patch.earlyAccessEntryId ?? prev?.earlyAccessEntryId ?? null,
      registeredAt: prev?.registeredAt ?? patch.registeredAt ?? null,
      purchasedAt: prev?.purchasedAt ?? patch.purchasedAt ?? null,
      firstTradeAt: prev?.firstTradeAt ?? patch.firstTradeAt ?? null,
      lastLessonAt: patch.lastLessonAt ?? prev?.lastLessonAt ?? null,
    };
    this.contacts.set(email, row);
    return row;
  }

  async findContactByEmail(email: string): Promise<ContactRow | null> {
    return this.contacts.get(email.toLowerCase()) ?? null;
  }

  async findContactByUserId(userId: string): Promise<ContactRow | null> {
    for (const c of this.contacts.values()) if (c.userId === userId) return c;
    return null;
  }

  /* ---------- suppression ---------- */

  async isSuppressed(email: string): Promise<boolean> {
    return this.suppressions.has(email.toLowerCase());
  }

  async suppress(email: string, reason: string): Promise<void> {
    const key = email.toLowerCase();
    if (!this.suppressions.has(key)) this.suppressions.set(key, reason);
  }

  /* ---------- journeys ---------- */

  async startJourney(
    email: string,
    journey: JourneyKey,
    startedAt: Date,
    nextRunAt: Date,
    context: Record<string, unknown>,
  ): Promise<boolean> {
    const key = email.toLowerCase();
    if (this.journeys.some((j) => j.email === key && j.journey === journey)) return false;
    this.journeys.push({
      id: this.nextId("jny"),
      email: key,
      journey,
      step: 0,
      status: "active",
      context,
      startedAt,
      nextRunAt,
    });
    return true;
  }

  async cancelJourneys(email: string, journeys: readonly JourneyKey[]): Promise<number> {
    const key = email.toLowerCase();
    let n = 0;
    for (const j of this.journeys) {
      if (j.email === key && j.status === "active" && journeys.includes(j.journey)) {
        j.status = "cancelled";
        j.nextRunAt = null;
        n += 1;
      }
    }
    return n;
  }

  async dueJourneys(now: Date, limit: number): Promise<JourneyRow[]> {
    return this.journeys
      .filter((j) => j.status === "active" && j.nextRunAt !== null && j.nextRunAt.getTime() <= now.getTime())
      .sort((a, b) => (a.nextRunAt?.getTime() ?? 0) - (b.nextRunAt?.getTime() ?? 0))
      .slice(0, limit)
      .map((j) => ({ ...j, context: { ...j.context } }));
  }

  async advanceJourney(
    id: string,
    step: number,
    nextRunAt: Date | null,
    status: "active" | "completed",
  ): Promise<void> {
    const j = this.journeys.find((row) => row.id === id);
    if (!j) return;
    j.step = step;
    j.nextRunAt = nextRunAt;
    j.status = status;
  }

  /* ---------- sends ---------- */

  async insertSend(row: NewSend): Promise<string | null> {
    if (this.sends.some((s) => s.dedupeKey === row.dedupeKey)) return null;
    const id = this.nextId("send");
    this.sends.push({
      id,
      email: row.email.toLowerCase(),
      template: row.template,
      category: row.category,
      dedupeKey: row.dedupeKey,
      subject: "",
      status: "queued",
      providerId: null,
      error: null,
      openedAt: null,
      clickedAt: null,
      sentAt: null,
    });
    return id;
  }

  async markSend(
    id: string,
    patch: { status: SendStatus; subject?: string; providerId?: string | null; error?: string | null; sentAt?: Date },
  ): Promise<void> {
    const s = this.sends.find((row) => row.id === id);
    if (!s) return;
    s.status = patch.status;
    if (patch.subject !== undefined) s.subject = patch.subject;
    if (patch.providerId !== undefined) s.providerId = patch.providerId;
    if (patch.error !== undefined) s.error = patch.error;
    if (patch.sentAt !== undefined) s.sentAt = patch.sentAt;
  }

  private toSendRow(s: MemSend): SendRow {
    return {
      id: s.id,
      email: s.email,
      template: s.template,
      category: s.category,
      status: s.status,
      openedAt: s.openedAt,
      clickedAt: s.clickedAt,
    };
  }

  async recordOpen(id: string, at: Date): Promise<SendRow | null> {
    const s = this.sends.find((row) => row.id === id);
    if (!s) return null;
    s.openedAt = s.openedAt ?? at;
    return this.toSendRow(s);
  }

  async recordClick(id: string, at: Date): Promise<SendRow | null> {
    const s = this.sends.find((row) => row.id === id);
    if (!s) return null;
    s.clickedAt = s.clickedAt ?? at;
    s.openedAt = s.openedAt ?? at;
    return this.toSendRow(s);
  }

  async lastLifecycleSendAt(email: string): Promise<Date | null> {
    const key = email.toLowerCase();
    let latest: Date | null = null;
    for (const s of this.sends) {
      if (s.email === key && s.category === "lifecycle" && s.status === "sent" && s.sentAt !== null) {
        if (latest === null || s.sentAt.getTime() > latest.getTime()) latest = s.sentAt;
      }
    }
    return latest;
  }

  /* ---------- digest ---------- */

  async bumpSignalWeek(week: string, field: "generated" | "target_hit" | "stopped"): Promise<void> {
    const row = this.signalWeeks.get(week) ?? { week, generated: 0, targetHit: 0, stopped: 0 };
    if (field === "generated") row.generated += 1;
    else if (field === "target_hit") row.targetHit += 1;
    else row.stopped += 1;
    this.signalWeeks.set(week, row);
  }

  async getSignalWeek(week: string): Promise<SignalWeekRow | null> {
    return this.signalWeeks.get(week) ?? null;
  }

  async listAudience(afterEmail: string | null, limit: number): Promise<ContactRow[]> {
    return [...this.contacts.values()]
      .filter((c) => !this.suppressions.has(c.email))
      .filter((c) => (afterEmail === null ? true : c.email > afterEmail))
      .sort((a, b) => a.email.localeCompare(b.email))
      .slice(0, limit);
  }

  /* ---------- enrichment ---------- */

  async findEarlyAccessEntry(id: string): Promise<EarlyAccessLookup | null> {
    return this.entries.get(id) ?? null;
  }

  async countEarlyAccessEntries(): Promise<number> {
    return this.entries.size;
  }

  async countVerifiedReferrals(entryId: string): Promise<number> {
    let n = 0;
    for (const e of this.entries.values()) if (e.referredBy === entryId) n += 1;
    return n;
  }

  async findAcademyIdentity(
    userId: string,
  ): Promise<{ email: string; displayName: string; xp: number } | null> {
    const row = this.academy.get(userId);
    return row ? { email: row.email, displayName: row.displayName, xp: row.xp } : null;
  }

  async anyLessonComplete(userId: string): Promise<boolean> {
    return (this.academy.get(userId)?.lessons ?? 0) > 0;
  }

  /* ---------- test helpers ---------- */

  sentTemplates(email?: string): string[] {
    return this.sends
      .filter((s) => s.status === "sent" && (email === undefined || s.email === email))
      .map((s) => s.template);
  }

  journey(email: string, key: JourneyKey): (JourneyRow & { id: string }) | undefined {
    return this.journeys.find((j) => j.email === email.toLowerCase() && j.journey === key);
  }
}
