import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify signature
    const expectedSig = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (expectedSig !== signature) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const event = JSON.parse(rawBody);
    console.log("Webhook event received:", event.event);

    // Only act on captured payments
    if (event.event !== 'payment.captured' && event.event !== 'order.paid') {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return new Response(JSON.stringify({ error: 'No payment entity' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const notes = payment.notes || {};
    const userId = notes.user_id;
    const planId = notes.plan_id;
    const planName = notes.plan_name || 'Premium';
    const planDays = parseInt(notes.plan_days || '30', 10);
    const originalAmount = parseFloat(notes.original_amount || String(payment.amount / 100));
    const finalAmount = parseFloat(notes.final_amount || String(payment.amount / 100));
    const promoCode = notes.promo_code || null;

    if (!userId) {
      console.error("Missing user_id in payment notes:", notes);
      return new Response(JSON.stringify({ error: 'Missing user_id in notes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency: skip if this payment_id already activated premium
    const { data: existing } = await supabase
      .from('premium_users')
      .select('id')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existing) {
      console.log("Payment already processed:", paymentId);
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('user_id', userId)
      .maybeSingle();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDays);

    const { error: insertError } = await supabase.from('premium_users').insert({
      user_id: userId,
      email: userProfile?.email || payment.email || '',
      name: userProfile?.name || 'User',
      payment_id: paymentId,
      expiry_date: expiryDate.toISOString(),
      plan_months: Math.round(planDays / 30),
      plan_duration_type: 'days',
      plan_duration_value: planDays,
      original_amount: originalAmount,
      discounted_amount: finalAmount,
      promo_code_used: promoCode,
      status: 'active',
      start_date: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to insert premium user:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Premium activated via webhook for user ${userId}, payment ${paymentId}, order ${orderId}`);

    // Update promo usage
    if (promoCode) {
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('id, current_uses')
        .eq('code', String(promoCode).toUpperCase())
        .maybeSingle();

      if (promoData) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (promoData.current_uses || 0) + 1 })
          .eq('id', promoData.id);

        await supabase.from('promo_code_usage').insert({
          promo_code_id: promoData.id,
          user_id: userId,
          payment_id: paymentId,
          discount_applied: originalAmount - finalAmount
        });
      }
    }

    // Send confirmation email (non-blocking)
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-premium-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          email: userProfile?.email || '',
          name: userProfile?.name || 'User',
          plan_name: planName,
          plan_days: planDays,
          amount: finalAmount,
          payment_id: paymentId,
          expiry_date: expiryDate.toISOString()
        })
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError);
    }

    return new Response(JSON.stringify({ received: true, activated: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
