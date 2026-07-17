-- Migration: 20260717_fix_rls_policies.sql
-- Description: Locks down RLS policies on portfolio_risk_states, shadow_trades, and daily_risk_reports to service_role only.

-- 1. Drop existing wide-open policies (if they exist)
DROP POLICY IF EXISTS "Service role full access" ON public.portfolio_risk_states;
DROP POLICY IF EXISTS "Service role full access" ON public.shadow_trades;
DROP POLICY IF EXISTS "Service role full access" ON public.daily_risk_reports;

-- 2. Create secure policies restricting all operations to the service_role only
CREATE POLICY "Service role only" ON public.portfolio_risk_states
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role only" ON public.shadow_trades
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role only" ON public.daily_risk_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Verify RLS is enabled on all target tables
ALTER TABLE public.portfolio_risk_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_risk_reports ENABLE ROW LEVEL SECURITY;
