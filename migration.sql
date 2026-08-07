-- Add admin_badge_config to system_config if not exists
INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('admin_badge_config', '{"frame_type":"rainbow","badge_icon":"star","text_effect":"gradient_black","glow_color":"#9b87f5"}', 'JSON configuration for admin visual appearance')
ON CONFLICT (config_key) DO NOTHING;

GRANT SELECT, UPDATE ON public.system_config TO authenticated;
