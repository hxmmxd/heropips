-- Add MetaAPI extended fields to broker_accounts
ALTER TABLE public.broker_accounts 
ADD COLUMN IF NOT EXISTS timezone_offset numeric(5, 2) DEFAULT 0.00 NOT NULL,
ADD COLUMN IF NOT EXISTS broker_timezone_name text DEFAULT 'UTC' NOT NULL,
ADD COLUMN IF NOT EXISTS allowed_symbols jsonb DEFAULT '[]'::jsonb NOT NULL;
