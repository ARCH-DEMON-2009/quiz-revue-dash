import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      user_id,
      plan_id,
      plan_name,
      plan_days,
      original_amount,
      final_amount,
      promo_code
    } = await req.json();

    console.log("Verifying payment:", { razorpay_payment_id, user_id, plan_name });

    // Get Razorpay secret
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      return new Response(
        JSON.stringify({ error: 'Payment verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(body)
      .digest("hex");

    const isValidSignature = expectedSignature === razorpay_signature;
    console.log("Signature verification:", isValidSignature ? "VALID" : "INVALID");

    if (!isValidSignature) {
      console.error("Invalid payment signature");
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user details
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan_days);

    // Save premium user
    const { error: insertError } = await supabase.from('premium_users').insert({
      user_id: user_id,
      email: userProfile?.email || '',
      name: userProfile?.name || 'User',
      payment_id: razorpay_payment_id,
      expiry_date: expiryDate.toISOString(),
      plan_months: Math.round(plan_days / 30),
      plan_duration_type: 'days',
      plan_duration_value: plan_days,
      original_amount: original_amount,
      discounted_amount: final_amount,
      promo_code_used: promo_code || null,
      status: 'active',
      start_date: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error saving premium status:", insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Payment verified but failed to activate premium. Contact support with payment ID: ' + razorpay_payment_id,
          verified: true,
          activated: false,
          payment_id: razorpay_payment_id
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update promo code usage if used
    if (promo_code) {
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('id, current_uses')
        .eq('code', promo_code.toUpperCase())
        .maybeSingle();

      if (promoData) {
        // Increment usage count
        await supabase
          .from('promo_codes')
          .update({ current_uses: (promoData.current_uses || 0) + 1 })
          .eq('id', promoData.id);

        // Record usage
        await supabase.from('promo_code_usage').insert({
          promo_code_id: promoData.id,
          user_id: user_id,
          payment_id: razorpay_payment_id,
          discount_applied: original_amount - final_amount
        });
      }
    }

    console.log("Payment verified and premium activated for user:", user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        verified: true, 
        activated: true,
        expiry_date: expiryDate.toISOString(),
        message: 'Payment verified and premium activated!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
