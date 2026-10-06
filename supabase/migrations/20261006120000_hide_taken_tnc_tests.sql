ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS hide_taken_tnc_tests boolean NOT NULL DEFAULT false;