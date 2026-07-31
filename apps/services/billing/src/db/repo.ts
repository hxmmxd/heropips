import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { PAYMENT_EVENTS, type EventEnvelope, type PaymentStatus } from "@heropips/contracts";
import { TENANT_ID } from "../common/config";
import type { Db } from "./client";
import { paymentEvent } from "../outbox/outbox.service";
import { ipnEvents, ltdSeats, orders, outbox } from "./schema";

/* ---------- row shapes ---------- */

export type SeatCounts = { cap: number; granted: number; held: number };

export type OrderRow = {
  orderId: string;
  email: string;
  sku: string;
  priceUsdMinor: number;
  paymentStatus: PaymentStatus;
  seatState: "held" | "granted" | "released";
  invoiceId: string | null;
  invoiceUrl: string | null;
  purchaseId: string | null;
  payCurrency: string | null;
  actuallyPaid: number | null;
  refCode: string | null;
  holdExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type NewOrder = {
  orderId: string;
  email: string;
  priceUsdMinor: number;
  payCurrency: string | null;
  refCode: string | null;
  holdExpiresAt: Date;
};

/** Fields an IPN may update on an order. `undefined` = leave unchanged. */
export type PaymentPatch = {
  paymentStatus?: PaymentStatus;
  actuallyPaid?: number;
  purchaseId?: string;
  payCurrency?: string;
};

export type OutboxInsert = { topic: string; envelope: EventEnvelope };
export type OutboxRow = { id: string; topic: string; payload: EventEnvelope };

export type IpnEventInsert = {
  paymentId: string;
  paymentStatus: string;
  orderId: string;
  raw: unknown;
  sigValid: boolean;
};

/* ---------- repo contract (FoundingService/IpnService depend on this) ---------- */

export interface BillingRepo {
  getSeats(): Promise<SeatCounts>;
  /**
   * Atomic hold + order insert in one tx. Oversell impossible:
   * UPDATE ltd_seats SET held = held + 1 WHERE granted + held < cap — no row -> sold_out.
   * Outbox events (order.created) land in the same tx.
   */
  createHeldOrder(order: NewOrder, events?: OutboxInsert[]): Promise<"created" | "sold_out">;
  /**
   * Live holds for one address (M6): seat_state = held and not yet expired.
   * Caps how much inventory a single email can take off the shelf at once.
   */
  countActiveHolds(email: string, now: Date): Promise<number>;
  getOrder(orderId: string): Promise<OrderRow | null>;
  setInvoice(orderId: string, invoiceId: string, invoiceUrl: string): Promise<void>;
  /** Patch payment fields; outbox events inserted in the same tx. */
  updatePayment(orderId: string, patch: PaymentPatch, events?: OutboxInsert[]): Promise<void>;
  /** held -> granted (+ payment_status finished); seats held-1 granted+1. False if not held. */
  grantSeat(orderId: string, patch: PaymentPatch, events?: OutboxInsert[]): Promise<boolean>;
  /** held -> released; seats held-1. Guarded — false if the order is not currently held. */
  releaseHold(orderId: string, patch: PaymentPatch, events?: OutboxInsert[]): Promise<boolean>;
  /** granted -> released (post-grant refund); seats granted-1. False if not granted. */
  refundRelease(orderId: string, patch: PaymentPatch, events?: OutboxInsert[]): Promise<boolean>;
  /** Unique on (payment_id, payment_status). False = duplicate delivery. */
  insertIpnEvent(event: IpnEventInsert): Promise<boolean>;
  /**
   * Release every hold past expires_at (unless finished). Returns released count.
   * Emits an order.hold_expired outbox event per released order in the same tx.
   */
  expireHolds(now: Date): Promise<number>;
  fetchUnsentOutbox(limit: number): Promise<OutboxRow[]>;
  markOutboxSent(ids: string[]): Promise<void>;
}

/* ---------- Postgres implementation ---------- */

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class PgBillingRepo implements BillingRepo {
  constructor(private readonly db: Db) {}

  async getSeats(): Promise<SeatCounts> {
    const [row] = await this.db
      .select({ cap: ltdSeats.cap, granted: ltdSeats.granted, held: ltdSeats.held })
      .from(ltdSeats)
      .where(eq(ltdSeats.tenantId, TENANT_ID));
    if (!row) throw new Error("ltd_seats row missing — boot migration did not run");
    return row;
  }

  async createHeldOrder(order: NewOrder, events: OutboxInsert[] = []): Promise<"created" | "sold_out"> {
    return this.db.transaction(async (tx) => {
      const res = await tx.execute(
        sql`UPDATE ltd_seats SET held = held + 1
            WHERE tenant_id = ${TENANT_ID} AND granted + held < cap
            RETURNING cap`,
      );
      if (res.rows.length === 0) return "sold_out" as const;
      await tx.insert(orders).values({
        id: randomUUID(),
        orderId: order.orderId,
        email: order.email,
        priceUsdMinor: order.priceUsdMinor,
        payCurrency: order.payCurrency,
        refCode: order.refCode,
        holdExpiresAt: order.holdExpiresAt,
      });
      await this.insertEvents(tx, events);
      return "created" as const;
    });
  }

  async countActiveHolds(email: string, now: Date): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.email, email),
          eq(orders.seatState, "held"),
          sql`${orders.holdExpiresAt} > ${now}`,
        ),
      );
    return row?.n ?? 0;
  }

  async getOrder(orderId: string): Promise<OrderRow | null> {
    const [row] = await this.db.select().from(orders).where(eq(orders.orderId, orderId));
    if (!row) return null;
    return {
      orderId: row.orderId,
      email: row.email,
      sku: row.sku,
      priceUsdMinor: row.priceUsdMinor,
      paymentStatus: row.paymentStatus as PaymentStatus,
      seatState: row.seatState as OrderRow["seatState"],
      invoiceId: row.invoiceId,
      invoiceUrl: row.invoiceUrl,
      purchaseId: row.purchaseId,
      payCurrency: row.payCurrency,
      actuallyPaid: row.actuallyPaid === null ? null : Number(row.actuallyPaid),
      refCode: row.refCode,
      holdExpiresAt: row.holdExpiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async setInvoice(orderId: string, invoiceId: string, invoiceUrl: string): Promise<void> {
    await this.db
      .update(orders)
      .set({ invoiceId, invoiceUrl, updatedAt: new Date() })
      .where(eq(orders.orderId, orderId));
  }

  private patchValues(patch: PaymentPatch): Record<string, unknown> {
    const v: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.paymentStatus !== undefined) v.paymentStatus = patch.paymentStatus;
    if (patch.actuallyPaid !== undefined) v.actuallyPaid = String(patch.actuallyPaid);
    if (patch.purchaseId !== undefined) v.purchaseId = patch.purchaseId;
    if (patch.payCurrency !== undefined) v.payCurrency = patch.payCurrency;
    return v;
  }

  private async insertEvents(tx: Tx, events: OutboxInsert[]): Promise<void> {
    if (events.length === 0) return;
    await tx.insert(outbox).values(
      events.map((e) => ({ id: randomUUID(), topic: e.topic, payload: e.envelope })),
    );
  }

  async updatePayment(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.update(orders).set(this.patchValues(patch)).where(eq(orders.orderId, orderId));
      await this.insertEvents(tx, events);
    });
  }

  async grantSeat(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({ ...this.patchValues(patch), paymentStatus: "finished", seatState: "granted" })
        .where(and(eq(orders.orderId, orderId), eq(orders.seatState, "held")))
        .returning({ id: orders.id });
      if (updated.length === 0) return false;
      await tx
        .update(ltdSeats)
        .set({ held: sql`${ltdSeats.held} - 1`, granted: sql`${ltdSeats.granted} + 1` })
        .where(eq(ltdSeats.tenantId, TENANT_ID));
      await this.insertEvents(tx, events);
      return true;
    });
  }

  async releaseHold(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({ ...this.patchValues(patch), seatState: "released" })
        .where(and(eq(orders.orderId, orderId), eq(orders.seatState, "held")))
        .returning({ id: orders.id });
      if (updated.length === 0) return false;
      await tx
        .update(ltdSeats)
        .set({ held: sql`${ltdSeats.held} - 1` })
        .where(eq(ltdSeats.tenantId, TENANT_ID));
      await this.insertEvents(tx, events);
      return true;
    });
  }

  async refundRelease(orderId: string, patch: PaymentPatch, events: OutboxInsert[] = []): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({ ...this.patchValues(patch), seatState: "released" })
        .where(and(eq(orders.orderId, orderId), eq(orders.seatState, "granted")))
        .returning({ id: orders.id });
      if (updated.length === 0) return false;
      await tx
        .update(ltdSeats)
        .set({ granted: sql`${ltdSeats.granted} - 1` })
        .where(eq(ltdSeats.tenantId, TENANT_ID));
      await this.insertEvents(tx, events);
      return true;
    });
  }

  async insertIpnEvent(event: IpnEventInsert): Promise<boolean> {
    const inserted = await this.db
      .insert(ipnEvents)
      .values({
        id: randomUUID(),
        paymentId: event.paymentId,
        paymentStatus: event.paymentStatus,
        orderId: event.orderId,
        raw: event.raw,
        sigValid: event.sigValid,
      })
      .onConflictDoNothing({ target: [ipnEvents.paymentId, ipnEvents.paymentStatus] })
      .returning({ id: ipnEvents.id });
    return inserted.length > 0;
  }

  async expireHolds(now: Date): Promise<number> {
    return this.db.transaction(async (tx) => {
      const released = await tx
        .update(orders)
        .set({ seatState: "released", paymentStatus: "expired", updatedAt: new Date() })
        .where(
          and(
            eq(orders.seatState, "held"),
            lt(orders.holdExpiresAt, now),
            // Only holds with NO payment in flight. `waiting` means the invoice
            // exists and nothing has arrived; any later status (confirming,
            // confirmed, sending, partially_paid, finished) means the buyer has
            // actually sent funds, and reclaiming that seat on a clock would
            // take the money and hand back nothing — that seat waits for the
            // chain, however slow it is. This is what makes the shortened
            // HOLD_TTL safe: only never-paid holds are reclaimed (M6).
            eq(orders.paymentStatus, "waiting"),
          ),
        )
        .returning({ orderId: orders.orderId, email: orders.email });
      if (released.length > 0) {
        await tx
          .update(ltdSeats)
          .set({ held: sql`${ltdSeats.held} - ${released.length}` })
          .where(eq(ltdSeats.tenantId, TENANT_ID));
        await this.insertEvents(
          tx,
          released.map((row) =>
            paymentEvent(PAYMENT_EVENTS.orderHoldExpired, {
              order_id: row.orderId,
              email: row.email,
            }),
          ),
        );
      }
      return released.length;
    });
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
