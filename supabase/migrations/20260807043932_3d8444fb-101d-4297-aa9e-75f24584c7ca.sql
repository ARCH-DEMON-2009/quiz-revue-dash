-- Hardening results table RLS
DO $$
BEGIN
    DROP POLICY IF EXISTS "manage own results" ON public.results;
    DROP POLICY IF EXISTS "Users can manage their own results" ON public.results;
    
    CREATE POLICY "Users can manage their own results" ON public.results 
             FOR ALL TO authenticated USING (auth.uid()::text = user_id::text);
END $$;

-- RLS for test-pdfs
DROP POLICY IF EXISTS "Authenticated users can download PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can download PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'test-pdfs' AND 
  (EXISTS (
    SELECT 1 FROM public.premium_users 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND expiry_date > now()
  ))
);

-- RLS for profile photos
DROP POLICY IF EXISTS "Users can view their own profile photo" ON storage.objects;
CREATE POLICY "Users can view their own profile photo"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile_photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Revoke public EXECUTE on SECURITY DEFINER functions
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
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I FROM PUBLIC, anon, authenticated', func_record.schema, func_record.name);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I TO service_role', func_record.schema, func_record.name);
        IF func_record.name IN ('has_role', 'is_admin') THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I TO authenticated', func_record.schema, func_record.name);
        END IF;
    END LOOP;
END $$;
