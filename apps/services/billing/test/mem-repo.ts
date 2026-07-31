import { randomUUID } from "node:crypto";
import { PAYMENT_EVENTS, type EventEnvelope } from "@heropips/contracts";
import { paymentEvent } from "../src/outbox/outbox.service";
import type {
  BillingRepo,
  IpnEventInsert,
  NewOrder,
  OrderRow,
  OutboxInsert,
  OutboxRow,
  PaymentPatch,
  SeatCounts,
} from "../src/db/repo";

/** In-memory BillingRepo with the exact same state guards as the Pg implementation. */
export class MemRepo implements BillingRepo {
  seatsRow: SeatCounts;
  orders = new Map<string, OrderRow>();
  ipnKeys = new Set<string>();
  outboxRows: Array<{ id: string; topic: string; payload: EventEnvelope; sentAt: Date | null }> = [];

  constructor(cap: number) {
    this.seatsRow = { cap, granted: 0, held: 0 };
  }

  async countActiveHolds(email: string, now: Date): Promise<number> {
    let n = 0;
    for (const row of this.orders.values()) {
      if (row.email === email && row.seatState === "held" && row.holdExpiresAt > now) n += 1;
    }
    return n;
  }

  async getSeats(): Promise<SeatCounts> {
    return { ...this.seatsRow };
  }

  async createHeldOrder(order: NewOrder, events: OutboxInsert[] = []): Promise<"created" | "sold_out"> {
    if (this.seatsRow.granted + this.seatsRow.held >= this.seatsRow.cap) return "sold_out";
    this.seatsRow.held += 1;
    const now = new Date();
    this.orders.set(order.orderId, {
      orderId: order.orderId,
      email: order.email,
      sku: "ltd_founding",
      priceUsdMinor: order.priceUsdMinor,
      paymentStatus: "waiting",
      seatState: "held",
      invoiceId: null,
      invoiceUrl: null,
      purchaseId: null,
      payCurrency: order.payCurrency,
      actuallyPaid: null,
      refCode: order.refCode,
      holdExpiresAt: order.holdExpiresAt,
      createdAt: now,
      updatedAt: now,
    });
    this.pushEvents(events);
    return "created";
  }

  async getOrder(orderId: string): Promise<OrderRow | null> {
    const row = this.orders.get(orderId);
    return row ? { ...row } : null;
  }

  async setInvoice(orderId: string, invoiceId: string, invoiceUrl: string): Promise<void> {
    const row = this.orders.get(orderId);
    if (!row) return;
    row.invoiceId = invoiceId;
    row.invoiceUrl = invoiceUrl;
    row.updatedAt = new Date();
  }

  private applyPatch(row: OrderRow, patch: PaymentPatch): void {
    if (patch.paymentStatus !== undefined) row.paymentStatus = patch.paymentStatus;
    if (patch.actuallyPaid !== undefined) row.actuallyPaid = patch.actuallyPaid;
    if (patch.purchaseId !== undefined) row.purchaseId = patch.purchaseId;
    if (patch.payCurrency !== undefined) row.payCurrency = patch.payCurrency;
    row.updatedAt = new Date();
  }

  private pushEvents(events: OutboxInsert[]): void {
    for (const e of events) {
      this.outboxRows.push({ id: randomUUID(), topic: e.topic, payload: e.envelope, sentAt: null });
    }
  }

  async updatePayment(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<void> {
    const row = this.orders.get(orderId);
    if (row) this.applyPatch(row, patch);
    this.pushEvents(events);
  }

  async grantSeat(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<boolean> {
    const row = this.orders.get(orderId);
    if (!row || row.seatState !== "held") return false;
    this.applyPatch(row, patch);
    row.paymentStatus = "finished";
    row.seatState = "granted";
    this.seatsRow.held -= 1;
    this.seatsRow.granted += 1;
    this.pushEvents(events);
    return true;
  }

  async releaseHold(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<boolean> {
    const row = this.orders.get(orderId);
    if (!row || row.seatState !== "held") return false;
    this.applyPatch(row, patch);
    row.seatState = "released";
    this.seatsRow.held -= 1;
    this.pushEvents(events);
    return true;
  }

  async refundRelease(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<boolean> {
    const row = this.orders.get(orderId);
    if (!row || row.seatState !== "granted") return false;
    this.applyPatch(row, patch);
    row.seatState = "released";
    this.seatsRow.granted -= 1;
    this.pushEvents(events);
    return true;
  }

  async insertIpnEvent(event: IpnEventInsert): Promise<boolean> {
    const key = `${event.paymentId}::${event.paymentStatus}`;
    if (this.ipnKeys.has(key)) return false;
    this.ipnKeys.add(key);
    return true;
  }

  async expireHolds(now: Date): Promise<number> {
    let released = 0;
    for (const row of this.orders.values()) {
      if (
        row.seatState === "held" &&
        row.holdExpiresAt < now &&
        // Mirrors the Pg predicate: only never-paid holds expire (M6).
        row.paymentStatus === "waiting"
      ) {
        row.seatState = "released";
        row.paymentStatus = "expired";
        row.updatedAt = new Date();
        this.seatsRow.held -= 1;
        released += 1;
        this.pushEvents([
          paymentEvent(PAYMENT_EVENTS.orderHoldExpired, { order_id: row.orderId, email: row.email }),
        ]);
      }
    }
    return released;
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

  /** Test helper: outbox event types in insertion order. */
  eventTypes(): string[] {
    return this.outboxRows.map((r) => r.payload.type);
  }
}
