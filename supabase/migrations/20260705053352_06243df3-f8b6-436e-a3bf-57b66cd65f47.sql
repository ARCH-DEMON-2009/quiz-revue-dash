-- =====================================================================
-- SECURITY HARDENING MIGRATION
-- Fixes critical RLS findings: public answer keys, public test writes,
-- self-granted premium, cross-user profile edits, PII exposure, and
-- client-side self-verification bypass.
-- =====================================================================

-- 1. QUESTIONS: remove public "allow_all" access (exposes 57k answer keys),
--    restrict inserts to admins.
DROP POLICY IF EXISTS "allow_all_questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;
CREATE POLICY "Only admins can insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 2. TESTS: remove public "allow_all" access, restrict inserts to admins.
DROP POLICY IF EXISTS "allow_all_tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can insert tests" ON public.tests;
CREATE POLICY "Only admins can insert tests"
  ON public.tests FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 3. PREMIUM_USERS: remove self-grant insert/update. Only service_role
--    (edge functions after payment verification) may write.
DROP POLICY IF EXISTS "Users can insert own premium records" ON public.premium_users;
DROP POLICY IF EXISTS "Users can update own premium records" ON public.premium_users;

-- 4. USER_PROFILES: scope the always-true admin update policy to admins only.
--    (Users keep their own self-update policies which are auth.uid()=user_id.)
DROP POLICY IF EXISTS "Allow admin update user profiles" ON public.user_profiles;
CREATE POLICY "Admins can update any user profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. WHATSAPP_NUMBER_CHANGES: the "admin" view policy actually allowed ANY
--    authenticated user. Replace with a real admin check. (A separate policy
--    already lets users see their own rows.)
DROP POLICY IF EXISTS "Only admins can view WhatsApp number changes" ON public.whatsapp_number_changes;
CREATE POLICY "Admins can view all WhatsApp number changes"
  ON public.whatsapp_number_changes FOR SELECT TO authenticated
  USING (public.is_admin());

-- 6. PROMO_CODES: require authentication to read active codes (was public).
DROP POLICY IF EXISTS "Anyone can validate promo codes" ON public.promo_codes;
CREATE POLICY "Authenticated users can validate promo codes"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (is_active = true);

-- 7. ACCESS_VERIFICATIONS: users must NOT be able to self-set status='verified'.
--    Remove the client UPDATE policy entirely; a trusted edge function using
--    the service role will complete verifications server-side.
DROP POLICY IF EXISTS "Users can update own verifications" ON public.access_verifications;