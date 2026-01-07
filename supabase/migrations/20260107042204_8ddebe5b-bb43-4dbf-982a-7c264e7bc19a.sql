-- Create promo_codes table for admin-managed discount codes
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL means no expiry
  excluded_plans TEXT[] DEFAULT '{}', -- Array of plan IDs that cannot use this code
  min_order_amount NUMERIC DEFAULT 0, -- Minimum order amount required
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create promo_code_usage table to track who used which code
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  payment_id VARCHAR(255),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  discount_applied NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Policies for promo_codes (admin only for write, public for validate)
CREATE POLICY "Anyone can validate promo codes" 
ON public.promo_codes 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" 
ON public.promo_codes 
FOR ALL 
USING (public.is_admin());

-- Policies for promo_code_usage
CREATE POLICY "Users can view their own usage" 
ON public.promo_code_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert usage" 
ON public.promo_code_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage" 
ON public.promo_code_usage 
FOR SELECT 
USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active) WHERE is_active = true;