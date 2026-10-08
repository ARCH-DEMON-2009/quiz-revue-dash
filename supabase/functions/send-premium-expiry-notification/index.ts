import { renderEmail, esc, button, list, callout, SITE } from "../_shared/email-layout.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('resend_api_key') ?? Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Resend API key is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Authorization: this endpoint reads paying customers' PII and sends
    // real emails/SMS, so it must only be callable by the scheduled/internal
    // job (service-role key) or an authenticated admin.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    let authorized = false;
    if (token && token === supabaseServiceKey) {
      authorized = true;
    } else if (token) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await userClient.rpc('is_admin');
        authorized = !!isAdmin;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting premium expiry notification check...');


    // Find premium users expiring in exactly 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const windowStart = new Date(threeDaysFromNow);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(threeDaysFromNow);
    windowEnd.setHours(23, 59, 59, 999);

    const { data: expiringUsers, error } = await supabase
      .from('premium_users')
      .select('user_id, email, name, expiry_date, plan_months')
      .eq('status', 'active')
      .gte('expiry_date', windowStart.toISOString())
      .lte('expiry_date', windowEnd.toISOString());

    if (error) {
      console.error('Error fetching expiring premium users:', error);
      throw error;
    }

    console.log(`Found ${expiringUsers?.length || 0} premium users expiring in 3 days`);

    // Aggregate counters only — never per-user contact details in the response.
    let sentCount = 0;
    let failedCount = 0;


    for (const user of expiringUsers || []) {
      const expiryDate = new Date(user.expiry_date);
      const formattedExpiry = expiryDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const emailHtml = renderEmail({
        tone: "warning", badge: "Renewal reminder", title: "⏰ Premium expires in 3 days",
        subtitle: `Hi ${esc(user.name || "Student")}, keep your preparation streak going.`,
        body: `${callout(`Your Premium ends on <b>${esc(formattedExpiry)}</b>`, "warning")}
          <p style="margin:0 0 4px;color:#f1f5f9;font-weight:700">After expiry you'll lose</p>
          ${list(["Unlimited test attempts", "Full TNC Nursing test series", "Detailed analytics", "Ad-free, verification-free practice"], "✕", "#f87171")}
          ${button(`${SITE}/pricing`, "Renew Premium")}`,
      });

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Test Sagar <team@tncnursing.site>',
            to: [user.email],
            subject: '⏰ Your TestSagar Premium expires in 3 days — Renew Now!',
            html: emailHtml,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Failed to send expiry email for user ${user.user_id}:`, data);
          failedCount++;
        } else {
          console.log(`Expiry email sent for user ${user.user_id}`);
          sentCount++;
        }
      } catch (emailError: any) {
        console.error(`Error sending expiry email for user ${user.user_id}:`, emailError);
        failedCount++;
      }
    }


    // Also trigger SMS notifications for expiring users
    let smsResult = null;
    try {
      const smsResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            mode: 'expiry',
            message: 'Your TestSagar premium subscription expires in 3 days! Renew now at testsagar.com/pricing to keep your access.',
          }),
        }
      );
      smsResult = await smsResponse.json();
      console.log('SMS notification result:', smsResult);
    } catch (smsError: any) {
      console.error('SMS notification failed:', smsError);
      smsResult = { success: false, error: smsError.message };
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: expiringUsers?.length || 0,
        sent: sentCount,
        failed: failedCount,
        smsSuccess: !!smsResult?.success,

        message: `Processed ${expiringUsers?.length || 0} premium users expiring in 3 days`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in premium expiry notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
