-- Add is_blocked column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN is_blocked boolean DEFAULT false;

-- Create index for better performance on blocked users lookup
CREATE INDEX idx_user_profiles_is_blocked ON public.user_profiles(is_blocked);

-- Add RLS policy for admins to update blocked status
CREATE POLICY "Admins can update user blocked status"
ON public.user_profiles
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Add RLS policy for admins to view all user profiles
CREATE POLICY "Admins can view all user profiles"
ON public.user_profiles
FOR SELECT
USING (is_admin());

-- Create a view for admin dashboard statistics
CREATE OR REPLACE VIEW public.admin_user_stats AS
SELECT 
  up.user_id,
  up.name,
  up.email,
  up.whatsapp_number,
  up.is_blocked,
  up.created_at as member_since,
  ua.total_tests,
  ua.average_score,
  CASE 
    WHEN pu.user_id IS NOT NULL THEN 'premium'
    WHEN ut.user_id IS NOT NULL THEN 'trial'
    ELSE 'free'
  END as account_type,
  pu.expiry_date as premium_expiry,
  ut.start_date as trial_start
FROM public.user_profiles up
LEFT JOIN public.user_analytics ua ON up.user_id = ua.user_id
LEFT JOIN public.premium_users pu ON up.user_id = pu.user_id
LEFT JOIN public.user_trials ut ON up.user_id = ut.user_id;

-- Add RLS policy for admin view
ALTER TABLE public.admin_user_stats SET (security_invoker = true);