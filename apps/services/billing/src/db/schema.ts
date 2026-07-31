import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const ltdSeats = pgTable("ltd_seats", {
  tenantId: text("tenant_id").primaryKey().default("heropips"),
  cap: integer("cap").notNull(),
  granted: integer("granted").notNull().default(0),
  held: integer("held").notNull().default(0),
  checksum: text("checksum"),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  tenantId: text("tenant_id").notNull().default("heropips"),
  email: text("email").notNull(),
  sku: text("sku").notNull().default("ltd_founding"),
  priceUsdMinor: integer("price_usd_minor").notNull(),
  paymentStatus: text("payment_status").notNull().default("waiting"),
  seatState: text("seat_state").notNull().default("held"),
  invoiceId: text("invoice_id"),
  invoiceUrl: text("invoice_url"),
  purchaseId: text("purchase_id"),
  payCurrency: text("pay_currency"),
  actuallyPaid: numeric("actually_paid"),
  refCode: text("ref_code"),
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ipnEvents = pgTable(
  "ipn_events",
  {
    id: uuid("id").primaryKey(),
    paymentId: text("payment_id"),
    paymentStatus: text("payment_status"),
    orderId: text("order_id"),
    raw: jsonb("raw").notNull(),
    sigValid: boolean("sig_valid"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("ipn_events_payment_id_payment_status_key").on(t.paymentId, t.paymentStatus)],
);

export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
