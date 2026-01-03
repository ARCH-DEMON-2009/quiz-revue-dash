-- Fix security: Remove overly permissive policies that expose data

-- 1. Drop dangerous "allow all" policies on questions table
DROP POLICY IF EXISTS "Allow all operations on questions" ON public.questions;

-- 2. Drop dangerous "allow all" policies on tests table  
DROP POLICY IF EXISTS "Allow all operations on tests" ON public.tests;

-- 3. Drop public read policies that expose user PII
DROP POLICY IF EXISTS "Allow public read access to user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public read access to user trials" ON public.user_trials;
DROP POLICY IF EXISTS "Allow public read access to premium users" ON public.premium_users;

-- 4. Create proper authenticated-only read policy for questions
CREATE POLICY "Authenticated users can read questions"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

-- 5. Create admin-only write policy for questions
CREATE POLICY "Only admins can modify questions"
ON public.questions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 6. Create proper authenticated-only read policy for tests
CREATE POLICY "Authenticated users can read active tests"
ON public.tests
FOR SELECT
TO authenticated
USING (status = 'active');

-- 7. Create admin-only write policy for tests
CREATE POLICY "Only admins can modify tests"
ON public.tests
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 8. Add RLS policies to admin_user_stats view (if it's a table)
-- Note: Views inherit RLS from underlying tables, so we need to ensure source tables are protected