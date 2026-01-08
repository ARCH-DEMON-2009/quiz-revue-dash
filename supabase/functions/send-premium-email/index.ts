import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PremiumEmailRequest {
  email: string;
  name: string;
  plan_name: string;
  plan_days: number;
  amount: number;
  payment_id: string;
  expiry_date: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, plan_name, plan_days, amount, payment_id, expiry_date }: PremiumEmailRequest = await req.json();

    console.log("Sending premium confirmation email to:", email);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedExpiry = new Date(expiry_date).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
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
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Premium!</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Thank you for upgrading, ${name}!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Your Premium Details</h2>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b;">Plan:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-weight: 600; text-align: right;">${plan_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b;">Duration:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-weight: 600; text-align: right;">${plan_days} days</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b;">Amount Paid:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-weight: 600; text-align: right;">₹${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b;">Valid Until:</td>
                  <td style="padding: 10px 0; color: #22c55e; font-weight: 600; text-align: right;">${formattedExpiry}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b;">Payment ID:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-size: 12px; text-align: right;">${payment_id}</td>
                </tr>
              </table>
            </div>

            <h3 style="color: #1f2937;">What's Included:</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>✅ Unlimited test attempts</li>
              <li>✅ Detailed performance analytics</li>
              <li>✅ Subject-wise analysis</li>
              <li>✅ Priority support</li>
              <li>✅ Ad-free experience</li>
              <li>✅ Access to all tests</li>
            </ul>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://testsagar.com" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Practicing Now</a>
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

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TestSagar <noreply@testsagar.com>",
        to: [email],
        subject: "🎉 Welcome to TestSagar Premium!",
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending premium email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
