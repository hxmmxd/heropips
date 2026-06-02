-- ============================================================
-- Risk Data Persistence: 3 Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. closed_deals — permanent store of every closed trade
CREATE TABLE IF NOT EXISTS closed_deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker_id text NOT NULL,
  deal_id text NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL,
  volume numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  swap numeric DEFAULT 0,
  entry_price numeric DEFAULT 0,
  exit_price numeric DEFAULT 0,
  open_time timestamptz,
  close_time timestamptz,
  position_id text,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint to prevent duplicate inserts on re-sync
ALTER TABLE closed_deals ADD CONSTRAINT closed_deals_deal_id_unique UNIQUE (deal_id);

-- Fast lookups by user + broker + time
CREATE INDEX IF NOT EXISTS idx_closed_deals_user_broker_time
  ON closed_deals (user_id, broker_id, close_time DESC);

CREATE INDEX IF NOT EXISTS idx_closed_deals_broker_id
  ON closed_deals (broker_id);

-- 2. daily_snapshots — one row per account per day
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker_id text NOT NULL,
  date date NOT NULL,
  balance numeric DEFAULT 0,
  equity numeric DEFAULT 0,
  margin numeric DEFAULT 0,
  open_positions int DEFAULT 0,
  open_pnl numeric DEFAULT 0,
  net_profit_closed numeric DEFAULT 0,
  total_trades int DEFAULT 0,
  win_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- One snapshot per day per account
ALTER TABLE daily_snapshots
  ADD CONSTRAINT daily_snapshots_user_broker_date_unique
  UNIQUE (user_id, broker_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_broker_date
  ON daily_snapshots (user_id, broker_id, date DESC);

-- 3. risk_stats_cache — pre-computed stats per period
CREATE TABLE IF NOT EXISTS risk_stats_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker_id text NOT NULL,
  period text NOT NULL,
  stats_json jsonb DEFAULT '{}'::jsonb,
  deals_count int DEFAULT 0,
  last_synced timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE risk_stats_cache
  ADD CONSTRAINT risk_stats_cache_user_broker_period_unique
  UNIQUE (user_id, broker_id, period);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE closed_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_stats_cache ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own closed_deals"
  ON closed_deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily_snapshots"
  ON daily_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own risk_stats_cache"
  ON risk_stats_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service can manage closed_deals"
  ON closed_deals FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage daily_snapshots"
  ON daily_snapshots FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage risk_stats_cache"
  ON risk_stats_cache FOR ALL
  USING (true) WITH CHECK (true);
