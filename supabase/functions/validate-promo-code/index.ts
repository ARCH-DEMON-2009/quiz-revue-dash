import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, plan_id, plan_price, user_id } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Validating promo code:", code, "for plan:", plan_id);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch promo code
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (promoError) {
      console.error("Error fetching promo code:", promoError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Error validating promo code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!promo) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid promo code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code has expired
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code is not yet active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code has reached max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code has reached maximum usage limit' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if plan is excluded
    if (promo.excluded_plans && promo.excluded_plans.length > 0) {
      if (promo.excluded_plans.includes(plan_id)) {
        return new Response(
          JSON.stringify({ valid: false, error: 'This promo code is not valid for the selected plan' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check minimum order amount
    if (promo.min_order_amount && plan_price < promo.min_order_amount) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Minimum order amount of ₹${promo.min_order_amount} required for this code` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already used this code
    if (user_id) {
      const { data: existingUsage } = await supabase
        .from('promo_code_usage')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (existingUsage) {
        return new Response(
          JSON.stringify({ valid: false, error: 'You have already used this promo code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = Math.round((plan_price * promo.discount_value) / 100);
    } else {
      discountAmount = Math.min(promo.discount_value, plan_price); // Can't discount more than price
    }

    const finalPrice = Math.max(0, plan_price - discountAmount);

    console.log("Promo code valid:", {
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discountAmount,
      final_price: finalPrice
    });

    return new Response(
      JSON.stringify({
        valid: true,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_amount: discountAmount,
        final_price: finalPrice,
        message: promo.discount_type === 'percentage' 
          ? `${promo.discount_value}% discount applied!`
          : `₹${promo.discount_value} discount applied!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error validating promo code:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
