-- 1. Profile photos: remove the "anyone can view all photos" rule
DROP POLICY IF EXISTS "Users can view all profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own profile photo" ON storage.objects;

CREATE POLICY "Owners can view their own profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Keep SECURITY DEFINER surface minimal: only functions that must be callable
-- from the client (or from RLS policies evaluated as the caller) keep EXECUTE.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.track_whatsapp_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_service_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_leaderboard_data() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Signed-in users need these: leaderboard page, admin gating, and RLS policies
-- that call has_role()/is_admin() while running as the caller's role.
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;