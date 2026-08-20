-- ============================================================================
-- Migration: 20260819_uqp_foundation.sql
-- Description: Unified Quote Pipeline (UQP) Foundation Schema
--   1. Add is_master_feed to public.broker_accounts
--   2. Create public.market_candles table with UNIQUE (broker, symbol, timeframe, time)
--   3. Create high-throughput composite indexes
--   4. Enable RLS with public read and service_role write policies
--   5. Add trigger for automatic updated_at modification time
-- ============================================================================

-- 1. Alter broker_accounts to support master quote feeds
ALTER TABLE public.broker_accounts
ADD COLUMN IF NOT EXISTS is_master_feed BOOLEAN NOT NULL DEFAULT false;

-- Partial index for rapid lookup of active master quote feeds
CREATE INDEX IF NOT EXISTS idx_broker_accounts_master_feed
ON public.broker_accounts (broker_name, is_active)
WHERE is_master_feed = true;


-- 2. Create market_candles table
CREATE TABLE IF NOT EXISTS public.market_candles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker TEXT NOT NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- '1m', '5m', '15m', '1h', '4h', '1d'
    time TIMESTAMPTZ NOT NULL,
    open NUMERIC(18, 6) NOT NULL,
    high NUMERIC(18, 6) NOT NULL,
    low NUMERIC(18, 6) NOT NULL,
    close NUMERIC(18, 6) NOT NULL,
    volume NUMERIC(18, 4) NOT NULL DEFAULT 0,
    is_closed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT market_candles_broker_symbol_tf_time_unique UNIQUE (broker, symbol, timeframe, time)
);


-- 3. Composite indexes for high-frequency candle lookups
CREATE INDEX IF NOT EXISTS idx_market_candles_query
ON public.market_candles (broker, symbol, timeframe, time DESC);

CREATE INDEX IF NOT EXISTS idx_market_candles_symbol_tf_time
ON public.market_candles (symbol, timeframe, time DESC);


-- 4. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.update_market_candles_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_market_candles_updated_at ON public.market_candles;
CREATE TRIGGER trg_market_candles_updated_at
    BEFORE UPDATE ON public.market_candles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_market_candles_modtime();


-- 5. Row Level Security (RLS)
ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;

-- Allow public and authenticated users to read candles for charts and indicators
DROP POLICY IF EXISTS "Allow public read access on market_candles" ON public.market_candles;
CREATE POLICY "Allow public read access on market_candles"
ON public.market_candles
FOR SELECT
USING (true);

-- Allow service role full access for background ingestion & aggregation daemons
DROP POLICY IF EXISTS "Allow service role full management on market_candles" ON public.market_candles;
CREATE POLICY "Allow service role full management on market_candles"
ON public.market_candles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
