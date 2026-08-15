-- Security hardening for user identities and function access.
-- Prevents email exposure and restricts sensitive function execution.

-- 1. Identity Resolution Hardening
-- Ensure display names are strictly sanitized to never include emails.
CREATE OR REPLACE FUNCTION public.mask_email(email_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    local_part text;
BEGIN
    IF email_text IS NULL THEN RETURN 'Student'; END IF;
    IF email_text !~ '@' THEN RETURN email_text; END IF;
    
    local_part := split_part(email_text, '@', 1);
    local_part := regexp_replace(local_part, '[._-]+', ' ', 'g');
    
    IF length(local_part) > 3 THEN
        RETURN left(local_part, 3) || '***';
    ELSE
        RETURN 'Student';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mask_email(text) TO anon, authenticated, service_role;

-- 2. Restrict Sensitive SECURITY DEFINER Functions
-- Explicitly revoke public access to internal identity/config functions.
REVOKE EXECUTE ON FUNCTION public.get_admin_user_ids() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO service_role;

-- Ensure is_admin and has_role (which are safe/necessary) remain accessible to users.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. RLS Refinement for sensitive tables
-- Ensure results can never be modified by the user after insertion (scoring integrity).
DROP POLICY IF EXISTS "Users can manage their own results" ON public.results;
CREATE POLICY "Users can insert own results" ON public.results 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own results" ON public.results 
  FOR SELECT TO authenticated 
  USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all results" ON public.results 
  FOR ALL TO authenticated 
  USING (public.is_admin());

-- 4. Audit Log for sensitive config changes
CREATE TABLE IF NOT EXISTS public.config_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.config_audit_log TO authenticated;
GRANT ALL ON public.config_audit_log TO service_role;
ALTER TABLE public.config_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.config_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.audit_config_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.config_value IS DISTINCT FROM NEW.config_value THEN
    INSERT INTO public.config_audit_log (config_key, old_value, new_value, changed_by)
    VALUES (NEW.config_key, OLD.config_value, NEW.config_value, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_config_changes ON public.system_config;
CREATE TRIGGER tr_audit_config_changes
  AFTER UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_config_changes();
