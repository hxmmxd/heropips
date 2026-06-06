-- Session tracking columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_region text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_timezone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_os text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_browser text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_device text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;
