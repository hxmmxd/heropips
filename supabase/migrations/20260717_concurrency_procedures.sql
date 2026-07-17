-- 20260717_concurrency_procedures.sql
-- Stored procedures for atomic ledger operations

-- Atomically increments a profile's wallet balance to prevent lost updates/race conditions.
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0.00) + p_amount,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- Grant execution to authenticated users and service roles
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(UUID, NUMERIC) TO service_role;
