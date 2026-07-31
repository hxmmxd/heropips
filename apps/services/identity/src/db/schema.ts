import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// email is citext in the DDL (db/migrate.ts); drizzle maps it as text — every
// caller normalizes to lowercase at the zod boundary anyway.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("member"),
  founding: boolean("founding").notNull().default(false),
  packageSku: text("package_sku").notNull().default("ltd_founding"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    tokenSha256: text("token_sha256").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey(),
    actorId: uuid("actor_id").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("audit_log_actor_idx").on(t.actorId, t.createdAt, t.id)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("chat_messages_created_idx").on(t.createdAt, t.id)],
);

export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
