-- Drop the old policy that uses has_role which doesn't have any admin roles
DROP POLICY IF EXISTS "Only admins can modify system config" ON public.system_config;

-- Create new policy using is_admin() function which works based on email
CREATE POLICY "Only admins can modify system config"
ON public.system_config
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());