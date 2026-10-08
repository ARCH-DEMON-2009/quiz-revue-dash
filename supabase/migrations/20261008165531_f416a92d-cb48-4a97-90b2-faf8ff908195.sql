CREATE TABLE public.payment_refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  premium_user_id uuid NOT NULL REFERENCES public.premium_users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text,
  refunded_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.payment_refunds TO authenticated;
GRANT ALL ON public.payment_refunds TO service_role;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view refunds" ON public.payment_refunds FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins add refunds" ON public.payment_refunds FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND amount > 0);
CREATE POLICY "Admins remove refunds" ON public.payment_refunds FOR DELETE TO authenticated USING (public.is_admin());