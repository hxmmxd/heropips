import { describe, expect, it } from "vitest";
import {
  ACADEMY_EVENTS,
  EARLY_ACCESS_EVENTS,
  IDENTITY_EVENTS,
  PAYMENT_EVENTS,
  SIGNAL_EVENTS,
  type EventEnvelope,
} from "@heropips/contracts";
import { ApiHttpError } from "../src/common/errors";
import { signStatusToken, signTrackingId } from "../src/common/token";
import type { MessagingConfig } from "../src/messaging/config";
import { MessagingService } from "../src/messaging/messaging.service";
import type { OutgoingEmail } from "../src/messaging/transport";
import { MemMessagingRepo } from "./messaging-mem-repo";

const SECRET = "test-secret";
const ORIGIN = "http://localhost:3000";

const CFG: MessagingConfig = {
  publicOrigin: ORIGIN,
  smtpUrl: null,
  emailFrom: "HeroPips <hello@heropips.local>",
  replyTo: null,
  sweepIntervalSec: 60,
  enabled: true,
  ga4MeasurementId: null,
  ga4ApiSecret: null,
  statusTokenSecret: SECRET,
};

class FakeTransport {
  outbox: OutgoingEmail[] = [];
  failNext = false;

  async send(msg: OutgoingEmail): Promise<{ providerId: string | null }> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("smtp boom");
    }
    this.outbox.push(msg);
    return { providerId: `mid-${this.outbox.length}` };
  }
}

type Harness = {
  svc: MessagingService;
  repo: MemMessagingRepo;
  transport: FakeTransport;
  clock: { now: Date; set: (iso: string) => void; advanceHours: (h: number) => void };
};

function makeService(startIso = "2026-07-01T12:00:00Z"): Harness {
  const repo = new MemMessagingRepo();
  const transport = new FakeTransport();
  const clock = {
    now: new Date(startIso),
    set(iso: string) {
      this.now = new Date(iso);
    },
    advanceHours(h: number) {
      this.now = new Date(this.now.getTime() + h * 3_600_000);
    },
  };
  const svc = new MessagingService(repo, transport, CFG, () => clock.now);
  return { svc, repo, transport, clock };
}

let eventSeq = 0;
function env(type: string, payload: unknown, occurredAt = "2026-07-01T12:00:00.000Z"): EventEnvelope {
  eventSeq += 1;
  return {
    event_id: `00000000-0000-4000-8000-${String(eventSeq).padStart(12, "0")}`,
    type,
    occurred_at: occurredAt,
    tenant_id: "heropips",
    payload,
  };
}

function seedEntry(
  repo: MemMessagingRepo,
  id: string,
  email: string,
  opts: { code?: string; basePosition?: number; referredBy?: string | null } = {},
): void {
  repo.entries.set(id, {
    id,
    email,
    code: opts.code ?? "CODE1234",
    basePosition: opts.basePosition ?? 42,
    referredBy: opts.referredBy ?? null,
  });
}

/* =========================================================================
 * Early access
 * ======================================================================= */

describe("early access joined", () => {
  it("welcome email + contact + nurture journey, idempotent on redelivery", async () => {
    const { svc, repo, transport } = makeService();
    seedEntry(repo, "e1", "trader@example.com", { code: "HERO42", basePosition: 7 });

    const joined = env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 7 });
    await svc.handleEvent(joined);

    expect(repo.sentTemplates("trader@example.com")).toEqual(["ea_welcome"]);
    const mail = transport.outbox[0];
    expect(mail.to).toBe("trader@example.com");
    expect(mail.subject).toBe("You're #7 in line for HeroPips");
    // Transactional: no unsubscribe link or header.
    expect(mail.html).not.toContain("/unsubscribe?token=");
    expect(mail.headers).toBeUndefined();
    // Click-wrapped, UTM-tagged links + open pixel present.
    expect(mail.html).toContain(`${ORIGIN}/api/mail/c/`);
    expect(mail.html).toContain(encodeURIComponent("utm_campaign=ea_welcome"));
    expect(mail.html).toContain(`${ORIGIN}/api/mail/o/`);
    expect(mail.text.length).toBeGreaterThan(100);

    const contact = await repo.findContactByEmail("trader@example.com");
    expect(contact?.source).toBe("early_access");
    const journey = repo.journey("trader@example.com", "early_access_nurture");
    expect(journey?.status).toBe("active");
    // D1 at 14:00 UTC the next day.
    expect(journey?.nextRunAt?.toISOString()).toBe("2026-07-02T14:00:00.000Z");

    // Kafka redelivery of the same event: dedupe key eats it.
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 7 }));
    expect(transport.outbox).toHaveLength(1);
  });

  it("notifies the referrer with jump math (3 referrals = 1 jump of 25)", async () => {
    const { svc, repo, transport } = makeService();
    seedEntry(repo, "ref", "referrer@example.com", { code: "TOPGUN", basePosition: 100 });
    seedEntry(repo, "a", "a@example.com", { referredBy: "ref" });
    seedEntry(repo, "b", "b@example.com", { referredBy: "ref" });
    seedEntry(repo, "c", "c@example.com", { referredBy: "ref" });

    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "c", position: 120, referrer_entry_id: "ref" }));

    const jumpMail = transport.outbox.find((m) => m.to === "referrer@example.com");
    expect(jumpMail).toBeDefined();
    // 3 verified referrals → 1 jump → 100 - 25 = 75 (floored at 1 by effectivePosition).
    expect(jumpMail?.subject).toBe("You moved up — now #75 in line");
  });
});

