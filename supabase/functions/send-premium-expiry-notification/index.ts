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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const user of expiringUsers || []) {
      const expiryDate = new Date(user.expiry_date);
      const formattedExpiry = expiryDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Premium Expiring Soon!</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Hi ${user.name}, your subscription expires in 3 days.</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin-top: 0;">Don't lose your premium access!</h2>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">
                  ⚠️ Your premium subscription expires on <strong>${formattedExpiry}</strong>
                </p>
              </div>

              <p style="color: #4b5563; line-height: 1.8;">
                After expiry, you will lose access to:
              </p>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>❌ Unlimited test attempts</li>
                <li>❌ Detailed performance analytics</li>
                <li>❌ Subject-wise analysis</li>
                <li>❌ Ad-free experience</li>
                <li>❌ Access to all tests</li>
              </ul>

              <p style="color: #4b5563; line-height: 1.8;">
                Renew now to continue your preparation without interruption!
              </p>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://testsagar.com/pricing" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Renew Premium Now</a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #9ca3af; font-size: 14px;">Need help? Contact us on <a href="https://t.me/TestSagarHelpRobot" style="color: #6366f1;">Telegram</a></p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} TestSagar. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'TestSagar <noreply@testsagar.com>',
            to: [user.email],
            subject: '⏰ Your TestSagar Premium expires in 3 days — Renew Now!',
            html: emailHtml,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Failed to send email to ${user.email}:`, data);
          results.push({ email: user.email, success: false, error: JSON.stringify(data) });
        } else {
          console.log(`Email sent successfully to ${user.email}`);
          results.push({ email: user.email, success: true });
        }
      } catch (emailError: any) {
        console.error(`Error sending email to ${user.email}:`, emailError);
        results.push({ email: user.email, success: false, error: emailError.message });
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
        results,
        smsResult,
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
