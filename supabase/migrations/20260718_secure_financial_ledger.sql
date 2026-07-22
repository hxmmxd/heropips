-- Migration: 20260718_secure_financial_ledger.sql
-- Description: Creates the referral_withdrawals table if missing, enables Row Level Security (RLS) on wallet_transactions and referral_withdrawals, and restricts operations.

-- 1. Create referral_withdrawals table if it does not exist
CREATE TABLE IF NOT EXISTS public.referral_withdrawals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount_usd numeric(15, 2) NOT NULL,
  currency varchar(50) NOT NULL,
  nowpayments_currency varchar(50) NOT NULL,
  address text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected')),
  approved_by uuid REFERENCES public.profiles(id),
  rejected_by uuid REFERENCES public.profiles(id),
  nowpayments_id varchar(100),
  batch_withdrawal_id varchar(100),
  tx_hash text,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can read own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins full access" ON public.wallet_transactions;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.referral_withdrawals;
DROP POLICY IF EXISTS "Admins full access" ON public.referral_withdrawals;

-- 3. Lock down public.wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON public.wallet_transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins full access" ON public.wallet_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Lock down public.referral_withdrawals
ALTER TABLE public.referral_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals" ON public.referral_withdrawals
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins full access" ON public.referral_withdrawals
    FOR ALL TO service_role USING (true) WITH CHECK (true);
