import { Pool } from "pg";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  founding boolean NOT NULL DEFAULT false,
  package_sku text NOT NULL DEFAULT 'ltd_founding',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  token_sha256 text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  ip text,
  user_agent text,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target text,
  meta jsonb,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages (created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY,
  topic text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_unsent_idx ON outbox (created_at) WHERE sent_at IS NULL;
`;

/** Bootstrap-SQL migration. Runs on boot; idempotent. */
export async function migrate(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS citext");
    await pool.query(DDL);
  } finally {
    await pool.end();
  }
}
