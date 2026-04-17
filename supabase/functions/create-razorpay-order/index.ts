import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'INR', receipt, notes } = await req.json();

    console.log("Creating Razorpay order:", { amount, currency, receipt });

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')?.trim();
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')?.trim();

    console.log("Key ID prefix:", razorpayKeyId?.substring(0, 12) + "...");
    console.log("Key ID length:", razorpayKeyId?.length);
    console.log("Secret length:", razorpayKeySecret?.length);

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay credentials not configured");
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate key format
    if (!razorpayKeyId.startsWith('rzp_live_') && !razorpayKeyId.startsWith('rzp_test_')) {
      console.error("Invalid Razorpay Key ID format. Must start with rzp_live_ or rzp_test_");
      return new Response(
        JSON.stringify({ error: 'Payment gateway misconfigured: invalid key format. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (razorpayKeySecret.length < 20) {
      console.error("Razorpay Key Secret appears too short - likely invalid");
      return new Response(
        JSON.stringify({ error: 'Payment gateway misconfigured: invalid secret. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order via Razorpay API
    const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // Razorpay receipt must be <= 40 chars
    const rawReceipt = receipt || `order_${Date.now()}`;
    const safeReceipt = rawReceipt.length > 40 ? rawReceipt.slice(-40) : rawReceipt;

    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency,
        receipt: safeReceipt,
        notes: notes || {},
      }),
    });

    const responseText = await orderResponse.text();

    if (!orderResponse.ok) {
      console.error("Razorpay order creation failed. Status:", orderResponse.status);
      console.error("Razorpay error response:", responseText);

      let errorMessage = 'Failed to create payment order';
      let parsedError: any = null;
      try {
        parsedError = JSON.parse(responseText);
      } catch (_) {}

      const description = parsedError?.error?.description || '';
      const code = parsedError?.error?.code || '';

      if (orderResponse.status === 401 || /authentication failed/i.test(description)) {
        errorMessage = 'Payment gateway authentication failed. The Razorpay API keys are invalid or expired. Please contact support.';
      } else if (description) {
        errorMessage = `Razorpay error: ${description}`;
      }

      return new Response(
        JSON.stringify({ error: errorMessage, code, razorpay_status: orderResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = JSON.parse(responseText);
    console.log("Razorpay order created:", orderData.id);

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        key_id: razorpayKeyId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
