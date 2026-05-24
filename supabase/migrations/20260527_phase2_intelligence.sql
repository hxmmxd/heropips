-- Phase 2: Intelligence Schema

-- Analytics events for tracking user behavior
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON public.analytics_events(user_id);

-- Risk rules
CREATE TABLE IF NOT EXISTS public.risk_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rule_type text NOT NULL,
  threshold numeric NOT NULL,
  plan_tier text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed default risk rules
INSERT INTO public.risk_rules (name, rule_type, threshold, plan_tier) VALUES
  ('Max Lot Size (Free)', 'max_lot', 0.5, 'free'),
  ('Max Lot Size (Pro)', 'max_lot', 2.0, 'pro'),
  ('Max Lot Size (Enterprise)', 'max_lot', 10.0, 'enterprise'),
  ('Daily Loss Limit (Free)', 'daily_loss', 100, 'free'),
  ('Daily Loss Limit (Pro)', 'daily_loss', 500, 'pro'),
  ('Daily Loss Limit (Enterprise)', 'daily_loss', 5000, 'enterprise')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins manage risk rules" ON public.risk_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
