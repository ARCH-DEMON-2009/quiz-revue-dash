-- Update is_admin function to include new admin emails
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' IN (
      'shashank@testsagar.com',
      'ayush@testsagar.com',
      'ayushmishra7235@gmail.com',
      'ssv01@duck.com'
    )
  );
END;
$function$;

-- Fix RLS policy for premium_users - allow admins to insert premium records
DROP POLICY IF EXISTS "Admins can insert premium users" ON public.premium_users;
DROP POLICY IF EXISTS "Admins can update premium users" ON public.premium_users;
DROP POLICY IF EXISTS "Admins can delete premium users" ON public.premium_users;

CREATE POLICY "Admins can insert premium users" 
ON public.premium_users 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update premium users" 
ON public.premium_users 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete premium users" 
ON public.premium_users 
FOR DELETE 
TO authenticated
USING (public.is_admin());