-- Add astro_mode to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS astro_mode BOOLEAN DEFAULT FALSE;

-- Create astro_signal_log table for signal telemetry
CREATE TABLE IF NOT EXISTS public.astro_signal_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  signal_time     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  direction       TEXT CHECK (direction IN ('BUY', 'SELL')),
  
  -- Technical gates
  confluence_score INTEGER,
  gates_passed     INTEGER,
  outcome          TEXT CHECK (outcome IN ('SIGNAL', 'WATCH', 'NO_TRADE')),
  
  -- Astro data at signal time
  moon_phase       NUMERIC(4,3),
  moon_phase_name  TEXT,
  moon_sign        TEXT,
  mercury_state    TEXT,
  eclipse_active   BOOLEAN,
  void_of_course   BOOLEAN,
  aspects          TEXT[],
  seasonal_bias    INTEGER,
  
  -- Result tracking (filled in later)
  trade_result     TEXT,  -- 'win', 'loss', 'breakeven'
  pnl              NUMERIC,
  astro_mode_on    BOOLEAN DEFAULT TRUE
);

-- Enable RLS on astro_signal_log
ALTER TABLE public.astro_signal_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own astro signal logs
DROP POLICY IF EXISTS "Users can access own astro logs" ON public.astro_signal_log;
CREATE POLICY "Users can access own astro logs" ON public.astro_signal_log
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_astro_signal_log_user ON public.astro_signal_log(user_id);
CREATE INDEX IF NOT EXISTS idx_astro_signal_log_symbol ON public.astro_signal_log(symbol);
