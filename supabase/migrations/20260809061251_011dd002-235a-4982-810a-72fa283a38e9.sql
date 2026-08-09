CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE u.email IN (
    'shashank@testsagar.com',
    'ayush@testsagar.com',
    'ayushmishra7235@gmail.com',
    'ssv01@duck.com'
  )
  UNION
  SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin';
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO anon, authenticated, service_role;