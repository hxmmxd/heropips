import { Pool } from "pg";
import { TENANT_ID } from "../common/config";

const DDL = `
CREATE TABLE IF NOT EXISTS ltd_seats (
  tenant_id text PRIMARY KEY DEFAULT 'heropips',
  cap int NOT NULL,
  granted int NOT NULL DEFAULT 0,
  held int NOT NULL DEFAULT 0,
  checksum text
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  order_id text UNIQUE NOT NULL,
  tenant_id text NOT NULL DEFAULT 'heropips',
  email text NOT NULL,
  sku text NOT NULL DEFAULT 'ltd_founding',
  price_usd_minor int NOT NULL,
  payment_status text NOT NULL DEFAULT 'waiting',
  seat_state text NOT NULL DEFAULT 'held' CHECK (seat_state IN ('held','granted','released')),
  invoice_id text,
  invoice_url text,
  purchase_id text,
  pay_currency text,
  actually_paid numeric,
  ref_code text,
  hold_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_hold_expiry_idx ON orders (hold_expires_at) WHERE seat_state = 'held';
CREATE TABLE IF NOT EXISTS ipn_events (
  id uuid PRIMARY KEY,
  payment_id text,
  payment_status text,
  order_id text,
  raw jsonb NOT NULL,
  sig_valid boolean,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, payment_status)
);
CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY,
  topic text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_unsent_idx ON outbox (created_at) WHERE sent_at IS NULL;
`;

/** Bootstrap-SQL migration + seat seed. Runs on boot; idempotent. */
export async function migrate(databaseUrl: string, seatCap: number): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    await pool.query(DDL);
    await pool.query(
      `INSERT INTO ltd_seats (tenant_id, cap) VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [TENANT_ID, seatCap],
    );
  } finally {
    await pool.end();
  }
}
