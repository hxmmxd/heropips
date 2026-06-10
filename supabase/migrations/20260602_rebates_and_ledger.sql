-- Add wallet balance to user profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance numeric(15, 2) DEFAULT 0.00 NOT null;

-- Add last rebate sync timestamp to broker accounts
ALTER TABLE public.broker_accounts 
ADD COLUMN IF NOT EXISTS last_rebate_sync_at timestamp with time zone;

-- Create rebate rules table with micro settings
CREATE TABLE IF NOT EXISTS public.rebate_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_provider_id uuid REFERENCES public.broker_providers(id) ON DELETE CASCADE,
  symbol varchar(50) DEFAULT '*' NOT null,
  rebate_per_lot numeric(10, 2) DEFAULT 2.00 NOT null,
  min_hold_time_seconds integer DEFAULT 120 NOT null,
  min_pip_distance numeric(5, 2) DEFAULT 3.00 NOT null,
  free_multiplier numeric(3, 2) DEFAULT 0.60 NOT null,
  pro_multiplier numeric(3, 2) DEFAULT 0.80 NOT null,
  enterprise_multiplier numeric(3, 2) DEFAULT 1.00 NOT null,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT null,
  UNIQUE (broker_provider_id, symbol)
);

-- Create wallet transactions ledger table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  amount numeric(15, 2) NOT null,
  tx_type text NOT null CHECK (tx_type IN ('rebate', 'referral', 'withdrawal_request', 'withdrawal_payout', 'withdrawal_declined', 'course_purchase')),
  status text DEFAULT 'completed' NOT null CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id varchar(100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT null
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_reference ON public.wallet_transactions(reference_id) WHERE reference_id IS NOT null;
