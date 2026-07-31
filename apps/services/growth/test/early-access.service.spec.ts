import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  EA_CODE_MAX_ATTEMPTS,
  EA_CODE_RESEND_SEC,
  EA_CODE_TTL_SEC,
  type EarlyAccessJoinRes,
  type EarlyAccessVerifyReq,
  type EventEnvelope,
  type TraderProfile,
} from "@heropips/contracts";
import type { GrowthConfig } from "../src/common/config";
import { verifyStatusToken } from "../src/common/token";
import { hashVerificationCode } from "../src/common/verification";
import type { MessagingConfig } from "../src/messaging/config";
import { MessagingService } from "../src/messaging/messaging.service";
import type { OutgoingEmail } from "../src/messaging/transport";
import type {
  NewEarlyAccessEntry,
  EarlyAccessEntryRow,
  EarlyAccessRepo,
  EarlyAccessTxOps,
  EarlyAccessVerificationRow,
  IssueVerification,
} from "../src/early-access/early-access.repo";
import { EarlyAccessService } from "../src/early-access/early-access.service";
import { MemMessagingRepo } from "./messaging-mem-repo";

interface OutboxRow {
  topic: string;
  payload: EventEnvelope;
}

type StoredEntry = EarlyAccessEntryRow & { profile: TraderProfile | null; verifiedAt: Date };

/**
 * Signup is two-step: POST /code issues a 6-digit code, POST /verify checks it
 * and only then creates the queue entry. Non-production pins the issued code
 * via GrowthConfig.devVerificationCode, which is what these tests use — the
 * queue semantics below are therefore exercised through the public API rather
 * than by reaching into the private join().
 */
const DEV_CODE = "424242";
const CFG: GrowthConfig = {
  adminToken: null,
  internalToken: null,
  adminNotifyEmail: null,
  devVerificationCode: DEV_CODE,
};

/** Records dispatches and always succeeds; join() itself never sends mail. */
class FakeMessaging {
  sent: { to: string; dedupe: string | undefined }[] = [];

  async dispatch(_def: unknown, _props: unknown, to: string, dedupe?: string): Promise<"sent"> {
    this.sent.push({ to, dedupe });
    return "sent";
  }
}

/** In-memory EarlyAccessRepo — same semantics as the pg impl, minus the locking. */
class MemoryRepo implements EarlyAccessRepo, EarlyAccessTxOps {
  entries: StoredEntry[] = [];
  outbox: OutboxRow[] = [];
  verifications: EarlyAccessVerificationRow[] = [];

