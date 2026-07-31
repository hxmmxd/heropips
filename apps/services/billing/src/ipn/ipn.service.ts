import {
  NowPaymentsIpn,
  PAYMENT_EVENTS,
  PAYMENT_STATUS_RANK,
  type PaymentStatus,
} from "@heropips/contracts";
import { ApiException } from "../common/errors";
import type { BillingRepo, PaymentPatch } from "../db/repo";
import { paymentEvent } from "../outbox/outbox.service";
import { verifyIpn } from "./signature";

export type IpnResult = { ok: true; duplicate?: true; ignored?: true };

export class IpnService {
  constructor(
    private readonly repo: BillingRepo,
    private readonly ipnSecret: string,
  ) {}

  async handle(raw: Buffer | undefined, headerSig: string | undefined): Promise<IpnResult> {
    if (!raw || raw.length === 0) {
      throw new ApiException(403, "ipn_signature_invalid", "IPN signature verification failed.");
    }
    const { valid, body } = verifyIpn(raw, headerSig, this.ipnSecret);
    if (!valid) {
      throw new ApiException(403, "ipn_signature_invalid", "IPN signature verification failed.");
    }

    const parsed = NowPaymentsIpn.safeParse(body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.warn("[billing] ipn: signed body did not match expected shape — ignored");
      return { ok: true, ignored: true };
    }
    const ipn = parsed.data;

    // Idempotency: unique (payment_id, payment_status) — replays are acknowledged, not reapplied.
    const fresh = await this.repo.insertIpnEvent({
      paymentId: ipn.payment_id,
      paymentStatus: ipn.payment_status,
      orderId: ipn.order_id,
      raw: body,
      sigValid: true,
    });
    if (!fresh) return { ok: true, duplicate: true };

    const order = await this.repo.getOrder(ipn.order_id);
    if (!order) {
      // eslint-disable-next-line no-console
      console.warn(`[billing] ipn: unknown order_id ${ipn.order_id} — ignored`);
      return { ok: true, ignored: true };
    }

    const paidPatch: PaymentPatch = {};
    if (ipn.actually_paid !== undefined) paidPatch.actuallyPaid = ipn.actually_paid;
    if (ipn.purchase_id !== undefined) paidPatch.purchaseId = ipn.purchase_id;
    if (ipn.pay_currency !== undefined) paidPatch.payCurrency = ipn.pay_currency;

    const incoming = ipn.payment_status;
    // Status ladder: only a strictly higher rank advances the order.
    if (!(PAYMENT_STATUS_RANK[incoming] > PAYMENT_STATUS_RANK[order.paymentStatus])) {
      // partially_paid always records the amounts, even when it cannot advance the status.
      if (incoming === "partially_paid") {
        await this.repo.updatePayment(order.orderId, paidPatch);
      }
      return { ok: true, ignored: true };
    }

    await this.apply(incoming, order.orderId, order.seatState, paidPatch, {
      email: order.email,
      sku: order.sku,
      priceUsd: order.priceUsdMinor / 100,
    });
    return { ok: true };
  }

  private async apply(
    status: PaymentStatus,
    orderId: string,
    seatState: "held" | "granted" | "released",
    paidPatch: PaymentPatch,
    order: { email: string; sku: string; priceUsd: number },
  ): Promise<void> {
    switch (status) {
      case "finished": {
        const events = [
          paymentEvent(PAYMENT_EVENTS.finished, {
            order_id: orderId,
            email: order.email,
            sku: order.sku,
            price_usd: order.priceUsd,
          }),
        ];
        if (seatState === "held") {
          await this.repo.grantSeat(orderId, paidPatch, events);
        } else {
          await this.repo.updatePayment(orderId, { ...paidPatch, paymentStatus: "finished" }, events);
        }
        return;
      }
      case "expired":
      case "failed": {
        const events = [
          paymentEvent(PAYMENT_EVENTS[status], { order_id: orderId, email: order.email }),
        ];
        if (seatState === "held") {
          await this.repo.releaseHold(orderId, { ...paidPatch, paymentStatus: status }, events);
        } else {
          await this.repo.updatePayment(orderId, { ...paidPatch, paymentStatus: status }, events);
        }
        return;
      }
      case "refunded": {
        const events = [
          paymentEvent(PAYMENT_EVENTS.refunded, { order_id: orderId, email: order.email }),
        ];
        const patch: PaymentPatch = { ...paidPatch, paymentStatus: "refunded" };
        if (seatState === "granted") {
          await this.repo.refundRelease(orderId, patch, events); // post-grant refund frees the seat
        } else if (seatState === "held") {
          await this.repo.releaseHold(orderId, patch, events);
        } else {
          await this.repo.updatePayment(orderId, patch, events);
        }
        return;
      }
      default:
        // waiting / confirming / confirmed / sending / partially_paid — advance status only.
        await this.repo.updatePayment(orderId, { ...paidPatch, paymentStatus: status });
    }
  }
}