/* =========================================================================
 * Payments
 * ======================================================================= */

describe("purchase lifecycle", () => {
  it("payment.finished: receipt + access code, cancels nurture, starts onboarding", async () => {
    const { svc, repo, transport } = makeService();
    seedEntry(repo, "e1", "buyer@example.com");
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 3 }));

    await svc.handleEvent(
      env(PAYMENT_EVENTS.finished, {
        order_id: "hp_ltd_abc123",
        email: "buyer@example.com",
        sku: "ltd_founding",
        price_usd: 499,
      }),
    );

    const receipt = transport.outbox.find((m) => m.subject.includes("seat is locked"));
    expect(receipt).toBeDefined();
    expect(receipt?.html).toContain("hp_ltd_abc123"); // access code block
    expect(receipt?.html).toContain("$499");

    expect(repo.journey("buyer@example.com", "early_access_nurture")?.status).toBe("cancelled");
    expect(repo.journey("buyer@example.com", "founding_onboarding")?.status).toBe("active");
    expect((await repo.findContactByEmail("buyer@example.com"))?.founding).toBe(true);
  });

  it("order.created / hold-expired / failed / refunded map to their emails, deduped per order", async () => {
    const { svc, repo } = makeService();
    await svc.handleEvent(
      env(PAYMENT_EVENTS.orderCreated, {
        order_id: "o1",
        email: "x@example.com",
        sku: "ltd_founding",
        price_usd: 499,
        expires_at: "2026-07-01T14:00:00.000Z",
      }),
    );
    // Both the IPN-expired and the hold-sweeper event can fire for one order:
    await svc.handleEvent(env(PAYMENT_EVENTS.orderHoldExpired, { order_id: "o1", email: "x@example.com" }));
    await svc.handleEvent(env(PAYMENT_EVENTS.expired, { order_id: "o1", email: "x@example.com" }));
    await svc.handleEvent(env(PAYMENT_EVENTS.failed, { order_id: "o1", email: "x@example.com" }));
    await svc.handleEvent(env(PAYMENT_EVENTS.refunded, { order_id: "o1", email: "x@example.com" }));

    expect(repo.sentTemplates("x@example.com")).toEqual([
      "order_created",
      "order_expired", // exactly once despite two expiry-shaped events
      "payment_issue",
      "refund_confirmed",
    ]);
  });

  it("legacy payment.failed without email is skipped silently", async () => {
    const { svc, transport } = makeService();
    await svc.handleEvent(env(PAYMENT_EVENTS.failed, { order_id: "o2" }));
    expect(transport.outbox).toHaveLength(0);
  });
});

/* =========================================================================
 * Registration
 * ======================================================================= */

