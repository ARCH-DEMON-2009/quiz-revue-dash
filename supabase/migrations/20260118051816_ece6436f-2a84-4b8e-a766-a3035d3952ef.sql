-- Fix questions table RLS policies
-- Drop the problematic SELECT policy that allows anyone to read
DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;

-- Recreate with proper authentication check
CREATE POLICY "Authenticated users can read questions"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

-- Fix tests table RLS policies
-- Drop the problematic SELECT policies
DROP POLICY IF EXISTS "Authenticated users can read active tests" ON public.tests;
DROP POLICY IF EXISTS "read active tests" ON public.tests;

-- Recreate with proper authentication check (only authenticated users can read active tests)
CREATE POLICY "Authenticated users can read active tests"
ON public.tests
FOR SELECT
TO authenticated
USING ((status)::text = 'active'::text);