CREATE TABLE public.tnc_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  device_id text,
  ip_hash text,
  ua_hash text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tnc_trials_device_idx ON public.tnc_trials(device_id);
CREATE INDEX tnc_trials_ip_idx ON public.tnc_trials(ip_hash);
GRANT SELECT ON public.tnc_trials TO authenticated;
GRANT ALL ON public.tnc_trials TO service_role;
ALTER TABLE public.tnc_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own trial" ON public.tnc_trials FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());