  async joinTx<T>(fn: (ops: EarlyAccessTxOps) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async findByEmail(email: string): Promise<EarlyAccessEntryRow | null> {
    return this.entries.find((e) => e.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async findByCode(code: string): Promise<EarlyAccessEntryRow | null> {
    return this.entries.find((e) => e.code.toUpperCase() === code.toUpperCase()) ?? null;
  }

  async countEntries(): Promise<number> {
    return this.entries.length;
  }

  async countEntriesSince(since: Date): Promise<number> {
    return this.entries.filter((e) => e.verifiedAt.getTime() >= since.getTime()).length;
  }

  async countReferrals(entryId: string): Promise<number> {
    return this.entries.filter((e) => e.referredBy === entryId).length;
  }

  async insertEntry(input: NewEarlyAccessEntry): Promise<EarlyAccessEntryRow> {
    const row: StoredEntry = {
      id: randomUUID(),
      email: input.email,
      code: input.code,
      referredBy: input.referredBy,
      basePosition: input.basePosition,
      profile: input.profile,
      verifiedAt: input.verifiedAt,
    };
    this.entries.push(row);
    return row;
  }

  async updateProfile(entryId: string, profile: TraderProfile): Promise<void> {
    const row = this.entries.find((e) => e.id === entryId);
    if (row) row.profile = profile;
  }

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    this.outbox.push({ topic, payload: payload as EventEnvelope });
  }

  async findVerification(email: string): Promise<EarlyAccessVerificationRow | null> {
    return this.verifications.find((v) => v.email === email.toLowerCase()) ?? null;
  }

  /** Upsert: a resend replaces the code, resets attempts and counts the send. */
  async issueVerification(input: IssueVerification): Promise<EarlyAccessVerificationRow> {
    const email = input.email.toLowerCase();
    const existing = this.verifications.find((v) => v.email === email);
    if (existing) {
      existing.codeHash = input.codeHash;
      existing.expiresAt = input.expiresAt;
      existing.attempts = 0;
      existing.sends += 1;
      existing.lastSentAt = input.sentAt;
      return existing;
    }
    const row: EarlyAccessVerificationRow = {
      email,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      attempts: 0,
      sends: 1,
      lastSentAt: input.sentAt,
    };
    this.verifications.push(row);
    return row;
  }

  async bumpVerificationAttempts(email: string): Promise<number> {
    const row = this.verifications.find((v) => v.email === email.toLowerCase());
    if (!row) return 0;
    row.attempts += 1;
    return row.attempts;
  }

  async clearVerification(email: string): Promise<void> {
    this.verifications = this.verifications.filter((v) => v.email !== email.toLowerCase());
  }
}

describe("EarlyAccessService", () => {
  let repo: MemoryRepo;
  let messaging: FakeMessaging;
  let service: EarlyAccessService;
  let now: Date;

  /** Completes a full verified signup (request code → verify) and returns the join result. */
  const join = async (req: Omit<EarlyAccessVerifyReq, "code">): Promise<EarlyAccessJoinRes> => {
    // Each address may only ask for a code every EA_CODE_RESEND_SEC; step the
    // clock past that gate so repeated signups in one test aren't rate-limited.
    now = new Date(now.getTime() + (EA_CODE_RESEND_SEC + 1) * 1000);
    await service.requestCode({ email: req.email });
    return service.verify({ ...req, code: DEV_CODE });
  };

  beforeEach(() => {
    repo = new MemoryRepo();
    messaging = new FakeMessaging();
    now = new Date("2026-07-01T00:00:00.000Z");
    service = new EarlyAccessService(repo, messaging as unknown as MessagingService, CFG, () => now);
  });

  it("a verified signup gets position 1 and a valid status token", async () => {
    const res = await join({ email: "one@example.com" });
    expect(res.position).toBe(1);
    expect(res.total).toBe(1);
    expect(res.duplicate).toBe(false);
    expect(res.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(verifyStatusToken(res.status_token)).toEqual({ e: "one@example.com" });
  });

  it("nothing is queued until the code is verified", async () => {
    await service.requestCode({ email: "pending@example.com" });
    expect(repo.entries).toHaveLength(0);
    expect(repo.verifications).toHaveLength(1);
    expect(messaging.sent).toHaveLength(1); // the code email

    await service.verify({ email: "pending@example.com", code: DEV_CODE });
    expect(repo.entries).toHaveLength(1);
    expect(repo.verifications).toHaveLength(0); // consumed
  });

  it("a wrong code is rejected and queues nothing", async () => {
    await service.requestCode({ email: "typo@example.com" });
    await expect(service.verify({ email: "typo@example.com", code: "000000" })).rejects.toMatchObject({
      status: 401,
      body: { error_code: "verification_code_invalid" },
    });
    expect(repo.entries).toHaveLength(0);
  });

  it("positions are insert-ordered (1-based)", async () => {
    await join({ email: "one@example.com" });
    await join({ email: "two@example.com" });
    const third = await join({ email: "three@example.com" });
    expect(third.position).toBe(3);
    expect(third.total).toBe(3);
  });

  it("duplicate email returns the existing entry, inserts nothing, emits no event", async () => {
    const first = await join({ email: "dup@example.com" });
    const again = await join({ email: "dup@example.com" });
    expect(again.duplicate).toBe(true);
    expect(again.code).toBe(first.code);
    expect(again.position).toBe(first.position);
    expect(repo.entries).toHaveLength(1);
    expect(repo.outbox).toHaveLength(1); // only the original join event
  });

  it("valid ref attributes the referrer (case-insensitive)", async () => {
    const referrer = await join({ email: "ref@example.com" });
    await join({ email: "friend@example.com", ref: referrer.code.toLowerCase() });
    const friend = repo.entries[1];
    expect(friend.referredBy).toBe(repo.entries[0].id);
    const event = repo.outbox[1].payload;
    expect(event.type).toBe("early_access.joined");
    expect(event.payload).toMatchObject({ ref: true });
  });

  it("unknown ref code is silently ignored", async () => {
    const res = await join({ email: "solo@example.com", ref: "ZZZZ9999" });
    expect(res.position).toBe(1);
    expect(repo.entries[0].referredBy).toBeNull();
  });

  it("self-referral is ignored", async () => {
    const me = await join({ email: "me@example.com" });
    // Duplicate signup passing my own code must not attribute anything.
    const again = await join({ email: "me@example.com", ref: me.code });
    expect(again.duplicate).toBe(true);
    expect(repo.entries).toHaveLength(1);
    expect(repo.entries[0].referredBy).toBeNull();
    expect(await repo.countReferrals(repo.entries[0].id)).toBe(0);
  });

  it("join emits an early_access.joined envelope with masked email", async () => {
    await join({ email: "osama@gmail.com" });
    const { topic, payload } = repo.outbox[0];
    expect(topic).toBe("hp.growth.events.v1");
    expect(payload.type).toBe("early_access.joined");
    expect(payload.tenant_id).toBe("heropips");
    expect(payload.event_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.payload).toEqual({
      entry_id: repo.entries[0].id,
      referrer_entry_id: null,
      email_masked: "o•••@g•••.com",
      position: 1,
      ref: false,
      profiled: false,
    });
  });

  it("join persists the trader profile; joining without one stores null", async () => {
    const profile: TraderProfile = {
      experience: "1_3y",
      markets: ["forex", "crypto"],
      platforms: ["mt4_mt5"],
      terminology: "fluent",
    };
    await join({ email: "profiled@example.com", profile });
    await join({ email: "bare@example.com" });

    expect(repo.entries[0].profile).toEqual(profile);
    expect(repo.entries[1].profile).toBeNull();
    expect(repo.outbox[0].payload.payload).toMatchObject({ profiled: true });
    expect(repo.outbox[1].payload.payload).toMatchObject({ profiled: false });
  });

  it("status reflects verified referrals: jumps and effective position", async () => {
    // Push the referrer deep into the queue: 30 entries ahead.
    for (let i = 0; i < 30; i++) await join({ email: `filler${i}@example.com` });
    const referrer = await join({ email: "climber@example.com" }); // base 31
    expect(referrer.position).toBe(31);

    for (let i = 0; i < 3; i++) {
      await join({ email: `invitee${i}@example.com`, ref: referrer.code });
    }

    const status = await service.status(referrer.status_token);
    expect(status.referrals_verified).toBe(3);
    expect(status.jumps).toBe(1);
    expect(status.position).toBe(6); // 31 - 25
    expect(status.total).toBe(34);
    expect(status.email_masked).toBe("c•••@e•••.com");
    expect(status.code).toBe(referrer.code);
  });

  it("effective position floors at 1", async () => {
    const first = await join({ email: "top@example.com" }); // base 1
    await join({ email: "friendA@example.com", ref: first.code });
    await join({ email: "friendB@example.com", ref: first.code });
    await join({ email: "friendC@example.com", ref: first.code });
    const status = await service.status(first.status_token);
    expect(status.jumps).toBe(1);
    expect(status.position).toBe(1); // 1 - 25 floored
  });

  it("status rejects a tampered token with invalid_token", async () => {
    await join({ email: "one@example.com" });
    await expect(service.status("bogus.token")).rejects.toMatchObject({
      status: 401,
      body: { error_code: "invalid_token" },
    });
  });

  it("status with a valid token for a missing entry -> early_access_not_found", async () => {
    const res = await join({ email: "gone@example.com" });
    repo.entries = [];
    await expect(service.status(res.status_token)).rejects.toMatchObject({
      status: 404,
      body: { error_code: "early_access_not_found" },
    });
  });

  it("generated code collisions are retried", async () => {
    // Pre-seed an entry whose code will collide with the first generation attempt.
    const seeded = await join({ email: "seed@example.com" });
    // Force findByCode to report a collision once for any *new* code.
    let collisions = 0;
    const realFindByCode = repo.findByCode.bind(repo);
    repo.findByCode = async (code: string) => {
      const found = await realFindByCode(code);
      if (!found && collisions === 0) {
        collisions++;
        return repo.entries[0]; // pretend the first candidate is taken
      }
      return found;
    };
    const res = await join({ email: "fresh@example.com" });
    expect(collisions).toBe(1);
    expect(res.code).not.toBe(seeded.code);
    expect(repo.entries).toHaveLength(2);
  });
});

/* =========================================================================
 * The code lifecycle and the outbound mail, against the REAL MessagingService
 * so template rendering and the dispatch ledger are exercised too.
 * ======================================================================= */

const ADMIN = "ops@heropips.test";

const MSG_CFG: MessagingConfig = {
  publicOrigin: "http://localhost:3000",
  smtpUrl: "smtp://localhost:1025",
  emailFrom: "HeroPips <hello@heropips.local>",
  replyTo: null,
  sweepIntervalSec: 60,
  enabled: true,
  ga4MeasurementId: null,
  ga4ApiSecret: null,
  statusTokenSecret: "dev-status-secret-change-me",
};

class FakeTransport {
  sent: OutgoingEmail[] = [];
  failNext = false;

  async send(msg: OutgoingEmail): Promise<{ providerId: string | null }> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("smtp boom");
    }
    this.sent.push(msg);
    return { providerId: `mid-${this.sent.length}` };
  }
}

describe("EarlyAccessService — verification codes and outbound mail", () => {
  let repo: MemoryRepo;
  let transport: FakeTransport;
  let service: EarlyAccessService;
  let now: Date;

  function build(cfg: Partial<GrowthConfig> = {}) {
    transport = new FakeTransport();
    const messaging = new MessagingService(new MemMessagingRepo(), transport, MSG_CFG, () => now);
    service = new EarlyAccessService(
      repo,
      messaging,
      { adminToken: null, internalToken: null, adminNotifyEmail: ADMIN, devVerificationCode: DEV_CODE, ...cfg },
      () => now,
    );
  }

  const adminMail = () => transport.sent.filter((m) => m.to === ADMIN);

  beforeEach(() => {
    repo = new MemoryRepo();
    now = new Date("2026-07-01T00:00:00.000Z");
    build();
  });

  it("emails the code and echoes the masked address, dev code and TTL", async () => {
    const res = await service.requestCode({ email: "One@Example.com" });

    expect(res.email_masked).toBe("o•••@e•••.com");
    expect(res.expires_in).toBe(EA_CODE_TTL_SEC);
    expect(res.resend_in).toBe(EA_CODE_RESEND_SEC);
    expect(res.dev_code).toBe(DEV_CODE);

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].subject).toContain(DEV_CODE);
    expect(transport.sent[0].text).toContain(DEV_CODE);
    // Transactional mail carries no unsubscribe — it must always be deliverable.
    expect(transport.sent[0].headers).toBeUndefined();
  });

