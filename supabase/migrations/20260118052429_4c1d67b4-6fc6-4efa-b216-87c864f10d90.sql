-- Clean up ALL policies on questions table and create proper ones
DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;
DROP POLICY IF EXISTS "Only admins can modify questions" ON public.questions;
DROP POLICY IF EXISTS "read questions" ON public.questions;

-- Create clean policies for questions
CREATE POLICY "Only authenticated users can read questions"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (is_admin());

-- Clean up ALL policies on tests table and create proper ones
DROP POLICY IF EXISTS "Admins can delete tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can insert tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can update tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can read active tests" ON public.tests;
DROP POLICY IF EXISTS "Only admins can modify tests" ON public.tests;
DROP POLICY IF EXISTS "read active tests" ON public.tests;

-- Create clean policies for tests
CREATE POLICY "Only authenticated users can read active tests"
ON public.tests
FOR SELECT
TO authenticated
USING ((status)::text = 'active'::text);

CREATE POLICY "Only admins can insert tests"
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update tests"
ON public.tests
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete tests"
ON public.tests
FOR DELETE
TO authenticated
USING (is_admin());