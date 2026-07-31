import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ACADEMY_EVENTS,
  ACADEMY_LESSONS,
  EARLY_ACCESS_EVENTS,
  IDENTITY_EVENTS,
  LTD,
  PACKAGES,
  PAYMENT_EVENTS,
  SIGNAL_EVENTS,
  TRADE_EVENTS,
  type EmailCategory,
  type EventEnvelope,
  type UnsubscribeRes,
} from "@heropips/contracts";
import { apiError } from "../common/errors";
import { effectivePosition, jumpsFor, maskEmail } from "../common/position";
import {
  signStatusToken,
  signTrackingId,
  verifyStatusToken,
  verifyTrackingId,
} from "../common/token";
import { Ga4Client } from "./analytics";
import { MESSAGING_CONFIG, type MessagingConfig } from "./config";
import { JOURNEYS, SEND_HOUR_UTC, isoWeek, stepRunAt, type JourneyKey } from "./journeys";
import {
  MESSAGING_REPO,
  type ContactRow,
  type JourneyRow,
  type MessagingRepo,
} from "./messaging.repo";
import { renderEmail } from "./templates/base";
import * as T from "./templates/library";
import type { LinkFactory, TemplateDef } from "./templates/library";
import { EMAIL_TRANSPORT, type EmailTransport } from "./transport";

const LIFECYCLE_MIN_GAP_MS = 20 * 60 * 60 * 1000; // ≥20h between lifecycle emails
const SWEEP_BATCH = 50;
const DIGEST_PAGE = 200;

export type DispatchResult = "sent" | "deduped" | "suppressed" | "capped" | "failed" | "logged";

