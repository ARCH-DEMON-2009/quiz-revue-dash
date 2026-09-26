CREATE OR REPLACE FUNCTION public.get_public_milestone_profiles(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  badge_ids text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH requested_users AS (
    SELECT DISTINCT requested.user_id
    FROM unnest(COALESCE(p_user_ids, ARRAY[]::uuid[])) AS requested(user_id)
    WHERE requested.user_id IS NOT NULL
    LIMIT 250
  ), all_results AS (
    SELECT
      tr.user_id,
      COALESCE(tr.total, 0)::numeric AS question_total,
      COALESCE(tr.correct, 0)::numeric AS correct_count,
      COALESCE(tr.percentage, 0)::numeric AS percentage,
      tr.completed_at AS submitted_at
    FROM public.test_results tr
    JOIN requested_users requested ON requested.user_id = tr.user_id

    UNION ALL

    SELECT
      requested.user_id,
      (COALESCE(qa.correct_count, 0) + COALESCE(qa.wrong_count, 0) + COALESCE(qa.skipped_count, 0))::numeric,
      COALESCE(qa.correct_count, 0)::numeric,
      CASE WHEN qa.total_marks > 0
        THEN COALESCE(qa.score, 0) * 100 / qa.total_marks
        ELSE 0
      END,
      qa.submitted_at
    FROM public.quiz_attempts qa
    JOIN requested_users requested ON qa.user_id = requested.user_id::text
  ), result_stats AS (
    SELECT
      results.user_id,
      COUNT(*)::integer AS total_tests,
      CASE WHEN SUM(results.question_total) > 0
        THEN SUM(results.correct_count) * 100 / SUM(results.question_total)
        ELSE 0
      END AS overall_accuracy,
      COALESCE(MAX(results.percentage), 0) AS best_score
    FROM all_results results
    GROUP BY results.user_id
  ), practice_days AS (
    SELECT DISTINCT results.user_id, results.submitted_at::date AS practice_day
    FROM all_results results
    WHERE results.submitted_at IS NOT NULL
  ), ranked_days AS (
    SELECT
      user_id,
      practice_day,
      MAX(practice_day) OVER (PARTITION BY user_id) AS latest_day,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY practice_day DESC) AS day_rank
    FROM practice_days
  ), streak_stats AS (
    SELECT user_id,
      CASE
        WHEN MAX(latest_day) >= (timezone('utc', now())::date - 1)
          THEN COUNT(*) FILTER (
            WHERE practice_day = latest_day - (day_rank - 1)::integer
          )::integer
        ELSE 0
      END AS streak_days
    FROM ranked_days
    GROUP BY user_id
  )
  SELECT
    requested.user_id,
    CASE
      WHEN NULLIF(BTRIM(profile.name), '') IS NULL OR profile.name LIKE '%@%'
        THEN 'Student'
      ELSE profile.name
    END,
    profile.avatar_url,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(stats.total_tests, 0) >= 1 THEN 'first' END,
      CASE WHEN COALESCE(stats.total_tests, 0) >= 10 THEN 'ten' END,
      CASE WHEN COALESCE(stats.total_tests, 0) >= 50 THEN 'fifty' END,
      CASE WHEN COALESCE(stats.total_tests, 0) >= 100 THEN 'hundred' END,
      CASE WHEN COALESCE(stats.total_tests, 0) >= 250 THEN 'twoFifty' END,
      CASE WHEN COALESCE(stats.overall_accuracy, 0) >= 60 THEN 'acc60' END,
      CASE WHEN COALESCE(stats.overall_accuracy, 0) >= 80 THEN 'acc80' END,
      CASE WHEN COALESCE(stats.overall_accuracy, 0) >= 90 THEN 'acc90' END,
      CASE WHEN COALESCE(stats.best_score, 0) >= 90 THEN 'score90' END,
      CASE WHEN COALESCE(stats.best_score, 0) >= 95 THEN 'score95' END,
      CASE WHEN COALESCE(stats.best_score, 0) >= 100 THEN 'scorePerfect' END,
      CASE WHEN COALESCE(streak.streak_days, 0) >= 3 THEN 'streak3' END,
      CASE WHEN COALESCE(streak.streak_days, 0) >= 7 THEN 'streak7' END,
      CASE WHEN COALESCE(streak.streak_days, 0) >= 14 THEN 'streak14' END,
      CASE WHEN COALESCE(streak.streak_days, 0) >= 30 THEN 'streak30' END
    ]::text[], NULL) AS badge_ids
  FROM requested_users requested
  LEFT JOIN public.user_profiles profile ON profile.user_id = requested.user_id
  LEFT JOIN result_stats stats ON stats.user_id = requested.user_id
  LEFT JOIN streak_stats streak ON streak.user_id = requested.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_milestone_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_milestone_profiles(uuid[]) TO anon, authenticated;