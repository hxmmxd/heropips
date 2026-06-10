-- Paid courses infrastructure

-- 1. Course purchases table
CREATE TABLE IF NOT EXISTS course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'wallet',
  payment_ref TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_purchases_user ON course_purchases (user_id, category);

ALTER TABLE course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases"
  ON course_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Unique constraint: prevent duplicate category purchases per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_purchases_unique
  ON course_purchases (user_id, category);

-- Atomic wallet balance deduction (prevents double-spend race conditions)
CREATE OR REPLACE FUNCTION deduct_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE profiles
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE id = p_user_id
    AND wallet_balance >= p_amount;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
