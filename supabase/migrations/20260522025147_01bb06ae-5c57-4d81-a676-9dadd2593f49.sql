-- Seed verification_enabled config (default: enabled)
INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('verification_enabled', 'true', 'When false, users skip link-shortener verification and can take tests directly')
ON CONFLICT (config_key) DO NOTHING;

-- Allow public read of verification_enabled so the gate can short-circuit before auth
DROP POLICY IF EXISTS "Allow public read of maintenance config" ON public.system_config;
CREATE POLICY "Allow public read of public config"
ON public.system_config
FOR SELECT
USING (
  config_key = ANY (ARRAY[
    'maintenance_mode',
    'maintenance_scheduled_start',
    'maintenance_scheduled_end',
    'verification_enabled'
  ])
);