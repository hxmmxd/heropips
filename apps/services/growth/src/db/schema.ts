import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type {
  AcademyCertTrack,
  AcademyCompletionEntry,
  AcademyGameState,
  TraderProfile,
} from "@heropips/contracts";

// physical name kept from the original waitlist implementation — renaming requires a data migration
export const earlyAccessEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull().default("heropips"),
  email: text("email").notNull(), // unique on lower(email) via migrate.ts
  code: text("code").notNull(), // unique via migrate.ts
  referredBy: uuid("referred_by").references((): AnyPgColumn => earlyAccessEntries.id),
  basePosition: integer("base_position").notNull(),
  utm: jsonb("utm").$type<Record<string, string>>(),
  profile: jsonb("profile").$type<TraderProfile | null>(),
  /** Set when the 6-digit email code was accepted — every row has one. */
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Pending email verifications: one row per address, replaced on each resend. */
export const earlyAccessVerifications = pgTable("early_access_verifications", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  sends: integer("sends").notNull().default(1),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const affiliateApplications = pgTable("affiliate_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull().default("heropips"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  channel: text("channel").notNull(),
  audienceSize: text("audience_size").notNull(),
  geo: text("geo").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

/** Single-row (per tenant) payout config; closure depth is NOT governed by this. */
export const referralProgramConfig = pgTable("referral_program_config", {
  tenantId: text("tenant_id").primaryKey().default("heropips"),
  maxLevels: integer("max_levels").notNull().default(5), // CHECK 1..10 via migrate.ts
  levelRatesBps: integer("level_rates_bps").array().notNull().default([2000, 1000, 500, 300, 200]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One referrer per user, forever. CHECK (child_id <> parent_id) via migrate.ts. */
export const referralEdges = pgTable("referral_edges", {
  childId: text("child_id").primaryKey(),
  parentId: text("parent_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Closure table capped at depth 10 (REFERRAL.MAX_LEVELS); CHECK via migrate.ts. */
export const referralAncestors = pgTable(
  "referral_ancestors",
  {
    descendantId: text("descendant_id").notNull(),
    ancestorId: text("ancestor_id").notNull(),
    depth: integer("depth").notNull(),
  },
  (t) => [primaryKey({ columns: [t.descendantId, t.ancestorId] })],
);

export const referralCommissions = pgTable("referral_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: text("order_id").notNull(),
  beneficiaryId: text("beneficiary_id").notNull(),
  level: integer("level").notNull(),
  rateBps: integer("rate_bps").notNull(),
  amountUsdMinor: integer("amount_usd_minor").notNull(),
  status: text("status").notNull().default("accrued"), // CHECK in ('accrued','reversed') via migrate.ts
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // UNIQUE (order_id, beneficiary_id, level) via migrate.ts — attribution idempotency key.
});

/* ---------- academy (gamified trading school) ---------- */

/** One row per user; XP/streak/completions are server-authoritative. */
export const academyProgress = pgTable("academy_progress", {
  userId: text("user_id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("heropips"),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  xp: integer("xp").notNull().default(0), // CHECK (xp >= 0) via migrate.ts
  streakDays: integer("streak_days").notNull().default(0),
  streakBest: integer("streak_best").notNull().default(0),
  lastActiveDate: date("last_active_date", { mode: "string" }), // UTC day, "YYYY-MM-DD"
  spinLastDate: date("spin_last_date", { mode: "string" }),
  referralCode: text("referral_code").notNull(), // unique via migrate.ts
  referredBy: text("referred_by"), // referrer user_id, set once ever
  completions: jsonb("completions").$type<Record<string, AcademyCompletionEntry>>().notNull().default({}),
  games: jsonb("games").$type<Record<string, AcademyGameState>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const academyCertificates = pgTable("academy_certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(), // HP-XXXXX-XXXXX, unique via migrate.ts
  userId: text("user_id").notNull(),
  track: text("track").$type<AcademyCertTrack>().notNull(), // CHECK via migrate.ts
  recipient: text("recipient").notNull(),
  xpAtIssue: integer("xp_at_issue").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  // UNIQUE (user_id, track) via migrate.ts — one certificate per track, forever.
});

/** Sent-nudge ledger: the PK dedupes a cadence per user per UTC day. */
export const academyNudges = pgTable(
  "academy_nudges",
  {
    userId: text("user_id").notNull(),
    cadence: text("cadence").notNull(), // CHECK in ('daily','weekly','monthly') via migrate.ts
    sentOn: date("sent_on", { mode: "string" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cadence, t.sentOn] })],
);

/* ---------- lifecycle messaging (email engine) ---------- */

/** One row per known email address — the marketing/contact projection. */
export const msgContacts = pgTable("msg_contacts", {
  email: text("email").primaryKey(), // lowercased
  tenantId: text("tenant_id").notNull().default("heropips"),
  userId: text("user_id"),
  displayName: text("display_name"),
  source: text("source").notNull(), // early_access | checkout | purchase | platform | academy
  founding: boolean("founding").notNull().default(false),
  packageSku: text("package_sku"),
  earlyAccessEntryId: uuid("early_access_entry_id"),
  registeredAt: timestamp("registered_at", { withTimezone: true }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  firstTradeAt: timestamp("first_trade_at", { withTimezone: true }),
  lastLessonAt: timestamp("last_lesson_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Lifecycle-email opt-outs. Transactional mail ignores this list. */
export const msgSuppressions = pgTable("msg_suppressions", {
  email: text("email").primaryKey(),
  reason: text("reason").notNull(), // unsubscribe | bounce | complaint | manual
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-contact journey state machine; UNIQUE (email, journey) via migrate.ts. */
export const msgJourneys = pgTable("msg_journeys", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  journey: text("journey").notNull(),
  step: integer("step").notNull().default(0), // next step index to run
  status: text("status").notNull().default("active"), // active | completed | cancelled
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
});

/** Send ledger — one row per attempted email; dedupe_key makes retries idempotent. */
export const msgSends = pgTable("msg_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  template: text("template").notNull(),
  category: text("category").notNull(), // transactional | lifecycle
  dedupeKey: text("dedupe_key").notNull(), // unique via migrate.ts
  subject: text("subject").notNull().default(""),
  status: text("status").notNull().default("queued"), // queued | sent | failed | suppressed | capped
  providerId: text("provider_id"),
  error: text("error"),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

/** ISO-week signal counters feeding the weekly "what you missed" digest. */
export const msgSignalWeeks = pgTable("msg_signal_weeks", {
  week: text("week").primaryKey(), // e.g. 2026-W31
  generated: integer("generated").notNull().default(0),
  targetHit: integer("target_hit").notNull().default(0),
  stopped: integer("stopped").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
