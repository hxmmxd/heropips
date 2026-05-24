-- Phase 1: Foundation Schema
-- Audit Log: tracks every admin action
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- Platform Config: key-value store for all platform settings
CREATE TABLE IF NOT EXISTS public.platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Add suspension fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Seed default platform config
INSERT INTO public.platform_config (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('ai_kill_switch', 'false'::jsonb),
  ('feature_flags', '{"copy_trading": false, "advanced_charts": true, "api_access": false}'::jsonb),
  ('plan_pricing', '{"starter": 20, "pro": 50, "enterprise": 100}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS policies
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can read audit log
CREATE POLICY "Admins read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can read/write config
CREATE POLICY "Admins manage config" ON public.platform_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Everyone reads active announcements, admins manage all
CREATE POLICY "Read active announcements" ON public.announcements FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
