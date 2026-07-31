import { z } from "zod";
import { randomBytes } from "node:crypto";
import {
  CheckoutReq,
  isRedeemable,
  LTD,
  PAYMENT_EVENTS,
  type CheckoutRes,
  type OrderStatusRes,
  type SeatsRes,
} from "@heropips/contracts";
import type { BillingConfig } from "../common/config";
import { ApiException } from "../common/errors";
import { TokenBucket } from "../common/rate-limit";
import { signStatusToken, verifyStatusToken } from "../common/token";
import type { BillingRepo } from "../db/repo";
import type { InvoiceClient } from "../nowpayments/client";
import { paymentEvent } from "../outbox/outbox.service";

/** Request-scoped facts the HTTP layer resolves (client IP, verified-email token). */
export type CheckoutContext = { ip?: string; verifyToken?: string };

export class FoundingService {
  /**
   * Hold creations per client IP per hold window. Not a DB count: nothing
   * persists the caller's IP, and a per-window creation cap has the same effect
   * as a concurrency cap when every hold expires inside that window.
   */
  private readonly holdsByIp: TokenBucket;

  constructor(
    private readonly repo: BillingRepo,
    private readonly invoices: InvoiceClient,
    private readonly cfg: BillingConfig,
  ) {
    this.holdsByIp = new TokenBucket(cfg.maxHoldsPerIp, cfg.holdTtlMinutes * 60_000);
  }

  async seats(): Promise<SeatsRes> {
    const s = await this.repo.getSeats();
    return {
      cap: s.cap,
      remaining: Math.max(0, s.cap - s.granted - s.held),
      held: s.held,
    };
  }

  /**
   * M6 — seat-hold exhaustion. A hold is real inventory: `seats()` subtracts it
   * from `remaining`, so unauthenticated checkouts could drive the storefront to
   * "sold out" for the whole hold window and turn real buyers away. Three
   * controls, none of which touch a genuine first-time buyer:
   *   1. concurrent holds per email (default 2 — one retry after a wrong coin),
   *   2. hold creations per client IP per hold window (default 5 — a household
   *      or office can still buy, an exhaustion run cannot),
   *   3. hold TTL cut from 120 to 20 minutes, so anything that slips through is
   *      reclaimed six times faster.
   * A growth-issued verified-email token is honoured when supplied and REQUIRED
   * only when LTD_REQUIRE_VERIFIED_CHECKOUT=true (off by default: gating a live
   * paid funnel on email verification is a conversion decision, not a security
   * one).
   */
  async checkout(input: unknown, ctx: CheckoutContext = {}): Promise<CheckoutRes> {
    const parsed = CheckoutReq.safeParse(input);
    if (!parsed.success) {
      throw new ApiException(
        422,
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid request.",
        "Check the request body and retry.",
      );
    }
    const req = parsed.data;

    const verifiedPayload = ctx.verifyToken
      ? verifyStatusToken(ctx.verifyToken, this.cfg.statusTokenSecret)
      : null;
    const verifiedEmail = verifiedPayload === null ? undefined : verifiedPayload.e;
    const emailVerified = typeof verifiedEmail === "string" && verifiedEmail.toLowerCase() === req.email;
    if (this.cfg.requireVerifiedCheckout && !emailVerified) {
      throw new ApiException(
        401,
        "verification_required",
        "Verify your email address before reserving a seat.",
        "Request an early-access code, verify it, then check out again.",
      );
    }

    const now = new Date();
    const activeHolds = await this.repo.countActiveHolds(req.email, now);
    if (activeHolds >= this.cfg.maxHoldsPerEmail) {
      throw new ApiException(
        429,
        "rate_limited",
        "You already have a seat reserved and awaiting payment.",
        "Finish or cancel that payment — the reservation frees up automatically.",
      );
    }
    // Verified buyers skip the IP cap: a verified address is already scarce, and
    // a shared NAT (office, campus, mobile carrier) must never block a purchase.
    if (!emailVerified && ctx.ip !== undefined && !this.holdsByIp.allow(ctx.ip)) {
      throw new ApiException(
        429,
        "rate_limited",
        "Too many seat reservations from this network.",
        "Complete a pending payment, or try again shortly.",
      );
    }

    const orderId = `hp_ltd_${randomBytes(6).toString("hex")}`;
    const expiresAt = new Date(now.getTime() + this.cfg.holdTtlMinutes * 60_000);
    const created = await this.repo.createHeldOrder(
      {
        orderId,
        email: req.email,
        priceUsdMinor: Math.round(this.cfg.ltdPriceUsd * 100),
        payCurrency: req.pay_currency ?? null,
        refCode: req.ref ? req.ref.toUpperCase() : null,
        holdExpiresAt: expiresAt,
      },
      [
        paymentEvent(PAYMENT_EVENTS.orderCreated, {
          order_id: orderId,
          email: req.email,
          sku: LTD.SKU,
          price_usd: this.cfg.ltdPriceUsd,
          expires_at: expiresAt.toISOString(),
        }),
      ],
    );
    if (created === "sold_out") {
      throw new ApiException(
        410,
        "ltd_sold_out",
        "All Founding Hero seats are taken.",
        "Join the early access list to hear about future openings.",
      );
    }

    const statusToken = signStatusToken({ o: orderId }, this.cfg.statusTokenSecret);

    let invoice;
    try {
      invoice = await this.invoices.createInvoice({
        price_amount: this.cfg.ltdPriceUsd,
        price_currency: "usd",
        order_id: orderId,
        order_description: "HeroPips Founding Hero — lifetime access",
        ipn_callback_url: this.cfg.ipnCallbackUrl,
        success_url: `${this.cfg.publicOrigin}/founding/status?token=${encodeURIComponent(statusToken)}`,
        cancel_url: `${this.cfg.publicOrigin}/founding`,
        ...(req.pay_currency ? { pay_currency: req.pay_currency } : {}),
      });
    } catch {
      // The hold must not leak: roll it back before surfacing the failure.
      await this.repo.releaseHold(orderId, {});
      throw new ApiException(
        502,
        "invoice_create_failed",
        "Could not create the payment invoice.",
        "Try again in a moment.",
      );
    }

    await this.repo.setInvoice(orderId, invoice.id, invoice.invoiceUrl);

    return {
      order_id: orderId,
      invoice_url: invoice.invoiceUrl,
      price_usd: this.cfg.ltdPriceUsd,
      expires_at: expiresAt.toISOString(),
      status_token: statusToken,
    };
  }

