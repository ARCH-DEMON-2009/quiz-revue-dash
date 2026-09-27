CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DELETE FROM public.bypass_blocks
WHERE blocked_until > now()
	AND reason LIKE 'Bypass attempt: completed in % (min 60s required)';