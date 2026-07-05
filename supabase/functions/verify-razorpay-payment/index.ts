import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Authoritative server-side plan catalog. Plan duration and price are derived
 * from THIS map (keyed by plan_id) — never from the client request body — so a
 * user cannot pay for a cheap plan and then request a longer duration.
 */
const PLAN_CATALOG: Record<string, { days: number; price: number; name: string }> = {
  "1week": { days: 7, price: 20, name: "1 Week" },
  "1month": { days: 30, price: 60, name: "1 Month" },
  "3months": { days: 90, price: 90, name: "3 Months" },
  "6months": { days: 180, price: 120, name: "6 Months" },
  "1year": { days: 365, price: 160, name: "1 Year" },
  "2years": { days: 730, price: 230, name: "2 Years" },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonRes = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ---- Require authentication; derive the user from the JWT (never the body).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonRes({ error: 'Unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonRes({ error: 'Invalid authentication' }, 401);
    const userId = user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_id,
      promo_code,
      is_free_order,
    } = await req.json();

    // ---- Resolve authoritative plan details from the server catalog.
    const plan = PLAN_CATALOG[String(plan_id)];
    if (!plan) return jsonRes({ error: 'Invalid plan' }, 400);
    const planDays = plan.days;
    const originalAmount = plan.price;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let finalAmount = originalAmount;

    if (is_free_order) {
      // ---- Free order: re-validate server-side that the promo genuinely
      // reduces THIS plan's price to 0. Never trust a client "free" flag alone.
      if (!promo_code) return jsonRes({ error: 'Promo code required for free order' }, 400);

      const validateRes = await fetch(`${supabaseUrl}/functions/v1/validate-promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ code: promo_code, plan_id, plan_price: originalAmount, user_id: userId }),
      });
      const validation = await validateRes.json();
      if (!validation?.valid || Number(validation.final_price) !== 0) {
        return jsonRes({ error: 'Promo code does not make this plan free', verified: false }, 400);
      }
      finalAmount = 0;
    } else {
      // ---- Paid order: verify the Razorpay HMAC signature.
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')?.trim();
      if (!razorpayKeySecret) {
        return jsonRes({ error: 'Payment verification not configured' }, 500);
      }
      const expectedSignature = createHmac("sha256", razorpayKeySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (expectedSignature !== razorpay_signature) {
        return jsonRes({ error: 'Invalid payment signature', verified: false }, 400);
      }

      // ---- Cross-check the amount actually paid against the plan price,
      // allowing for any legitimate promo discount validated server-side.
      let expectedAmount = originalAmount;
      if (promo_code) {
        const validateRes = await fetch(`${supabaseUrl}/functions/v1/validate-promo-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ code: promo_code, plan_id, plan_price: originalAmount, user_id: userId }),
        });
        const validation = await validateRes.json();
        if (validation?.valid) expectedAmount = Number(validation.final_price);
      }

      // Fetch the authoritative paid amount from Razorpay.
      if (razorpayKeyId) {
        try {
          const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
            headers: { 'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}` },
          });
          if (orderRes.ok) {
            const order = await orderRes.json();
            const paidRupees = Math.round((order.amount ?? 0) / 100);
            if (paidRupees < expectedAmount) {
              return jsonRes({ error: 'Paid amount does not match plan price', verified: false }, 400);
            }
            finalAmount = paidRupees;
          } else {
            finalAmount = expectedAmount;
          }
        } catch (_) {
          finalAmount = expectedAmount;
        }
      } else {
        finalAmount = expectedAmount;
      }
    }

    // ---- Fetch user details for the record.
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('user_id', userId)
      .maybeSingle();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDays);

    const { error: insertError } = await supabase.from('premium_users').insert({
      user_id: userId,
      email: userProfile?.email || user.email || '',
      name: userProfile?.name || 'User',
      payment_id: razorpay_payment_id,
      expiry_date: expiryDate.toISOString(),
      plan_months: Math.round(planDays / 30),
      plan_duration_type: 'days',
      plan_duration_value: planDays,
      original_amount: originalAmount,
      discounted_amount: finalAmount,
      promo_code_used: promo_code || null,
      status: 'active',
      start_date: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error saving premium status:", insertError);
      return jsonRes({
        error: 'Payment verified but failed to activate premium. Contact support with payment ID: ' + razorpay_payment_id,
        verified: true,
        activated: false,
        payment_id: razorpay_payment_id,
      }, 500);
    }

    // ---- Record promo usage.
    if (promo_code) {
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('id, current_uses')
        .eq('code', String(promo_code).toUpperCase())
        .maybeSingle();
      if (promoData) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (promoData.current_uses || 0) + 1 })
          .eq('id', promoData.id);
        await supabase.from('promo_code_usage').insert({
          promo_code_id: promoData.id,
          user_id: userId,
          payment_id: razorpay_payment_id,
          discount_applied: originalAmount - finalAmount,
        });
      }
    }

    // ---- Confirmation email (non-blocking).
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-premium-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          email: userProfile?.email || user.email || '',
          name: userProfile?.name || 'User',
          plan_name: plan.name,
          plan_days: planDays,
          amount: finalAmount,
          payment_id: razorpay_payment_id,
          expiry_date: expiryDate.toISOString(),
        }),
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
    }

    return jsonRes({
      success: true,
      verified: true,
      activated: true,
      expiry_date: expiryDate.toISOString(),
      message: 'Payment verified and premium activated!',
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return jsonRes({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