  it("stores the code as an address-bound hash, never in plaintext", async () => {
    await service.requestCode({ email: "hash@example.com" });
    const row = await repo.findVerification("hash@example.com");

    expect(row?.codeHash).not.toContain(DEV_CODE);
    expect(row?.codeHash).toBe(hashVerificationCode("hash@example.com", DEV_CODE));
    expect(row?.codeHash).not.toBe(hashVerificationCode("other@example.com", DEV_CODE));
  });

  it("never reveals whether an address is already on the list", async () => {
    await service.requestCode({ email: "back@example.com" });
    await service.verify({ email: "back@example.com", code: DEV_CODE });
    now = new Date(now.getTime() + (EA_CODE_RESEND_SEC + 1) * 1000);

    const forKnown = await service.requestCode({ email: "back@example.com" });
    now = new Date(now.getTime() + (EA_CODE_RESEND_SEC + 1) * 1000);
    const forStranger = await service.requestCode({ email: "stranger@example.com" });

    // Same shape either way: this endpoint is open to anyone, for any address.
    expect(Object.keys(forKnown).sort()).toEqual(Object.keys(forStranger).sort());
    // Only the inbox owner is told — the copy differs, the HTTP body does not.
    const codeMailFor = (to: string) =>
      transport.sent.filter((m) => m.to === to && m.subject.includes(DEV_CODE)).at(-1);
    expect(codeMailFor("back@example.com")?.text).toContain("Welcome back");
    expect(codeMailFor("stranger@example.com")?.text).not.toContain("Welcome back");
  });

