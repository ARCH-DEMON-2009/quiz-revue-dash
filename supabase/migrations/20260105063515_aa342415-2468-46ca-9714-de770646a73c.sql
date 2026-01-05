-- Allow admin users to insert/update tests and questions from any origin
-- This enables the quiz-maker app to work when logged in as admin

-- Drop existing policies on tests table if any restrictive ones exist
DROP POLICY IF EXISTS "Admins can insert tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can update tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can delete tests" ON public.tests;

-- Create policies for tests table
CREATE POLICY "Admins can insert tests" 
ON public.tests 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tests" 
ON public.tests 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tests" 
ON public.tests 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Drop existing policies on questions table if any restrictive ones exist
DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;

-- Create policies for questions table
CREATE POLICY "Admins can insert questions" 
ON public.questions 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update questions" 
ON public.questions 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete questions" 
ON public.questions 
FOR DELETE 
TO authenticated
USING (public.is_admin());