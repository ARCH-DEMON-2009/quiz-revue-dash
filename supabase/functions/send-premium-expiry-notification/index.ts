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


    // Active premium users whose plan ends within the next 3 days.
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CONNECTOR_KEY = Deno.env.get('RESEND_API_KEY');

    const { data: expiringUsers, error } = await supabase
      .from('premium_users')
      .select('user_id, email, name, expiry_date, plan_months')
      .eq('status', 'active')
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', windowEnd.toISOString());

    if (error) throw error;

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const user of expiringUsers || []) {
      if (!user.email) continue;
      // One reminder per user per plan period: skip if reminded in the last 4 days.
      const since = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
      const { data: prior } = await supabase.from('email_logs').select('id')
        .eq('recipient', user.email).eq('email_type', 'expiry_reminder')
        .in('status', ['sent', 'delivered', 'queued', 'delayed']).gte('created_at', since).limit(1);
      if (prior && prior.length) { skippedCount++; continue; }

      const expiryDate = new Date(user.expiry_date);
      const formattedExpiry = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
      const daysLeft = Math.max(1, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000));
      const subject = `Your Test Sagar Premium ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;

      const emailHtml = renderEmail({
        tone: "warning", badge: "Renewal reminder",
        title: `Your Premium ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
        preheader: `Your Premium plan ends on ${formattedExpiry}. Renew to keep your access.`,
        subtitle: `Hi ${esc(user.name || "Student")}, a quick note so your practice isn't interrupted.`,
        body: `${callout(`Your Premium plan ends on <b>${esc(formattedExpiry)}</b>.`, "warning", "Plan expiring soon")}
          <p style="margin:0 0 4px;color:#332f28;font-family:Georgia,serif;font-size:17px">Renew to keep</p>
          ${list(["Unlimited test attempts", "The full TNC Nursing test series", "Detailed analytics and subject-wise reports", "Practice without ads or verification"])}
          ${button(`${SITE}/pricing`, "Renew Premium")}`,
      });

      const { data: logRow } = await supabase.from('email_logs')
        .insert({ recipient: user.email, subject, email_type: 'expiry_reminder', payload: { html: emailHtml }, status: 'queued' })
        .select('id').single();

      try {
        const response = LOVABLE_API_KEY && CONNECTOR_KEY
          ? await fetch('https://connector-gateway.lovable.dev/resend/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': CONNECTOR_KEY },
              body: JSON.stringify({ from: 'Test Sagar <team@tncnursing.site>', to: [user.email], subject, html: emailHtml }),
            })
          : await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({ from: 'Test Sagar <team@tncnursing.site>', to: [user.email], subject, html: emailHtml }),
            });
        const text = await response.text();
        let resendId: string | null = null;
        try { resendId = JSON.parse(text)?.id ?? null; } catch { /* ignore */ }
        if (logRow?.id) await supabase.from('email_logs').update({
          status: response.ok ? 'sent' : 'failed', resend_id: resendId, error: response.ok ? null : text.slice(0, 1000),
          attempts: 1, last_attempt_at: new Date().toISOString(),
        }).eq('id', logRow.id);
        if (response.ok) sentCount++; else failedCount++;
      } catch (emailError: any) {
        if (logRow?.id) await supabase.from('email_logs').update({ status: 'failed', error: String(emailError?.message ?? emailError), attempts: 1 }).eq('id', logRow.id);
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
