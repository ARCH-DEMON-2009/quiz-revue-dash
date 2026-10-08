CREATE POLICY "Anyone can read admin badge config" ON public.system_config FOR SELECT USING (config_key = 'admin_badge_config');

CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient text NOT NULL,
  subject text NOT NULL,
  email_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  resend_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_logs_resend_id_idx ON public.email_logs(resend_id);
CREATE INDEX email_logs_created_idx ON public.email_logs(created_at DESC);
GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view email logs" ON public.email_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON public.email_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();