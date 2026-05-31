-- Migration: Subscription Payments tracking table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  payment_id text UNIQUE NOT NULL,
  status text NOT NULL, -- 'pending', 'completed', 'failed', 'expired'
  price_amount numeric NOT NULL,
  pay_amount numeric NOT NULL,
  pay_currency text NOT NULL,
  pay_address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users read own payments" ON public.subscription_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all payments" ON public.subscription_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
