import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpayWebhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!razorpayWebhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error("Missing Razorpay signature");
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    const expectedSignature = createHmac("sha256", razorpayWebhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Webhook signature verified successfully");

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log("Received Razorpay webhook event:", event);

    // Handle different events
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload.payment?.entity;
      const order = payload.payload.order?.entity || payment?.order_id;

      if (!payment) {
        console.error("No payment entity in webhook payload");
        return new Response(
          JSON.stringify({ error: 'Invalid payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentId = payment.id;
      const orderId = typeof order === 'string' ? order : (order?.id || payment.order_id);
      const notes = payment.notes || {};

      console.log("Processing payment:", { paymentId, orderId, notes });

      // Extract data from notes
      const userId = notes.user_id;
      const planId = notes.plan_id;
      const planName = notes.plan_name;
      const planDays = parseInt(notes.plan_days) || 30;
      const originalAmount = parseFloat(notes.original_amount) || payment.amount / 100;
      const finalAmount = payment.amount / 100;
      const promoCode = notes.promo_code || null;

      if (!userId) {
        console.error("No user_id in payment notes");
        return new Response(
          JSON.stringify({ error: 'Missing user_id in notes' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Check if this payment was already processed
      const { data: existingPayment } = await supabase
        .from('premium_users')
        .select('id')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (existingPayment) {
        console.log("Payment already processed:", paymentId);
        return new Response(
          JSON.stringify({ success: true, message: 'Payment already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user details
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('name, email')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
      }

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + planDays);

      // Save premium user
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
        console.error("Error saving premium status:", insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to activate premium' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update promo code usage if used
      if (promoCode) {
        const { data: promoData } = await supabase
          .from('promo_codes')
          .select('id, current_uses')
          .eq('code', promoCode.toUpperCase())
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

      console.log("Premium activated via webhook for user:", userId);

      // Send confirmation email
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-premium-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            email: userProfile?.email || payment.email || '',
            name: userProfile?.name || 'User',
            plan_name: planName || 'Premium',
            plan_days: planDays,
            amount: finalAmount,
            payment_id: paymentId,
            expiry_date: expiryDate.toISOString()
          })
        });

        if (!emailResponse.ok) {
          console.error("Failed to send confirmation email");
        } else {
          console.log("Confirmation email sent");
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment processed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (event === 'payment.failed') {
      const payment = payload.payload.payment?.entity;
      console.log("Payment failed:", payment?.id, payment?.error_description);
      
      // Could log failed payments or send notification here
      return new Response(
        JSON.stringify({ success: true, message: 'Failed payment logged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other events, just acknowledge
    console.log("Unhandled event type:", event);
    return new Response(
      JSON.stringify({ success: true, message: 'Event received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