  it("a returning address can update the profile it stored before", async () => {
    await service.requestCode({ email: "again@example.com" });
    await service.verify({
      email: "again@example.com",
      code: DEV_CODE,
      profile: { experience: "first_time" },
    });
    now = new Date(now.getTime() + (EA_CODE_RESEND_SEC + 1) * 1000);

    await service.requestCode({ email: "again@example.com" });
    await service.verify({
      email: "again@example.com",
      code: DEV_CODE,
      profile: { experience: "3y_plus", markets: ["crypto"] },
    });
    expect(repo.entries[0].profile).toEqual({ experience: "3y_plus", markets: ["crypto"] });

    // Skipping the questions must not erase what they already told us.
    now = new Date(now.getTime() + (EA_CODE_RESEND_SEC + 1) * 1000);
    await service.requestCode({ email: "again@example.com" });
    await service.verify({ email: "again@example.com", code: DEV_CODE });
    expect(repo.entries[0].profile).toEqual({ experience: "3y_plus", markets: ["crypto"] });
  });

  it("rate limits a resend inside the cooldown, allows it after", async () => {
    await service.requestCode({ email: "spam@example.com" });
    await expect(service.requestCode({ email: "spam@example.com" })).rejects.toMatchObject({
      status: 429,
      body: { error_code: "rate_limited" },
    });
    expect(transport.sent).toHaveLength(1);

    now = new Date(now.getTime() + EA_CODE_RESEND_SEC * 1000);
    await service.requestCode({ email: "spam@example.com" });
    expect(transport.sent).toHaveLength(2); // a resend must not hit the send-ledger dedupe
  });