describe("user registered", () => {
  it("welcome email, cancels pre-signup journeys, starts member activation", async () => {
    const { svc, repo, transport } = makeService();
    seedEntry(repo, "e1", "hero@example.com");
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 5 }));
    await svc.handleEvent(
      env(PAYMENT_EVENTS.finished, { order_id: "o9", email: "hero@example.com", sku: "ltd_founding", price_usd: 499 }),
    );

    await svc.handleEvent(
      env(IDENTITY_EVENTS.userRegistered, {
        user_id: "u1",
        email: "hero@example.com",
        display_name: "Ada Lovelace",
        founding: true,
        package_sku: "ltd_founding",
      }),
    );

    const welcome = transport.outbox.find((m) => m.subject === "Ada, your HeroPips account is live");
    expect(welcome).toBeDefined();
    expect(welcome?.html).toContain("founding lounge");

    expect(repo.journey("hero@example.com", "early_access_nurture")?.status).toBe("cancelled");
    expect(repo.journey("hero@example.com", "founding_onboarding")?.status).toBe("cancelled");
    expect(repo.journey("hero@example.com", "member_activation")?.status).toBe("active");
    const contact = await repo.findContactByEmail("hero@example.com");
    expect(contact?.userId).toBe("u1");
    expect(contact?.registeredAt).not.toBeNull();
  });
});

/* =========================================================================
 * Journey sweeper
 * ======================================================================= */

describe("journey sweep", () => {
  it("runs due steps in order and respects the 20h lifecycle frequency cap", async () => {
    const { svc, repo, clock } = makeService("2026-07-01T12:00:00Z");
    seedEntry(repo, "e1", "drip@example.com", { code: "DRIP", basePosition: 9 });
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 9 }));

    // Jump past D1 AND D3 due times: only D1 sends; D3 gets capped next pass.
    clock.set("2026-07-04T15:00:00Z");
    await svc.sweep(clock.now);
    expect(repo.sentTemplates("drip@example.com")).toEqual(["ea_welcome", "ea_d1_story"]);

    await svc.sweep(clock.now); // D3 due, but <20h since D1 → capped, journey advances
    const d3 = repo.sends.find((s) => s.template === "ea_d3_academy");
    expect(d3?.status).toBe("capped");

    // D5's slot is start-day+5 at 14:00 UTC (Jul 6) — by then the cap window
    // since D1 (sent Jul 4 15:00) has also passed.
    clock.set("2026-07-06T14:05:00Z");
    await svc.sweep(clock.now);
    expect(repo.sentTemplates("drip@example.com")).toEqual(["ea_welcome", "ea_d1_story", "ea_d5_founding"]);

    const journey = repo.journey("drip@example.com", "early_access_nurture");
    expect(journey?.step).toBe(3); // next: ea_d8_referral
    expect(journey?.status).toBe("active");
  });

  it("nurture steps stop for converts even if the cancel event was missed", async () => {
    const { svc, repo, clock } = makeService();
    seedEntry(repo, "e1", "quiet@example.com");
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 2 }));
    // Simulate an out-of-band conversion the consumer never saw:
    await repo.upsertContact({ email: "quiet@example.com", source: "platform", registeredAt: new Date() });

    clock.set("2026-07-02T14:30:00Z");
    await svc.sweep(clock.now);
    expect(repo.sentTemplates("quiet@example.com")).toEqual(["ea_welcome"]); // D1 skipped
  });

  it("member activation skips academy step when a lesson is already done", async () => {
    const { svc, repo, clock } = makeService();
    repo.academy.set("u1", { email: "m@example.com", displayName: "M", xp: 120, lessons: 2 });
    await svc.handleEvent(
      env(IDENTITY_EVENTS.userRegistered, {
        user_id: "u1",
        email: "m@example.com",
        display_name: "M",
        founding: false,
        package_sku: "ltd_founding",
      }),
    );

    clock.set("2026-07-03T14:30:00Z"); // D2 due
    await svc.sweep(clock.now);
    expect(repo.sentTemplates("m@example.com")).toEqual(["platform_welcome"]); // ma_d2 skipped

    clock.set("2026-07-07T12:00:00Z"); // D5 due (>20h later, sunday)
    await svc.sweep(clock.now);
    expect(repo.sentTemplates("m@example.com")).toEqual(["platform_welcome", "ma_d5_paper"]);
  });
});

/* =========================================================================
 * Suppression / unsubscribe
 * ======================================================================= */

