-- Bulk Grant Permissions for all public tables
-- Required for PostgREST Data API access

GRANT ALL ON public.access_verifications TO authenticated, service_role;
GRANT ALL ON public.bypass_blocks TO authenticated, service_role;
GRANT ALL ON public.exam_attempts TO authenticated, service_role;
GRANT ALL ON public.premium_users TO authenticated, service_role;
GRANT ALL ON public.profile_pictures TO authenticated, service_role;
GRANT ALL ON public.promo_code_usage TO authenticated, service_role;
GRANT ALL ON public.promo_codes TO authenticated, service_role;
GRANT ALL ON public.questions TO authenticated, service_role;
GRANT ALL ON public.quiz_attempts TO authenticated, service_role;
GRANT ALL ON public.results TO authenticated, service_role;
GRANT ALL ON public.security_events TO authenticated, service_role;
GRANT ALL ON public.system_config TO authenticated, service_role;
GRANT ALL ON public.test_results TO authenticated, service_role;
GRANT ALL ON public.tests TO authenticated, service_role;
GRANT ALL ON public.user_analytics TO authenticated, service_role;
GRANT ALL ON public.user_preferences TO authenticated, service_role;
GRANT ALL ON public.user_profiles TO authenticated, service_role;
GRANT ALL ON public.user_roles TO authenticated, service_role;
GRANT ALL ON public.user_sessions TO authenticated, service_role;
GRANT ALL ON public.user_trials TO authenticated, service_role;

-- Public read access for specific tables
GRANT SELECT ON public.tests TO anon;
GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.profile_pictures TO anon;
GRANT SELECT ON public.user_profiles TO anon;
GRANT SELECT ON public.system_config TO anon;

-- Ensure sequences are also granted if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
