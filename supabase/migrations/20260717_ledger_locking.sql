-- 20260717_ledger_locking.sql
-- Stored procedures for atomic ledger balance deductions

-- Atomically deducts a profile's wallet balance using row-level locking to prevent double-spending.
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_affected INT;
BEGIN
  -- Perform atomic update with check. PostgreSQL implicitly locks the matched row for update.
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0.00) - p_amount,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id
    AND COALESCE(wallet_balance, 0.00) >= p_amount;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$;

-- Grant execution to authenticated users and service roles
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, NUMERIC) TO service_role;
