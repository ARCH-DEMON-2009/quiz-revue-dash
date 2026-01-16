-- Insert scheduled maintenance config entries
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('maintenance_scheduled_start', '', 'Scheduled maintenance start time (ISO 8601 format)'),
  ('maintenance_scheduled_end', '', 'Scheduled maintenance end time (ISO 8601 format)')
ON CONFLICT (config_key) DO NOTHING;

-- Update RLS policy to allow public read of all maintenance-related config
DROP POLICY IF EXISTS "Allow public read of maintenance_mode config" ON public.system_config;
CREATE POLICY "Allow public read of maintenance config" ON public.system_config
  FOR SELECT
  USING (config_key IN ('maintenance_mode', 'maintenance_scheduled_start', 'maintenance_scheduled_end'));