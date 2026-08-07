-- Enable user to update their own profile picture
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Replace the policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_leaderboard_data()
RETURNS TABLE(
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
  week_start timestamp;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Define the start of the current week (Monday)
  week_start := date_trunc('week', now());

  -- Create temp table with current week's aggregated stats
  CREATE TEMP TABLE temp_all_users AS
  SELECT 
    tr.user_id,
    COALESCE(
      NULLIF(up.name, 'User'),
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = tr.user_id),
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = tr.user_id),
      (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = tr.user_id),
      'Student'
    ) as name,
    AVG(tr.percentage) as average_score,
    COUNT(*)::bigint as total_tests,
    CASE 
      WHEN SUM(tr.total) > 0 THEN (SUM(tr.correct)::numeric / SUM(tr.total)::numeric) * 100
      ELSE 0
    END as overall_accuracy
  FROM test_results tr
  LEFT JOIN user_profiles up ON tr.user_id = up.user_id
  WHERE tr.user_id IS NOT NULL
    AND tr.completed_at >= week_start -- ONLY THIS WEEK'S DATA
  GROUP BY tr.user_id, up.name;

  -- Get total users for percentile calculation
  SELECT COUNT(*) INTO total_users FROM temp_all_users;

  -- Add ranking
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

  -- Return results
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
