-- Insert maintenance_mode config if it doesn't exist
INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('maintenance_mode', 'false', 'Enable or disable site-wide maintenance mode. Admins can still access the site.')
ON CONFLICT (config_key) DO NOTHING;