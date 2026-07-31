import type { Pool } from "pg";

/** Idempotent bootstrap DDL, run on boot before the HTTP listener starts. */
const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'heropips',
  email text NOT NULL,
  code text NOT NULL,
  referred_by uuid REFERENCES waitlist_entries(id),
  base_position integer NOT NULL,
  utm jsonb,
  profile jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_email_lower_uq ON waitlist_entries (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_code_uq ON waitlist_entries (code);
CREATE INDEX IF NOT EXISTS waitlist_entries_referred_by_idx ON waitlist_entries (referred_by);
-- Existing dev DBs created before the profile column shipped:
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS profile jsonb;
-- Email-first signup: entries only exist once the address is code-verified.
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Pending email verifications. One row per address, replaced on every resend.
-- Codes are stored as HMACs; the plaintext exists only in the outbound email.
CREATE TABLE IF NOT EXISTS early_access_verifications (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  sends integer NOT NULL DEFAULT 1,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS early_access_verifications_expires_idx
  ON early_access_verifications (expires_at);

CREATE TABLE IF NOT EXISTS affiliate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'heropips',
  name text NOT NULL,
  email text NOT NULL,
  channel text NOT NULL,
  audience_size text NOT NULL,
  geo text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_unsent_idx ON outbox (created_at) WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS referral_program_config (
  tenant_id text PRIMARY KEY DEFAULT 'heropips',
  max_levels integer NOT NULL DEFAULT 5 CHECK (max_levels BETWEEN 1 AND 10),
  level_rates_bps integer[] NOT NULL DEFAULT '{2000,1000,500,300,200}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO referral_program_config (tenant_id) VALUES ('heropips') ON CONFLICT (tenant_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS referral_edges (
  child_id text PRIMARY KEY,
  parent_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (child_id <> parent_id)
);
CREATE INDEX IF NOT EXISTS referral_edges_parent_idx ON referral_edges (parent_id);

CREATE TABLE IF NOT EXISTS referral_ancestors (
  descendant_id text NOT NULL,
  ancestor_id text NOT NULL,
  depth integer NOT NULL CHECK (depth BETWEEN 1 AND 10),
  PRIMARY KEY (descendant_id, ancestor_id)
);
CREATE INDEX IF NOT EXISTS referral_ancestors_desc_depth_idx ON referral_ancestors (descendant_id, depth);
CREATE INDEX IF NOT EXISTS referral_ancestors_ancestor_idx ON referral_ancestors (ancestor_id);

CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  beneficiary_id text NOT NULL,
  level integer NOT NULL,
  rate_bps integer NOT NULL,
  amount_usd_minor integer NOT NULL,
  status text NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued','reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, beneficiary_id, level)
);
CREATE INDEX IF NOT EXISTS referral_commissions_order_idx ON referral_commissions (order_id);
CREATE INDEX IF NOT EXISTS referral_commissions_beneficiary_idx ON referral_commissions (beneficiary_id);

CREATE TABLE IF NOT EXISTS academy_progress (
  user_id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'heropips',
  email text NOT NULL,
  display_name text NOT NULL,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  streak_days integer NOT NULL DEFAULT 0,
  streak_best integer NOT NULL DEFAULT 0,
  last_active_date date,
  spin_last_date date,
  referral_code text NOT NULL,
  referred_by text,
  completions jsonb NOT NULL DEFAULT '{}',
  games jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS academy_progress_referral_code_uq ON academy_progress (referral_code);
CREATE INDEX IF NOT EXISTS academy_progress_leaderboard_idx ON academy_progress (xp DESC, updated_at ASC);
CREATE INDEX IF NOT EXISTS academy_progress_last_active_idx ON academy_progress (last_active_date);

CREATE TABLE IF NOT EXISTS academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  user_id text NOT NULL,
  track text NOT NULL CHECK (track IN ('level-0','level-1','level-2','level-3','level-4','level-5','level-6','level-7','level-8','level-9','hero-trader')),
  recipient text NOT NULL,
  xp_at_issue integer NOT NULL CHECK (xp_at_issue >= 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track)
);
CREATE UNIQUE INDEX IF NOT EXISTS academy_certificates_code_uq ON academy_certificates (code);
-- Existing dev DBs created under the old 2-track model ('foundations','hero-trader'):
-- certificates are now per-level. 'foundations' covered levels 0-2, so it has no
-- single per-level equivalent; this is prelaunch dev data with no real users, so
-- those rows are deleted rather than remapped. Drop-then-add keeps this idempotent.
DELETE FROM academy_certificates WHERE track = 'foundations';
ALTER TABLE academy_certificates DROP CONSTRAINT IF EXISTS academy_certificates_track_check;
ALTER TABLE academy_certificates ADD CONSTRAINT academy_certificates_track_check
  CHECK (track IN ('level-0','level-1','level-2','level-3','level-4','level-5','level-6','level-7','level-8','level-9','hero-trader'));

CREATE TABLE IF NOT EXISTS academy_nudges (
  user_id text NOT NULL,
  cadence text NOT NULL CHECK (cadence IN ('daily','weekly','monthly')),
  sent_on date NOT NULL,
  PRIMARY KEY (user_id, cadence, sent_on)
);
CREATE INDEX IF NOT EXISTS academy_nudges_cadence_sent_idx ON academy_nudges (cadence, sent_on);

CREATE TABLE IF NOT EXISTS msg_contacts (
  email text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'heropips',
  user_id text,
  display_name text,
  source text NOT NULL,
  founding boolean NOT NULL DEFAULT false,
  package_sku text,
  early_access_entry_id uuid,
  registered_at timestamptz,
  purchased_at timestamptz,
  first_trade_at timestamptz,
  last_lesson_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS msg_contacts_user_idx ON msg_contacts (user_id);

CREATE TABLE IF NOT EXISTS msg_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS msg_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  journey text NOT NULL,
  step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  context jsonb NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  next_run_at timestamptz,
  UNIQUE (email, journey)
);
CREATE INDEX IF NOT EXISTS msg_journeys_due_idx ON msg_journeys (next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS msg_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  template text NOT NULL,
  category text NOT NULL CHECK (category IN ('transactional','lifecycle')),
  dedupe_key text NOT NULL,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','suppressed','capped')),
  provider_id text,
  error text,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS msg_sends_dedupe_uq ON msg_sends (dedupe_key);
CREATE INDEX IF NOT EXISTS msg_sends_email_idx ON msg_sends (email, created_at DESC);

CREATE TABLE IF NOT EXISTS msg_signal_weeks (
  week text PRIMARY KEY,
  generated integer NOT NULL DEFAULT 0,
  target_hit integer NOT NULL DEFAULT 0,
  stopped integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(DDL);
  } finally {
    client.release();
  }
}