  async status(token: string | undefined): Promise<OrderStatusRes> {
    const payload = token ? verifyStatusToken(token, this.cfg.statusTokenSecret) : null;
    const orderId = payload && typeof payload.o === "string" ? payload.o : null;
    const order = orderId ? await this.repo.getOrder(orderId) : null;
    if (!order) {
      throw new ApiException(
        401,
        "invalid_token",
        "Status token is missing or invalid.",
        "Use the link from your checkout confirmation.",
      );
    }
    return {
      order_id: order.orderId,
      email: order.email,
      sku: "ltd_founding",
      payment_status: order.paymentStatus,
      seat_state: order.seatState,
      price_usd: order.priceUsdMinor / 100,
      invoice_url: order.invoiceUrl,
      actually_paid: order.actuallyPaid,
      pay_currency: order.payCurrency,
      purchase_id: order.purchaseId,
      updated_at: order.updatedAt.toISOString(),
    };
  }

  /**
   * Internal check used by identity-svc during access redemption:
   * order exists, email matches (case-insensitive), payment is
   * confirmed/finished. Always 200 — {ok:false} carries no detail.
   */
  async verifyPurchase(input: unknown): Promise<FoundingVerifyRes> {
    const parsed = FoundingVerifyReq.safeParse(input);
    if (!parsed.success) return { ok: false };
    const order = await this.repo.getOrder(parsed.data.order_id);
    if (!order) return { ok: false };
    if (order.email.toLowerCase() !== parsed.data.email) return { ok: false };
    if (!isRedeemable(order.paymentStatus)) return { ok: false };
    return { ok: true, sku: order.sku };
  }
}

const FoundingVerifyReq = z.object({
  email: z.string().trim().toLowerCase().max(320),
  order_id: z.string().trim().min(1).max(120),
});

export type FoundingVerifyRes = { ok: false } | { ok: true; sku: string };
