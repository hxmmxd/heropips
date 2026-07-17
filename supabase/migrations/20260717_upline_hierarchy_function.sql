-- Recursive CTE function to fetch referrers upline hierarchy in a single query
CREATE OR REPLACE FUNCTION public.get_upline_hierarchy(start_user_id UUID, max_levels INT)
RETURNS TABLE(user_id UUID, level INT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE referral_tree AS (
    -- Anchor member
    SELECT referred_by, 1 AS depth
    FROM public.profiles
    WHERE id = start_user_id
    
    UNION ALL
    
    -- Recursive member
    SELECT p.referred_by, rt.depth + 1
    FROM public.profiles p
    INNER JOIN referral_tree rt ON p.id = rt.referred_by
    WHERE p.referred_by IS NOT NULL AND rt.depth < max_levels
  )
  SELECT referred_by, depth
  FROM referral_tree;
END;
$$;
