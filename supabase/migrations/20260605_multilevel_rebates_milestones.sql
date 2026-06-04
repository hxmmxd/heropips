-- Multi-Level Rebate & 40/40/20 Milestones
-- ==========================================

-- 1. Add referral tree to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS referral_code varchar(20) UNIQUE;

-- Prevent self-referral
ALTER TABLE public.profiles
ADD CONSTRAINT no_self_referral CHECK (referred_by IS DISTINCT FROM id);

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 2. Trade log — dedicated table for every closed deal
CREATE TABLE IF NOT EXISTS public.trade_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  broker_account_id uuid REFERENCES public.broker_accounts(id) ON DELETE SET NULL,
  deal_id varchar(100) NOT NULL UNIQUE,  -- MetaAPI deal ID (dedup)
  symbol varchar(50) NOT NULL,
  deal_type varchar(30) NOT NULL,        -- BUY / SELL
  volume numeric(10,4) NOT NULL DEFAULT 0,
  profit numeric(15,2) DEFAULT 0,
  commission numeric(15,2) DEFAULT 0,
  swap numeric(15,2) DEFAULT 0,
  entry_price numeric(15,5),
  exit_price numeric(15,5),
  hold_time_seconds integer DEFAULT 0,
  opened_at timestamptz,
  closed_at timestamptz,
  rebate_processed boolean DEFAULT false,
  logged_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trade_log_user ON public.trade_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_log_unprocessed ON public.trade_log(rebate_processed) WHERE rebate_processed = false;
CREATE INDEX IF NOT EXISTS idx_trade_log_closed_at ON public.trade_log(closed_at);

-- RLS
ALTER TABLE public.trade_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own trade logs" ON public.trade_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages trade logs" ON public.trade_log FOR ALL TO service_role USING (true);

-- 3. Rebate levels — multi-level distribution percentages
CREATE TABLE IF NOT EXISTS public.rebate_levels (
  level integer PRIMARY KEY,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  label varchar(50) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.rebate_levels (level, percentage, label) VALUES
  (1, 40.00, 'Direct Referrer'),
  (2, 20.00, 'Level 2'),
  (3, 10.00, 'Level 3'),
  (4, 5.00,  'Level 4'),
  (5, 5.00,  'Level 5')
ON CONFLICT (level) DO NOTHING;

ALTER TABLE public.rebate_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads rebate levels" ON public.rebate_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage rebate levels" ON public.rebate_levels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 4. Milestones — reward tiers with 40/40/20 caps
CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(100) NOT NULL,
  target_lots numeric(15,2) NOT NULL,
  reward_amount numeric(15,2) NOT NULL,
  reward_currency varchar(10) DEFAULT 'USD',
  leg_cap_pct numeric(5,2) DEFAULT 40.00,  -- The "40" in 40/40/20
  min_active_legs integer DEFAULT 2,
  icon varchar(10) DEFAULT '🏆',
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.milestones (name, target_lots, reward_amount, icon, sort_order) VALUES
  ('Bronze',   500,    500,   '🥉', 1),
  ('Silver',   2000,   2500,  '🥈', 2),
  ('Gold',     5000,   7500,  '🥇', 3),
  ('Platinum', 10000,  15000, '💎', 4),
  ('Diamond',  25000,  50000, '👑', 5)
ON CONFLICT DO NOTHING;

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads milestones" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage milestones" ON public.milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Milestone progress — per-user tracking with leg breakdown
CREATE TABLE IF NOT EXISTS public.milestone_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  status varchar(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'qualified', 'paid')),
  total_raw_lots numeric(15,2) DEFAULT 0,
  total_counted_lots numeric(15,2) DEFAULT 0,
  legs_breakdown jsonb DEFAULT '[]'::jsonb,
  qualified_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_milestone_progress_user ON public.milestone_progress(user_id);

ALTER TABLE public.milestone_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own milestone progress" ON public.milestone_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages milestone progress" ON public.milestone_progress FOR ALL TO service_role USING (true);

-- 6. Helper function: get all descendants of a user (for team volume)
CREATE OR REPLACE FUNCTION public.get_team_user_ids(root_user_id uuid)
RETURNS TABLE(user_id uuid, depth integer) AS $$
  WITH RECURSIVE team AS (
    SELECT id AS user_id, 1 AS depth
    FROM public.profiles
    WHERE referred_by = root_user_id

    UNION ALL

    SELECT p.id AS user_id, t.depth + 1
    FROM public.profiles p
    INNER JOIN team t ON p.referred_by = t.user_id
    WHERE t.depth < 10  -- safety: max 10 levels deep
  )
  SELECT * FROM team;
$$ LANGUAGE sql STABLE;

-- 7. Helper function: get direct leg volume (sum of all trade volume under a leg)
CREATE OR REPLACE FUNCTION public.get_leg_volume(leg_user_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(tl.volume), 0)
  FROM public.trade_log tl
  WHERE tl.user_id = leg_user_id
     OR tl.user_id IN (SELECT gt.user_id FROM public.get_team_user_ids(leg_user_id) gt);
$$ LANGUAGE sql STABLE;
