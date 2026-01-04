-- Create a view for leaderboard data that aggregates test results
-- This view will be accessible via a security definer function to bypass RLS

CREATE OR REPLACE FUNCTION public.get_leaderboard_data()
RETURNS TABLE (
  user_id uuid,
  name varchar,
  average_score numeric,
  total_tests bigint,
  overall_accuracy numeric,
  rank_percentile numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users integer;
BEGIN
  -- Create temp table with aggregated stats
  CREATE TEMP TABLE IF NOT EXISTS temp_leaderboard AS
  SELECT 
    tr.user_id,
    COALESCE(up.name, 'Unknown User') as name,
    AVG(tr.percentage) as average_score,
    COUNT(*)::bigint as total_tests,
    CASE 
      WHEN SUM(tr.total) > 0 THEN (SUM(tr.correct)::numeric / SUM(tr.total)::numeric) * 100
      ELSE 0
    END as overall_accuracy
  FROM test_results tr
  LEFT JOIN user_profiles up ON tr.user_id = up.user_id
  WHERE tr.user_id IS NOT NULL
  GROUP BY tr.user_id, up.name
  ORDER BY AVG(tr.percentage) DESC
  LIMIT 50;

  -- Get total users for percentile calculation
  SELECT COUNT(*) INTO total_users FROM temp_leaderboard;

  -- Return with percentile
  RETURN QUERY
  SELECT 
    tl.user_id,
    tl.name::varchar,
    ROUND(tl.average_score, 2),
    tl.total_tests,
    ROUND(tl.overall_accuracy, 2),
    ROUND(((total_users - ROW_NUMBER() OVER (ORDER BY tl.average_score DESC) + 1)::numeric / GREATEST(total_users, 1)::numeric) * 100, 2) as rank_percentile
  FROM temp_leaderboard tl
  ORDER BY tl.average_score DESC;

  -- Cleanup
  DROP TABLE IF EXISTS temp_leaderboard;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data() TO authenticated;