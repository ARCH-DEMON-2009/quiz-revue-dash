CREATE TABLE public.admin_gift_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed'
    error_details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_gift_logs TO authenticated;
GRANT ALL ON public.admin_gift_logs TO service_role;

ALTER TABLE public.admin_gift_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all gift logs"
ON public.admin_gift_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert gift logs"
ON public.admin_gift_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
