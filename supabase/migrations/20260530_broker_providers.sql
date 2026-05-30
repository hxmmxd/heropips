-- Broker Integration Hub: Provider Management

CREATE TABLE IF NOT EXISTS public.broker_providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'metatrader',
  api_key text,
  api_secret text,
  base_url text,
  status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  supported_servers text[] DEFAULT '{}',
  max_accounts integer DEFAULT 100,
  connected_accounts integer DEFAULT 0,
  last_health_check timestamptz,
  error_message text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.broker_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage providers" ON public.broker_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Seed a default MetaAPI provider if META_API_TOKEN exists
-- (This will be done via the admin UI instead)
