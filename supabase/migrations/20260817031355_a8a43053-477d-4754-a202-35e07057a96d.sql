-- Grant permissions for newly created logs table
GRANT SELECT, INSERT ON public.admin_gift_logs TO authenticated;
GRANT ALL ON public.admin_gift_logs TO service_role;
