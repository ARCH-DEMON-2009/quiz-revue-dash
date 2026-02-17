
-- Table to track bypass blocks
CREATE TABLE public.bypass_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  blocked_until timestamp with time zone NOT NULL,
  reason text DEFAULT 'Verification bypass detected',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bypass_blocks ENABLE ROW LEVEL SECURITY;

-- Users can read their own block status
CREATE POLICY "Users can read own bypass blocks"
ON public.bypass_blocks FOR SELECT
USING (auth.uid() = user_id);

-- Only system/service role inserts (we'll use edge function or direct insert with auth)
CREATE POLICY "Users can insert own bypass block"
ON public.bypass_blocks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage bypass blocks"
ON public.bypass_blocks FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
