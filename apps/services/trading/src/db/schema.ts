import {
  bigint,
  doublePrecision,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  broker: text("broker").notNull(), // CHECK via migrate.ts
  label: text("label").notNull(),
  mode: text("mode").notNull(), // paper | live
  status: text("status").notNull(), // active | pending | error
  statusDetail: text("status_detail"),
  balanceUsdMinor: bigint("balance_usd_minor", { mode: "number" }).notNull().default(0),
  credCipher: text("cred_cipher"), // base64(iv || tag || AES-256-GCM ciphertext)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull(),
  connectionId: uuid("connection_id").notNull(), // FK + UNIQUE (connection_id, symbol) via migrate.ts
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // long | short
  qty: doublePrecision("qty").notNull(),
  avgEntry: doublePrecision("avg_entry").notNull(),
  entryFeesUsdMinor: bigint("entry_fees_usd_minor", { mode: "number" }).notNull().default(0),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  signalId: text("signal_id"),
});

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  connectionId: uuid("connection_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  qty: doublePrecision("qty").notNull(),
  entry: doublePrecision("entry").notNull(),
  exit: doublePrecision("exit").notNull(),
  rplUsdMinor: bigint("rpl_usd_minor", { mode: "number" }).notNull(),
  feesUsdMinor: bigint("fees_usd_minor", { mode: "number" }).notNull(),
  signalId: text("signal_id"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(), // UNIQUE (user_id, idempotency_key) via migrate.ts
  response: jsonb("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equitySnapshots = pgTable("equity_snapshots", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  equityUsdMinor: bigint("equity_usd_minor", { mode: "number" }).notNull(),
});

export const dayAnchors = pgTable(
  "day_anchors",
  {
    userId: text("user_id").notNull(),
    day: text("day").notNull(), // UTC YYYY-MM-DD
    dayStartEquityUsdMinor: bigint("day_start_equity_usd_minor", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
