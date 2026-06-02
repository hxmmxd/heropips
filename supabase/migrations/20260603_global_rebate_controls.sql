-- Create global risk settings table
CREATE TABLE IF NOT EXISTS public.rebate_risk_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exclude_hedged_positions boolean DEFAULT true NOT NULL,
  hedge_time_buffer_seconds integer DEFAULT 15 NOT NULL,
  max_drawdown_limit numeric(5, 2) DEFAULT 35.00 NOT NULL,
  spread_protection_multiplier numeric(3, 2) DEFAULT 0.70 NOT NULL,
  clawback_grace_period_days integer DEFAULT 14 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed a default global risk config row if not exists
INSERT INTO public.rebate_risk_settings (
  exclude_hedged_positions, 
  hedge_time_buffer_seconds, 
  max_drawdown_limit, 
  spread_protection_multiplier, 
  clawback_grace_period_days
) VALUES (
  true, 15, 35.00, 0.70, 14
) ON CONFLICT DO NOTHING;

-- Create sliding scale volume tiers table
CREATE TABLE IF NOT EXISTS public.rebate_volume_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  min_monthly_lots numeric(10, 2) NOT NULL,
  max_monthly_lots numeric(10, 2) NOT NULL,
  payout_multiplier numeric(3, 2) DEFAULT 1.00 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (min_monthly_lots, max_monthly_lots)
);

-- Seed standard tiers:
-- 0 - 10 lots: 1.00x multiplier
-- 10 - 50 lots: 1.10x multiplier
-- 50+ lots: 1.25x multiplier
INSERT INTO public.rebate_volume_tiers (min_monthly_lots, max_monthly_lots, payout_multiplier) VALUES
(0.00, 10.00, 1.00),
(10.00, 50.00, 1.10),
(50.00, 999999.00, 1.25)
ON CONFLICT (min_monthly_lots, max_monthly_lots) DO NOTHING;

-- Create promo boosts table
CREATE TABLE IF NOT EXISTS public.rebate_promotions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(100) NOT NULL,
  symbol varchar(50) DEFAULT '*' NOT NULL,
  multiplier numeric(3, 2) DEFAULT 1.20 NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  description varchar(255),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
