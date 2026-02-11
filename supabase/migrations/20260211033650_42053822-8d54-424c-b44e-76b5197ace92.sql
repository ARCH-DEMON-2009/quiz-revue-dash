-- Allow authenticated users to read the shortener_link config
CREATE POLICY "Authenticated users can read shortener_link"
ON public.system_config
FOR SELECT
USING (config_key = 'shortener_link');

-- Ensure the shortener_link row exists
INSERT INTO system_config (config_key, config_value, description)
VALUES ('shortener_link', 'https://your-shortener-link.com', 'The shortened URL users click for verification. Admin can change this.')
ON CONFLICT (config_key) DO NOTHING;