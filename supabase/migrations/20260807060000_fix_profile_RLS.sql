-- Drop restrictive profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view their own profile photos" ON storage.objects;

-- 1. Profiles: Allow all authenticated users to see basic profile data (avatar_url, name)
-- This is necessary for leaderboards and social features.
CREATE POLICY "Profiles are viewable by everyone authenticated"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Storage: Allow all authenticated users to view profile photos
-- Restrict to the profile-photos bucket for security.
CREATE POLICY "Profile photos are viewable by everyone authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Ensure users can still update their own profile (this was dropped/overwritten in some migrations)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.user_profiles TO authenticated;
