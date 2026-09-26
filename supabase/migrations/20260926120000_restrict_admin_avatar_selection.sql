CREATE OR REPLACE FUNCTION public.prevent_non_admin_avatar_selection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.avatar_url IN (
    'https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg',
    'https://i.pinimg.com/736x/30/3e/e7/303ee7ab0970b4f16301801e54f802dd.jpg',
    'https://i.pinimg.com/originals/50/4a/1f/504a1f0e735c24559529631a62146a4c.gif'
  )
  AND NOT public.is_admin()
  AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'This avatar is only available to admins.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_non_admin_avatar_selection
BEFORE INSERT OR UPDATE OF avatar_url ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_avatar_selection();