  it("surfaces a send failure rather than leaving the caller waiting for mail", async () => {
    transport.failNext = true;
    await expect(service.requestCode({ email: "bounce@example.com" })).rejects.toMatchObject({
      status: 502,
    });
  });

  it("burns the code after too many wrong guesses", async () => {
    await service.requestCode({ email: "guess@example.com" });

    for (let i = 1; i < EA_CODE_MAX_ATTEMPTS; i++) {
      await expect(service.verify({ email: "guess@example.com", code: "000000" })).rejects.toMatchObject({
        body: { error_code: "verification_code_invalid" },
      });
      expect(await repo.findVerification("guess@example.com")).not.toBeNull();
    }

    await expect(service.verify({ email: "guess@example.com", code: "000000" })).rejects.toMatchObject({
      body: { error_code: "verification_code_invalid", message: "Too many wrong codes." },
    });
    expect(await repo.findVerification("guess@example.com")).toBeNull();
    // The right code no longer helps: the whole issuance is gone.
    await expect(service.verify({ email: "guess@example.com", code: DEV_CODE })).rejects.toMatchObject({
      body: { error_code: "verification_required" },
    });
    expect(repo.entries).toHaveLength(0);
  });

  it("rejects and clears an expired code", async () => {
    await service.requestCode({ email: "slow@example.com" });
    now = new Date(now.getTime() + (EA_CODE_TTL_SEC + 1) * 1000);

    await expect(service.verify({ email: "slow@example.com", code: DEV_CODE })).rejects.toMatchObject({
      status: 401,
      body: { error_code: "verification_code_expired" },
    });
    expect(await repo.findVerification("slow@example.com")).toBeNull();
    expect(repo.entries).toHaveLength(0);
  });

