-- 20260717_performance_indexes.sql
-- Optimizes table scans for trade logs and transaction queries

-- Speed up Kelly position sizer filtering on symbol and sorting by date
CREATE INDEX IF NOT EXISTS idx_trade_log_symbol_closed
  ON public.trade_log (symbol, closed_at DESC);

-- Speed up user monthly lot calculations and transaction lists
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON public.wallet_transactions (user_id, created_at DESC);
