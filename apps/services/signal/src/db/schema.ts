import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per generated signal — columns mirror the SignalRes contract.
 * "One ACTIVE signal per symbol" is enforced by a partial unique index
 * (signals_one_active_per_symbol_uq) created in migrate.ts.
 */
export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull().default("heropips"),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // CHECK in ('buy','sell') via migrate.ts
  confidence: doublePrecision("confidence").notNull(),
  entry: doublePrecision("entry").notNull(),
  stop: doublePrecision("stop").notNull(),
  target: doublePrecision("target").notNull(),
  horizonMin: integer("horizon_min").notNull(),
  rationale: text("rationale").notNull(),
  modelVersion: text("model_version").notNull(),
  dataSource: text("data_source").notNull(),
  status: text("status").notNull().default("active"), // CHECK via migrate.ts
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
