import type { Pool } from "pg";

/** Idempotent bootstrap DDL, run on boot before the HTTP listener starts. */
const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'heropips',
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy','sell')),
  confidence double precision NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  entry double precision NOT NULL,
  stop double precision NOT NULL,
  target double precision NOT NULL,
  horizon_min integer NOT NULL CHECK (horizon_min > 0),
  rationale text NOT NULL,
  model_version text NOT NULL,
  data_source text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','target_hit','stopped')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS signals_generated_at_idx ON signals (generated_at DESC);
-- The one-active-per-symbol invariant, enforced at the storage layer.
CREATE UNIQUE INDEX IF NOT EXISTS signals_one_active_per_symbol_uq ON signals (symbol) WHERE status = 'active';

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
