-- 1. Fix SECURITY DEFINER functions to have explicit search_path
-- This prevents search_path injection attacks.

ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.get_admin_user_ids() SET search_path = public;

-- 2. Revoke PUBLIC execute on sensitive functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_user_ids() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated, service_role;

-- 3. Mask emails in the legacy leaderboard RPC
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    parts text[];
    local_part text;
BEGIN
    IF email IS NULL OR NOT email ~ '@' THEN
        RETURN 'Student';
    END IF;
    
    parts := string_to_array(email, '@');
    local_part := parts[1];
    local_part := regexp_replace(local_part, '[._-]+', ' ', 'g');
    
    IF length(local_part) > 3 THEN
        RETURN left(local_part, 3) || '***';
    ELSE
        RETURN 'Student';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mask_email(text) TO authenticated, service_role;

-- Update get_leaderboard_data to use mask_email
CREATE OR REPLACE FUNCTION public.get_leaderboard_data()
RETURNS TABLE (
    user_id uuid,
    name text,
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
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            tr.user_id,
            mask_email(COALESCE(up.name, auth.users.email)) as name,
            AVG(tr.percentage)::numeric as average_score,
            COUNT(*)::bigint as total_tests,
            AVG(CASE WHEN tr.total > 0 THEN (tr.correct::numeric / tr.total::numeric) * 100 ELSE 0 END)::numeric as overall_accuracy
        FROM test_results tr
        JOIN auth.users ON tr.user_id = auth.users.id
        LEFT JOIN user_profiles up ON tr.user_id = up.user_id
        GROUP BY tr.user_id, up.name, auth.users.email
    ),
    ranked_users AS (
        SELECT 
            us.*,
            PERCENT_RANK() OVER (ORDER BY us.average_score ASC)::numeric * 100 as rank_percentile,
            ROW_NUMBER() OVER (ORDER BY us.average_score DESC, us.overall_accuracy DESC) as global_rank
        FROM user_stats us
    )
    SELECT * FROM ranked_users
    ORDER BY global_rank ASC
    LIMIT 100;
END;
$$;

-- 4. Harden RLS for test_results (ensure users can only see their own detailed results, but leaderboard can see aggregates)
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- If a policy already exists, this might need care, but assuming standard Lovable setup:
DROP POLICY IF EXISTS "Users can view their own results" ON public.test_results;
CREATE POLICY "Users can view their own results"
ON public.test_results
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Leaderboard is powered by a SECURITY DEFINER function so it bypasses this RLS.