/**
 * The lifecycle email orchestrator: consumes bus events, runs journeys,
 * renders templates, and pushes everything through one dispatch pipeline
 * (suppression → frequency cap → render → transport → ledger → GA4).
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger("messaging");
  private readonly ga4: Ga4Client;
  private lastDigestWeek: string | null = null;

  constructor(
    @Inject(MESSAGING_REPO) private readonly repo: MessagingRepo,
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    @Inject(MESSAGING_CONFIG) private readonly cfg: MessagingConfig,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.ga4 = new Ga4Client(cfg);
  }

  /** Journey kick-off anchored to the service clock (deterministic in tests). */
  private async startJourney(
    email: string,
    key: JourneyKey,
    context: Record<string, unknown>,
  ): Promise<void> {
    const startedAt = this.now();
    await this.repo.startJourney(
      email,
      key,
      startedAt,
      stepRunAt(startedAt, JOURNEYS[key].steps[0].delayDays),
      context,
    );
  }

  /* =======================================================================
   * Event router — every bus trigger lands here
   * ===================================================================== */

  async handleEvent(envelope: EventEnvelope): Promise<void> {
    const p = (envelope.payload ?? {}) as Record<string, unknown>;
    switch (envelope.type) {
      case EARLY_ACCESS_EVENTS.joined:
        return this.onEarlyAccessJoined(envelope, p);
      case PAYMENT_EVENTS.orderCreated:
        return this.onOrderCreated(p);
      case PAYMENT_EVENTS.finished:
        return this.onPaymentFinished(p);
      case PAYMENT_EVENTS.failed:
        return this.onPaymentFailed(p);
      case PAYMENT_EVENTS.expired:
      case PAYMENT_EVENTS.orderHoldExpired:
        return this.onOrderExpired(p);
      case PAYMENT_EVENTS.refunded:
        return this.onRefunded(p);
      case IDENTITY_EVENTS.userRegistered:
        return this.onUserRegistered(p);
      case ACADEMY_EVENTS.nudgeDaily:
        return this.onNudgeDaily(envelope, p);
      case ACADEMY_EVENTS.nudgeWeekly:
        return this.onNudgeWeekly(envelope, p);
      case ACADEMY_EVENTS.nudgeMonthly:
        return this.onNudgeMonthly(envelope, p);
      case ACADEMY_EVENTS.certificateIssued:
        return this.onCertificateIssued(p);
      case ACADEMY_EVENTS.lessonCompleted:
        return this.onLessonCompleted(p);
      case TRADE_EVENTS.orderFilled:
        return this.onTradeFilled(p);
      case SIGNAL_EVENTS.generated:
        return this.repo.bumpSignalWeek(isoWeek(new Date(envelope.occurred_at)), "generated");
      case SIGNAL_EVENTS.resolved: {
        const outcome = p.outcome;
        if (outcome === "target_hit" || outcome === "stopped") {
          await this.repo.bumpSignalWeek(isoWeek(new Date(envelope.occurred_at)), outcome);
        }
        return;
      }
      default:
        return; // not a messaging trigger
    }
  }

  /* ---------- early access ---------- */

  private async onEarlyAccessJoined(env: EventEnvelope, p: Record<string, unknown>): Promise<void> {
    const entryId = typeof p.entry_id === "string" ? p.entry_id : null;
    if (entryId === null) return; // pre-messaging event shape — nothing to enrich from
    const entry = await this.repo.findEarlyAccessEntry(entryId);
    if (entry === null) return;

    await this.repo.upsertContact({
      email: entry.email,
      source: "early_access",
      earlyAccessEntryId: entry.id,
    });

    const position = typeof p.position === "number" ? p.position : entry.basePosition;
    const total = await this.repo.countEarlyAccessEntries();
    const statusToken = signStatusToken({ e: entry.email }, this.cfg.statusTokenSecret);
    await this.dispatch(T.eaWelcome, {
      position,
      total,
      code: entry.code,
      statusToken,
      referred: entry.referredBy !== null,
    }, entry.email, `tx:ea_welcome:${entry.id}`);

    await this.startJourney(entry.email, "early_access_nurture", {
      entry_id: entry.id,
      code: entry.code,
      position,
      status_token: statusToken,
    });

    // Referrer side: their queue moved — tell them.
    const referrerId = typeof p.referrer_entry_id === "string" ? p.referrer_entry_id : null;
    if (referrerId !== null) {
      const referrer = await this.repo.findEarlyAccessEntry(referrerId);
      if (referrer !== null) {
        const referrals = await this.repo.countVerifiedReferrals(referrer.id);
        await this.dispatch(T.eaReferralJump, {
          position: effectivePosition(referrer.basePosition, referrals),
          referralsVerified: referrals,
          jumps: jumpsFor(referrals),
          code: referrer.code,
          statusToken: signStatusToken({ e: referrer.email }, this.cfg.statusTokenSecret),
        }, referrer.email, `lc:ea_jump:${env.event_id}`);
      }
    }
  }

  /* ---------- orders & payments ---------- */

  private async onOrderCreated(p: Record<string, unknown>): Promise<void> {
    const { orderId, email } = orderIdEmail(p);
    if (orderId === null || email === null) return;
    await this.repo.upsertContact({ email, source: "checkout" });
    await this.dispatch(T.orderCreated, {
      orderId,
      priceUsd: typeof p.price_usd === "number" ? p.price_usd : LTD.PRICE_USD_DEFAULT,
      expiresAtIso: typeof p.expires_at === "string" ? p.expires_at : this.now().toISOString(),
      statusToken: signStatusToken({ o: orderId }, this.cfg.statusTokenSecret),
    }, email, `tx:order_created:${orderId}`);
  }

  private async onPaymentFinished(p: Record<string, unknown>): Promise<void> {
    const { orderId, email } = orderIdEmail(p);
    if (orderId === null || email === null) return;
    const sku = typeof p.sku === "string" ? p.sku : LTD.SKU;
    await this.repo.upsertContact({
      email,
      source: "purchase",
      founding: true,
      packageSku: sku,
      purchasedAt: this.now(),
    });
    await this.repo.cancelJourneys(email, ["early_access_nurture"]);
    await this.dispatch(T.purchaseConfirmed, {
      orderId,
      priceUsd: typeof p.price_usd === "number" ? p.price_usd : LTD.PRICE_USD_DEFAULT,
      packageName: PACKAGES[sku]?.name ?? "Founding Hero — Lifetime Pro",
      statusToken: signStatusToken({ o: orderId }, this.cfg.statusTokenSecret),
    }, email, `tx:purchase:${orderId}`);
    await this.startJourney(email, "founding_onboarding", { order_id: orderId });
  }

  private async onPaymentFailed(p: Record<string, unknown>): Promise<void> {
    const { orderId, email } = orderIdEmail(p);
    if (orderId === null || email === null) return;
    await this.dispatch(T.paymentIssue, {
      orderId,
      statusToken: signStatusToken({ o: orderId }, this.cfg.statusTokenSecret),
    }, email, `tx:payfail:${orderId}`);
  }

  private async onOrderExpired(p: Record<string, unknown>): Promise<void> {
    const { orderId, email } = orderIdEmail(p);
    if (orderId === null || email === null) return;
    await this.dispatch(T.orderExpired, {
      orderId,
      priceUsd: LTD.PRICE_USD_DEFAULT,
    }, email, `tx:expired:${orderId}`);
  }

  private async onRefunded(p: Record<string, unknown>): Promise<void> {
    const { orderId, email } = orderIdEmail(p);
    if (orderId === null || email === null) return;
    await this.repo.cancelJourneys(email, ["founding_onboarding"]);
    await this.dispatch(T.refundConfirmed, { orderId }, email, `tx:refund:${orderId}`);
  }

  /* ---------- identity ---------- */

  private async onUserRegistered(p: Record<string, unknown>): Promise<void> {
    const userId = typeof p.user_id === "string" ? p.user_id : null;
    const email = typeof p.email === "string" ? p.email.toLowerCase() : null;
    if (userId === null || email === null) return;
    const displayName = typeof p.display_name === "string" ? p.display_name : undefined;
    const founding = p.founding === true;
    await this.repo.upsertContact({
      email,
      source: "platform",
      userId,
      displayName,
      founding,
      packageSku: typeof p.package_sku === "string" ? p.package_sku : undefined,
      registeredAt: this.now(),
    });
    await this.repo.cancelJourneys(email, ["early_access_nurture", "founding_onboarding"]);
    await this.dispatch(T.platformWelcome, {
      displayName: displayName ?? null,
      founding,
    }, email, `tx:welcome:${userId}`);
    await this.startJourney(email, "member_activation", {
      user_id: userId,
      display_name: displayName ?? null,
      founding,
    });
  }

  /* ---------- academy ---------- */

  private async onNudgeDaily(env: EventEnvelope, p: Record<string, unknown>): Promise<void> {
    const n = nudgeBase(p);
    if (n === null) return;
    await this.dispatch(T.academyNudgeDaily, {
      displayName: n.displayName,
      streakDays: n.streakDays,
      xp: n.xp,
    }, n.email, `lc:nudge_daily:${n.userId}:${env.occurred_at.slice(0, 10)}`);
  }

  private async onNudgeWeekly(env: EventEnvelope, p: Record<string, unknown>): Promise<void> {
    const n = nudgeBase(p);
    if (n === null) return;
    await this.dispatch(T.academyNudgeWeekly, {
      displayName: n.displayName,
      completedCount: typeof p.completed_count === "number" ? p.completed_count : 0,
      totalLessons: typeof p.total_lessons === "number" ? p.total_lessons : ACADEMY_LESSONS.length,
      nextSlug: typeof p.next_slug === "string" ? p.next_slug : ACADEMY_LESSONS[0].slug,
      xp: n.xp,
    }, n.email, `lc:nudge_weekly:${n.userId}:${env.occurred_at.slice(0, 10)}`);
  }

  private async onNudgeMonthly(env: EventEnvelope, p: Record<string, unknown>): Promise<void> {
    const n = nudgeBase(p);
    if (n === null) return;
    await this.dispatch(T.academyNudgeMonthly, {
      displayName: n.displayName,
      xp: n.xp,
    }, n.email, `lc:nudge_monthly:${n.userId}:${env.occurred_at.slice(0, 10)}`);
  }

  private async onCertificateIssued(p: Record<string, unknown>): Promise<void> {
    const userId = typeof p.user_id === "string" ? p.user_id : null;
    const track = typeof p.track === "string" ? p.track : null;
    const code = typeof p.code === "string" ? p.code : null;
    if (userId === null || track === null || code === null) return;
    const identity = await this.repo.findAcademyIdentity(userId);
    if (identity === null) return;
    const trackName = track === "foundations" ? "Foundations" : "Hero Trader";
    await this.dispatch(T.academyCertificate, {
      displayName: identity.displayName,
      track: trackName,
      code,
      xp: typeof p.xp_at_issue === "number" ? p.xp_at_issue : identity.xp,
    }, identity.email, `tx:cert:${userId}:${track}`);
  }

  private async onLessonCompleted(p: Record<string, unknown>): Promise<void> {
    const userId = typeof p.user_id === "string" ? p.user_id : null;
    if (userId === null) return;
    const identity = await this.repo.findAcademyIdentity(userId);
    if (identity === null) return;
    await this.repo.upsertContact({
      email: identity.email,
      source: "academy",
      userId,
      displayName: identity.displayName,
      lastLessonAt: this.now(),
    });
  }

  /* ---------- trading ---------- */

  private async onTradeFilled(p: Record<string, unknown>): Promise<void> {
    const userId = typeof p.user_id === "string" ? p.user_id : null;
    if (userId === null) return;
    const contact = await this.repo.findContactByUserId(userId);
    if (contact === null || contact.firstTradeAt !== null) return;
    await this.repo.upsertContact({ email: contact.email, source: contact.source, firstTradeAt: this.now() });
  }

  /* =======================================================================
   * Sweeper — due journey steps + weekly digest
   * ===================================================================== */

  async sweep(now: Date = this.now()): Promise<void> {
    const due = await this.repo.dueJourneys(now, SWEEP_BATCH);
    for (const row of due) {
      try {
        await this.runJourneyStep(row);
      } catch (err) {
        this.logger.warn(`journey step failed (${row.journey}#${row.step}): ${msg(err)}`);
      }
    }
    await this.sweepDigest(now);
  }

  private async runJourneyStep(row: JourneyRow): Promise<void> {
    const def = JOURNEYS[row.journey];
    const step = def.steps[row.step];
    if (step === undefined) {
      await this.repo.advanceJourney(row.id, row.step, null, "completed");
      return;
    }

    const contact = await this.repo.findContactByEmail(row.email);
    const outcome = await this.journeyStepAction(row, contact);
    if (outcome !== "skip") {
      await this.dispatch(outcome.def, outcome.props, row.email, `jny:${row.id}:${row.step}`);
    }

    const nextStep = row.step + 1;
    const nextDef = def.steps[nextStep];
    await this.repo.advanceJourney(
      row.id,
      nextStep,
      nextDef !== undefined ? stepRunAt(row.startedAt, nextDef.delayDays) : null,
      nextDef !== undefined ? "active" : "completed",
    );
  }

  /**
   * Resolves a journey step to (template, props) or "skip". Goal-reached
   * safety nets live here too, in case a cancel event was missed.
   */
  private async journeyStepAction(
    row: JourneyRow,
    contact: ContactRow | null,
  ): Promise<{ def: TemplateDef<never>; props: never } | "skip"> {
    const ctx = row.context;
    const pick = <P,>(def: TemplateDef<P>, props: P): { def: TemplateDef<never>; props: never } =>
      ({ def, props }) as unknown as { def: TemplateDef<never>; props: never };

    if (row.journey === "early_access_nurture") {
      // Converted already? The nurture's job is done regardless of cancel timing.
      if (contact?.purchasedAt || contact?.registeredAt) return "skip";
      const props: T.EaJourneyProps = {
        position: typeof ctx.position === "number" ? ctx.position : 0,
        code: typeof ctx.code === "string" ? ctx.code : "",
        statusToken: typeof ctx.status_token === "string" ? ctx.status_token : "",
        priceUsd: LTD.PRICE_USD_DEFAULT,
        seatCap: LTD.SEAT_CAP,
      };
      const key = JOURNEYS.early_access_nurture.steps[row.step].templateKey;
      switch (key) {
        case "ea_d1_story": return pick(T.eaD1Story, props);
        case "ea_d3_academy": return pick(T.eaD3Academy, props);
        case "ea_d5_founding": return pick(T.eaD5Founding, props);
        case "ea_d8_referral": return pick(T.eaD8Referral, props);
        case "ea_d12_proof": {
          const week = await this.repo.getSignalWeek(isoWeek(previousWeek(this.now())));
          return pick(T.eaD12Proof, {
            ...props,
            weekGenerated: week?.generated ?? 0,
            weekTargetHit: week?.targetHit ?? 0,
          });
        }
        case "ea_d19_lastcall": return pick(T.eaD19LastCall, props);
        default: return "skip";
      }
    }

    if (row.journey === "founding_onboarding") {
      if (contact?.registeredAt) return "skip"; // redeemed — reminders are moot
      const props: T.FoJourneyProps = {
        orderId: typeof ctx.order_id === "string" ? ctx.order_id : "",
      };
      const key = JOURNEYS.founding_onboarding.steps[row.step].templateKey;
      return key === "fo_d1_redeem" ? pick(T.foD1Redeem, props) : pick(T.foD3Redeem, props);
    }

    // member_activation
    const props: T.MaJourneyProps = {
      displayName: typeof ctx.display_name === "string" ? ctx.display_name : null,
      founding: ctx.founding === true,
    };
    const userId = typeof ctx.user_id === "string" ? ctx.user_id : null;
    const key = JOURNEYS.member_activation.steps[row.step].templateKey;
    switch (key) {
      case "ma_d2_academy":
        if (userId !== null && (await this.repo.anyLessonComplete(userId))) return "skip";
        return pick(T.maD2Academy, props);
      case "ma_d5_paper":
        if (contact?.firstTradeAt) return "skip";
        return pick(T.maD5Paper, props);
      case "ma_d10_broker":
        return pick(T.maD10Broker, props);
      default:
        return "skip";
    }
  }

  /** Monday ≥ SEND_HOUR_UTC: last ISO week's engine recap to the whole list. */
  private async sweepDigest(now: Date): Promise<void> {
    if (now.getUTCDay() !== 1 || now.getUTCHours() < SEND_HOUR_UTC) return;
    const week = isoWeek(previousWeek(now));
    if (this.lastDigestWeek === week) return; // per-process fast path; ledger dedupes across restarts
    const counters = await this.repo.getSignalWeek(week);
    if (counters === null || counters.generated === 0) {
      this.lastDigestWeek = week;
      return;
    }

    let after: string | null = null;
    for (;;) {
      const page: ContactRow[] = await this.repo.listAudience(after, DIGEST_PAGE);
      if (page.length === 0) break;
      for (const contact of page) {
        await this.dispatch(T.weeklyDigest, {
          week,
          generated: counters.generated,
          targetHit: counters.targetHit,
          stopped: counters.stopped,
          registered: contact.registeredAt !== null,
        }, contact.email, `lc:digest:${week}:${contact.email}`, { skipCap: true });
      }
      after = page[page.length - 1].email;
    }
    this.lastDigestWeek = week;
  }

  /* =======================================================================
   * Dispatch pipeline — the single choke point every email passes through
   * ===================================================================== */

  async dispatch<P>(
    def: TemplateDef<P>,
    props: P,
    to: string,
    dedupeKey: string,
    opts: { skipCap?: boolean } = {},
  ): Promise<DispatchResult> {
    const email = to.toLowerCase();
    const sendId = await this.repo.insertSend({
      email,
      template: def.key,
      category: def.category,
      dedupeKey,
    });
    if (sendId === null) return "deduped";

    if (def.category === "lifecycle") {
      if (await this.repo.isSuppressed(email)) {
        await this.repo.markSend(sendId, { status: "suppressed" });
        return "suppressed";
      }
      if (opts.skipCap !== true) {
        const last = await this.repo.lastLifecycleSendAt(email);
        if (last !== null && this.now().getTime() - last.getTime() < LIFECYCLE_MIN_GAP_MS) {
          await this.repo.markSend(sendId, { status: "capped" });
          return "capped";
        }
      }
    }

    const origin = this.cfg.publicOrigin;
    const link: LinkFactory = (path, content) => {
      const sep = path.includes("?") ? "&" : "?";
      const utm = `utm_source=email&utm_medium=${def.category}&utm_campaign=${encodeURIComponent(def.key)}${content ? `&utm_content=${encodeURIComponent(content)}` : ""}`;
      return `${origin}${path}${sep}${utm}`;
    };
    const unsubToken = signStatusToken({ e: email, a: "unsub" }, this.cfg.statusTokenSecret);
    const unsubscribeUrl = `${origin}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
    const oneClickUrl = `${origin}/api/mail/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    const trackedId = signTrackingId(sendId, this.cfg.statusTokenSecret);
    const rendered = renderEmail({
      subject: def.subject(props),
      preheader: def.preheader(props),
      blocks: def.blocks(props, link),
      reason: def.reason,
      ...(def.category === "lifecycle" ? { unsubscribeUrl } : {}),
      // M7: the id in a tracking URL is HMAC-tagged, so an open/click cannot be
      // forged or enumerated by walking send ids.
      openPixelUrl: `${origin}/api/mail/o/${trackedId}`,
      wrapLink: (url) => `${origin}/api/mail/c/${trackedId}?u=${encodeURIComponent(url)}`,
    });

    try {
      const { providerId } = await this.transport.send({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers:
          def.category === "lifecycle"
            ? {
                "List-Unsubscribe": `<${oneClickUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              }
            : undefined,
      });
      await this.repo.markSend(sendId, {
        status: "sent",
        subject: rendered.subject,
        providerId,
        sentAt: this.now(),
      });
      this.ga4.track(email, "email_sent", { template: def.key, category: def.category });
      return "sent";
    } catch (err) {
      await this.repo.markSend(sendId, { status: "failed", error: msg(err) });
      this.logger.warn(`send failed template=${def.key} to=${maskEmail(email)}: ${msg(err)}`);
      return "failed";
    }
  }

  /* =======================================================================
   * Public endpoints (unsubscribe, open pixel, click redirect)
   * ===================================================================== */

  async unsubscribe(token: string): Promise<UnsubscribeRes> {
    const payload = verifyStatusToken(token, this.cfg.statusTokenSecret);
    const email = payload?.a === "unsub" && typeof payload.e === "string" ? payload.e : null;
    if (email === null || email.length === 0) {
      throw apiError(401, "invalid_token", "This unsubscribe link is invalid or expired.");
    }
    await this.repo.suppress(email, "unsubscribe");
    this.ga4.track(email, "email_unsubscribe", {});
    return { ok: true, email_masked: maskEmail(email) };
  }

  /**
   * M7: an unverified or unknown id is a silent no-op — no DB write, no
   * analytics event, and the same 200 either way so the endpoint is not an
   * id-enumeration oracle. `recordOpen` already COALESCEs the first open, so a
   * genuine repeat hit (mail clients prefetch) stays idempotent.
   */
  async trackOpen(taggedId: string): Promise<{ ok: true }> {
    const sendId = verifyTrackingId(taggedId, this.cfg.statusTokenSecret);
    if (sendId === null) return { ok: true };
    const row = await this.repo.recordOpen(sendId, this.now()).catch(() => null);
    if (row !== null && row.openedAt !== null) {
      this.ga4.track(row.email, "email_open", { template: row.template });
    }
    return { ok: true };
  }

  /** Same rules as trackOpen; an unverified id still redirects, it just records nothing. */
  async trackClick(taggedId: string, url: string | undefined): Promise<{ to: string }> {
    const fallback = this.cfg.publicOrigin;
    const to = url !== undefined && url.startsWith(`${fallback}/`) ? url : fallback;
    const sendId = verifyTrackingId(taggedId, this.cfg.statusTokenSecret);
    if (sendId === null) return { to };
    const row = await this.repo.recordClick(sendId, this.now()).catch(() => null);
    if (row !== null) {
      this.ga4.track(row.email, "email_click", { template: row.template });
    }
    return { to };
  }
}

/* ---------- payload guards ---------- */

function orderIdEmail(p: Record<string, unknown>): { orderId: string | null; email: string | null } {
  return {
    orderId: typeof p.order_id === "string" ? p.order_id : null,
    email: typeof p.email === "string" && p.email.includes("@") ? p.email.toLowerCase() : null,
  };
}

function nudgeBase(
  p: Record<string, unknown>,
): { userId: string; email: string; displayName: string | null; streakDays: number; xp: number } | null {
  if (typeof p.user_id !== "string" || typeof p.email !== "string") return null;
  return {
    userId: p.user_id,
    email: p.email,
    displayName: typeof p.display_name === "string" ? p.display_name : null,
    streakDays: typeof p.streak_days === "number" ? p.streak_days : 0,
    xp: typeof p.xp === "number" ? p.xp : 0,
  };
}

function previousWeek(now: Date): Date {
  return new Date(now.getTime() - 7 * 86_400_000);
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
