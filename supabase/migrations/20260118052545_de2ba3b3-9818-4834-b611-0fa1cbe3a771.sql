-- Update INSERT policies to allow any authenticated user to add quizzes

-- Drop the admin-only insert policies
DROP POLICY IF EXISTS "Only admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Only admins can insert tests" ON public.tests;

-- Allow any authenticated user to insert questions
CREATE POLICY "Authenticated users can insert questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow any authenticated user to insert tests
CREATE POLICY "Authenticated users can insert tests"
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK (true);