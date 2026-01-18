-- Fix questions INSERT policy to explicitly require authentication
DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;

CREATE POLICY "Admins can insert questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Fix tests INSERT policy to explicitly require authentication
DROP POLICY IF EXISTS "Admins can insert tests" ON public.tests;

CREATE POLICY "Admins can insert tests"
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK (is_admin());