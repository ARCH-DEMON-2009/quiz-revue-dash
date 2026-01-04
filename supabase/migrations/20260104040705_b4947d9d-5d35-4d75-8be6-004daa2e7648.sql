-- Drop existing function first since return type is changing
DROP FUNCTION IF EXISTS public.get_leaderboard_data();

-- Recreate the leaderboard function to:
-- 1. Return current user's rank even if outside top 50
-- 2. Ensure actual names from user_profiles are used
CREATE OR REPLACE FUNCTION public.get_leaderboard_data()
RETURNS TABLE (
  user_id uuid,
  name varchar,
  average_score numeric,
  total_tests bigint,
  overall_accuracy numeric,
  rank_percentile numeric,
  global_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users integer;
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  -- Create temp table with ALL users' aggregated stats (for accurate ranking)
  CREATE TEMP TABLE temp_all_users AS
  SELECT 
    tr.user_id,
    COALESCE(up.name, 'Student') as name,
    AVG(tr.percentage) as average_score,
    COUNT(*)::bigint as total_tests,
    CASE 
      WHEN SUM(tr.total) > 0 THEN (SUM(tr.correct)::numeric / SUM(tr.total)::numeric) * 100
      ELSE 0
    END as overall_accuracy
  FROM test_results tr
  LEFT JOIN user_profiles up ON tr.user_id = up.user_id
  WHERE tr.user_id IS NOT NULL
  GROUP BY tr.user_id, up.name;

  -- Get total users for percentile calculation
  SELECT COUNT(*) INTO total_users FROM temp_all_users;

  -- Add ranking to all users
  CREATE TEMP TABLE temp_ranked AS
  SELECT 
    tau.user_id,
    tau.name::varchar,
    ROUND(tau.average_score, 2) as average_score,
    tau.total_tests,
    ROUND(tau.overall_accuracy, 2) as overall_accuracy,
    ROUND(((total_users - ROW_NUMBER() OVER (ORDER BY tau.average_score DESC) + 1)::numeric / GREATEST(total_users, 1)::numeric) * 100, 2) as rank_percentile,
    ROW_NUMBER() OVER (ORDER BY tau.average_score DESC) as global_rank
  FROM temp_all_users tau;

  -- Return top 50 + current user if not in top 50
  RETURN QUERY
  SELECT tr.user_id, tr.name, tr.average_score, tr.total_tests, tr.overall_accuracy, tr.rank_percentile, tr.global_rank
  FROM temp_ranked tr
  WHERE tr.global_rank <= 50
  UNION
  SELECT tr.user_id, tr.name, tr.average_score, tr.total_tests, tr.overall_accuracy, tr.rank_percentile, tr.global_rank
  FROM temp_ranked tr
  WHERE tr.user_id = current_user_id AND tr.global_rank > 50
  ORDER BY global_rank;

  -- Cleanup
  DROP TABLE IF EXISTS temp_all_users;
  DROP TABLE IF EXISTS temp_ranked;
END;
$$;