
CREATE TABLE public.access_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verifications" ON public.access_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications" ON public.access_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications" ON public.access_verifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all verifications" ON public.access_verifications
  FOR SELECT USING (is_admin());

INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('shortener_link', 'https://your-shortener-link.com', 'The shortened URL users click for verification. Admin can change this.')
ON CONFLICT (config_key) DO NOTHING;