  it("refuses a code that was never issued", async () => {
    await expect(service.verify({ email: "ghost@example.com", code: DEV_CODE })).rejects.toMatchObject({
      status: 401,
      body: { error_code: "verification_required" },
    });
  });

  it("consumes the code — replaying it fails", async () => {
    await service.requestCode({ email: "once@example.com" });
    await service.verify({ email: "once@example.com", code: DEV_CODE });

    await expect(service.verify({ email: "once@example.com", code: DEV_CODE })).rejects.toMatchObject({
      body: { error_code: "verification_required" },
    });
  });

  it("production issues a random code and never echoes one", async () => {
    build({ devVerificationCode: null });
    const res = await service.requestCode({ email: "prod@example.com" });

    expect(res.dev_code).toBeUndefined();
    await expect(service.verify({ email: "prod@example.com", code: DEV_CODE })).rejects.toMatchObject({
      body: { error_code: "verification_code_invalid" },
    });
  });

  it("stamps verifiedAt from the clock at verification", async () => {
    await service.requestCode({ email: "stamp@example.com" });
    now = new Date("2026-07-01T00:05:00.000Z");
    await service.verify({ email: "stamp@example.com", code: DEV_CODE });

    expect(repo.entries[0].verifiedAt).toEqual(new Date("2026-07-01T00:05:00.000Z"));
  });

  /* ------------------------------------------------- admin notification */

  it("notifies the admin of a verified signup, profile included", async () => {
    await service.requestCode({ email: "lead@example.com" });
    await service.verify({
      email: "lead@example.com",
      code: DEV_CODE,
      profile: { experience: "3y_plus", markets: ["forex"], terminology: "fluent" },
    });

    const [mail] = adminMail();
    expect(mail.subject).toBe("Early access #1 — lead@example.com");
    expect(mail.text).toContain("lead@example.com");
    expect(mail.text).toContain("3+ years trading");
    expect(mail.text).toContain("Trades: Forex");
  });

  it("says so when the profile was skipped", async () => {
    await service.requestCode({ email: "bare@example.com" });
    await service.verify({ email: "bare@example.com", code: DEV_CODE });
    expect(adminMail()[0].text).toContain("Trader profile skipped");
  });

  it("does not re-notify for a returning address", async () => {
    for (let i = 0; i < 2; i++) {
      await service.requestCode({ email: "dup@example.com" });
      await service.verify({ email: "dup@example.com", code: DEV_CODE });
      now = new Date(now.getTime() + (EA_CODE_RESEND_SEC + 1) * 1000);
    }
    expect(adminMail()).toHaveLength(1);
  });

  it("sends no admin mail when no recipient is configured", async () => {
    build({ adminNotifyEmail: null });
    await service.requestCode({ email: "quiet@example.com" });
    await service.verify({ email: "quiet@example.com", code: DEV_CODE });

    expect(adminMail()).toHaveLength(0);
    expect(repo.entries).toHaveLength(1); // the signup still succeeds
  });

  it("an admin-mail failure never fails the signup", async () => {
    await service.requestCode({ email: "resilient@example.com" });
    transport.failNext = true; // the admin notice is the next send
    const res = await service.verify({ email: "resilient@example.com", code: DEV_CODE });

    expect(res.position).toBe(1);
    expect(repo.entries).toHaveLength(1);
  });

  /* ------------------------------------------------------------- stats */

  it("stats counts the queue and the recent arrivals", async () => {
    now = new Date("2026-06-01T00:00:00.000Z"); // 30 days back
    await service.requestCode({ email: "old@example.com" });
    await service.verify({ email: "old@example.com", code: DEV_CODE });

    now = new Date("2026-07-01T00:00:00.000Z");
    await service.requestCode({ email: "new@example.com" });
    await service.verify({ email: "new@example.com", code: DEV_CODE });

    expect(await service.stats()).toEqual({ total: 2, joined_today: 1, joined_week: 1 });
  });
});