describe("unsubscribe", () => {
  it("suppresses lifecycle mail but never transactional", async () => {
    const { svc, repo, transport } = makeService();
    const token = signStatusToken({ e: "opt@example.com", a: "unsub" }, SECRET);
    const res = await svc.unsubscribe(token);
    expect(res).toEqual({ ok: true, email_masked: expect.stringContaining("@") });

    seedEntry(repo, "e1", "opt@example.com");
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 1 })); // tx: sends
    await svc.handleEvent(
      env(ACADEMY_EVENTS.nudgeDaily, { user_id: "u9", email: "opt@example.com", display_name: "O", streak_days: 4, xp: 10 }),
    ); // lifecycle: suppressed

    expect(transport.outbox.map((m) => m.subject)).toEqual(["You're #1 in line for HeroPips"]);
    const nudge = repo.sends.find((s) => s.template === "academy_nudge_daily");
    expect(nudge?.status).toBe("suppressed");
  });

  it("rejects a forged token", async () => {
    const { svc } = makeService();
    await expect(svc.unsubscribe("garbage.token")).rejects.toBeInstanceOf(ApiHttpError);
    // A validly-signed token with the wrong action claim is refused too.
    await expect(svc.unsubscribe(signStatusToken({ e: "x@example.com" }, SECRET))).rejects.toBeInstanceOf(ApiHttpError);
  });
});

/* =========================================================================
 * Academy nudges + certificate
 * ======================================================================= */

