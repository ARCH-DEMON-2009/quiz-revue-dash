-- 1. Drop dependent policy first
DROP POLICY IF EXISTS "Users can manage their own results" ON public.results;

-- 2. Alter column type
ALTER TABLE public.results 
  ALTER COLUMN user_id TYPE uuid USING (NULL);

-- 3. Recreate policy with direct UUID comparison
CREATE POLICY "Users can manage their own results" 
  ON public.results 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 4. Harden SD function execution
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.prosecdef = true 
          AND n.nspname = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I FROM PUBLIC, anon, authenticated', func_record.schema, func_record.name);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I TO service_role', func_record.schema, func_record.name);
    END LOOP;
END $$;

-- Grant back strictly necessary SD functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
