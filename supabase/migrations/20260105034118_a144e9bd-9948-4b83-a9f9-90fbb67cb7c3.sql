-- =============================================
-- SECURITY FIXES - Comprehensive RLS Update
-- =============================================

-- 1. Fix user_profiles RLS - Remove dangerous policy with USING(true)
DROP POLICY IF EXISTS "Admins can view all" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- Create proper admin view policy using has_role function
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix system_config table - Enable RLS and restrict to admins only
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Only admins can modify system config" ON public.system_config;

CREATE POLICY "Only admins can view system config" 
ON public.system_config 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can modify system config" 
ON public.system_config 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fix whatsapp_number_changes - Users can only see their own changes
DROP POLICY IF EXISTS "Users can view whatsapp changes" ON public.whatsapp_number_changes;
DROP POLICY IF EXISTS "Authenticated users can view whatsapp_number_changes" ON public.whatsapp_number_changes;
DROP POLICY IF EXISTS "Users can view own whatsapp changes" ON public.whatsapp_number_changes;

CREATE POLICY "Users can view own whatsapp changes" 
ON public.whatsapp_number_changes 
FOR SELECT 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Update get_leaderboard_data function to fetch actual user names from auth.users metadata
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
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  -- Create temp table with ALL users' aggregated stats (for accurate ranking)
  -- Use COALESCE to get name from user_profiles, then fall back to auth metadata
  CREATE TEMP TABLE temp_all_users AS
  SELECT 
    tr.user_id,
    COALESCE(
      NULLIF(up.name, 'User'),  -- Use profile name if not default "User"
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

-- 5. Fix function search_path issues for existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' IN (
      'shashank@testsagar.com',
      'ayush@testsagar.com'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_setting('role', true) = 'service_role';
$$;