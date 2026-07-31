import type { Pool } from "pg";

/** Idempotent bootstrap DDL, run on boot before the HTTP listener starts. */
const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  broker text NOT NULL CHECK (broker IN ('paper','mt5','binance','kucoin')),
  label text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('paper','live')),
  status text NOT NULL CHECK (status IN ('active','pending','error')),
  status_detail text,
  balance_usd_minor bigint NOT NULL DEFAULT 0,
  cred_cipher text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS connections_user_idx ON connections (user_id);

CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long','short')),
  qty double precision NOT NULL,
  avg_entry double precision NOT NULL,
  entry_fees_usd_minor bigint NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL,
  signal_id text
);
CREATE UNIQUE INDEX IF NOT EXISTS positions_connection_symbol_uq ON positions (connection_id, symbol);
CREATE INDEX IF NOT EXISTS positions_user_idx ON positions (user_id);

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  connection_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long','short')),
  qty double precision NOT NULL,
  entry double precision NOT NULL,
  exit double precision NOT NULL,
  rpl_usd_minor bigint NOT NULL,
  fees_usd_minor bigint NOT NULL,
  signal_id text,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS trades_user_closed_idx ON trades (user_id, closed_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  idempotency_key text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS equity_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  ts timestamptz NOT NULL,
  equity_usd_minor bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS equity_snapshots_user_ts_idx ON equity_snapshots (user_id, ts);

CREATE TABLE IF NOT EXISTS day_anchors (
  user_id text NOT NULL,
  day text NOT NULL,
  day_start_equity_usd_minor bigint NOT NULL,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_unsent_idx ON outbox (created_at) WHERE sent_at IS NULL;
`;

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(DDL);
  } finally {
    client.release();
  }
}
