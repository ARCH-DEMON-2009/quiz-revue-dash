-- Allow anyone to read the maintenance_mode config (needed for maintenance page to work)
CREATE POLICY "Anyone can read maintenance_mode config"
  ON public.system_config
  FOR SELECT
  USING (config_key = 'maintenance_mode');

-- Drop the restrictive admin-only select policy
DROP POLICY IF EXISTS "Only admins can view system config" ON public.system_config;