describe("academy triggers", () => {
  it("nudges render streak/lesson context and dedupe per user per day", async () => {
    const { svc, repo, transport, clock } = makeService();
    const daily = {
      user_id: "u1",
      email: "streak@example.com",
      display_name: "Sam",
      streak_days: 6,
      xp: 480,
    };
    await svc.handleEvent(env(ACADEMY_EVENTS.nudgeDaily, daily, "2026-07-01T09:00:00.000Z"));
    await svc.handleEvent(env(ACADEMY_EVENTS.nudgeDaily, daily, "2026-07-01T10:00:00.000Z")); // same UTC day

    expect(transport.outbox).toHaveLength(1);
    expect(transport.outbox[0].subject).toBe("Your 6-day streak ends at midnight UTC");
    // Lifecycle mail carries one-click unsubscribe headers (RFC 8058).
    expect(transport.outbox[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(transport.outbox[0].html).toContain("/unsubscribe?token=");

    // Same-day weekly nudge would hit the 20h lifecycle cap — that's the
    // contract. Past the window it goes out.
    clock.advanceHours(21);
    await svc.handleEvent(
      env(ACADEMY_EVENTS.nudgeWeekly, {
        ...daily,
        completed_count: 12,
        total_lessons: 31,
        next_slug: "risk-1-percent",
      }, "2026-07-02T09:00:00.000Z"),
    );
    expect(repo.sends.filter((s) => s.status === "capped")).toHaveLength(0);
    expect(transport.outbox[1].subject).toBe("Next up: Risk 1 percent");
  });

  it("certificate email resolves the recipient from academy progress", async () => {
    const { svc, repo, transport } = makeService();
    repo.academy.set("u2", { email: "grad@example.com", displayName: "Grace Hopper", xp: 900, lessons: 10 });
    await svc.handleEvent(
      env(ACADEMY_EVENTS.certificateIssued, {
        user_id: "u2",
        track: "foundations",
        code: "HP-AAAAA-BBBBB",
        recipient: "Grace Hopper",
        xp_at_issue: 900,
      }),
    );
    expect(transport.outbox[0].subject).toBe("Your Foundations certificate is ready");
    expect(transport.outbox[0].html).toContain("HP-AAAAA-BBBBB");
    // CTA links are click-wrapped, so the target URL appears encoded in html
    // and raw in the text alternate.
    expect(transport.outbox[0].text).toContain("/academy/verify/HP-AAAAA-BBBBB");
  });
});

/* =========================================================================
 * Weekly digest
 * ======================================================================= */

describe("weekly digest", () => {
  it("sends last week's honest counters to the non-suppressed audience, once", async () => {
    // Monday 2026-07-06 ≥14:00 UTC; the counted week is 2026-W27 (Jun 29–Jul 5).
    const { svc, repo, clock } = makeService("2026-07-02T10:00:00Z");
    for (let i = 0; i < 5; i++) {
      await svc.handleEvent(env(SIGNAL_EVENTS.generated, {}, "2026-07-02T10:00:00.000Z"));
    }
    await svc.handleEvent(env(SIGNAL_EVENTS.resolved, { outcome: "target_hit" }, "2026-07-03T10:00:00.000Z"));
    await svc.handleEvent(env(SIGNAL_EVENTS.resolved, { outcome: "stopped" }, "2026-07-03T11:00:00.000Z"));
    await svc.handleEvent(env(SIGNAL_EVENTS.resolved, { outcome: "expired" }, "2026-07-03T12:00:00.000Z")); // ignored

    await repo.upsertContact({ email: "list@example.com", source: "early_access" });
    await repo.upsertContact({ email: "member@example.com", source: "platform", registeredAt: new Date() });
    await repo.upsertContact({ email: "gone@example.com", source: "early_access" });
    await repo.suppress("gone@example.com", "unsubscribe");

    clock.set("2026-07-06T14:05:00Z");
    await svc.sweep(clock.now);
    await svc.sweep(clock.now); // second pass must not duplicate

    const digests = repo.sends.filter((s) => s.template === "weekly_digest" && s.status === "sent");
    expect(digests.map((d) => d.email).sort()).toEqual(["list@example.com", "member@example.com"]);
    expect(digests[0].subject).toBe("This week on HeroPips: 5 signals ran their course");
  });

  it("stays silent on a week with zero signals", async () => {
    const { svc, repo, clock } = makeService();
    await repo.upsertContact({ email: "list@example.com", source: "early_access" });
    clock.set("2026-07-06T14:05:00Z");
    await svc.sweep(clock.now);
    expect(repo.sends.filter((s) => s.template === "weekly_digest")).toHaveLength(0);
  });
});

/* =========================================================================
 * Pipeline mechanics
 * ======================================================================= */

describe("dispatch pipeline", () => {
  it("transport failure marks the ledger row failed without throwing", async () => {
    const { svc, repo, transport } = makeService();
    transport.failNext = true;
    seedEntry(repo, "e1", "boom@example.com");
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 1 }));

    const send = repo.sends[0];
    expect(send.status).toBe("failed");
    expect(send.error).toBe("smtp boom");
  });

  /**
   * M7: tracking ids are HMAC-tagged. An untagged or tampered id is a silent
   * no-op — same 200/redirect, but no DB write and no analytics event — so the
   * endpoints stop being unauthenticated write amplification and send-id oracles.
   */
  it("open/click tracking requires a valid HMAC tag and records once", async () => {
    const { svc, repo, transport } = makeService();
    seedEntry(repo, "e1", "t@example.com");
    await svc.handleEvent(env(EARLY_ACCESS_EVENTS.joined, { entry_id: "e1", position: 1 }));
    const id = repo.sends[0].id;
    const tagged = signTrackingId(id, SECRET);

    // The mail itself carries the tagged id, never the bare send id.
    expect(transport.outbox[0].html).toContain(`/api/mail/o/${tagged}`);
    expect(transport.outbox[0].html).not.toContain(`/api/mail/o/${id}?`);

    // Bare (unsigned) id: accepted HTTP-wise, but nothing is recorded.
    await expect(svc.trackOpen(id)).resolves.toEqual({ ok: true });
    expect(repo.sends[0].openedAt).toBeNull();

    // Tampered tag: same silent refusal.
    const tampered = `${id}.${"A".repeat(22)}`;
    await expect(svc.trackOpen(tampered)).resolves.toEqual({ ok: true });
    const forgedClick = await svc.trackClick(tampered, `${ORIGIN}/founding`);
    expect(forgedClick.to).toBe(`${ORIGIN}/founding`); // still redirects the human
    expect(repo.sends[0].openedAt).toBeNull();
    expect(repo.sends[0].clickedAt).toBeNull();

    // Correctly tagged id: recorded, and same-origin click-through echoed.
    await svc.trackOpen(tagged);
    const clicked = await svc.trackClick(tagged, `${ORIGIN}/founding?utm_source=email`);
    expect(clicked.to).toBe(`${ORIGIN}/founding?utm_source=email`);
    const evil = await svc.trackClick(tagged, "https://evil.example.com/phish");
    expect(evil.to).toBe(ORIGIN); // open-redirect refused

    expect(repo.sends[0].openedAt).not.toBeNull();
    expect(repo.sends[0].clickedAt).not.toBeNull();

    // Unknown-but-well-formed id: no write, never 500s a pixel.
    await expect(svc.trackOpen(signTrackingId("missing-id", SECRET))).resolves.toEqual({ ok: true });
  });
});
