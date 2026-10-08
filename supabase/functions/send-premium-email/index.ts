import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  is_admin_activation?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // LOG ALL REQUESTS FOR DEBUGGING
  console.log(`Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: any = await req.json();
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isService = token === serviceKey;
    let callerEmail = "";
    let callerId = "";
    let callerIsAdmin = false;
    if (!isService) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      callerEmail = (u.user.email ?? "").toLowerCase();
      callerId = u.user.id;
      const { data: adm } = await userClient.rpc("is_admin");
      callerIsAdmin = !!adm;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Email service not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const logDb = createClient(supabaseUrl, serviceKey);
    const sendMail = async (to: string, subject: string, html: string, emailType: string, existingLogId?: string) => {
      let logId = existingLogId;
      if (!logId) {
        const { data: row } = await logDb.from("email_logs")
          .insert({ recipient: to, subject, email_type: emailType, payload: { html }, status: "queued" })
          .select("id").single();
        logId = row?.id;
      }
      const { data: prev } = logId
        ? await logDb.from("email_logs").select("attempts").eq("id", logId).maybeSingle()
        : { data: null };
      const attempts = (prev?.attempts ?? 0) + 1;
      const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({ from: "Test Sagar <team@tncnursing.site>", to: [to], subject, html }),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error(`Resend failed [${response.status}]: ${text}`);
        let msg = text;
        try { msg = JSON.parse(text)?.message ?? text; } catch { /* keep raw */ }
        if (logId) await logDb.from("email_logs").update({
          status: "failed", error: String(msg).slice(0, 1000), attempts, last_attempt_at: new Date().toISOString(),
        }).eq("id", logId);
        return new Response(JSON.stringify({ success: false, status: response.status, error: msg, log_id: logId }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let resendId: string | null = null;
      try { resendId = JSON.parse(text)?.id ?? null; } catch { /* ignore */ }
      if (logId) await logDb.from("email_logs").update({
        status: "sent", resend_id: resendId, error: null, attempts, last_attempt_at: new Date().toISOString(),
      }).eq("id", logId);
      return new Response(JSON.stringify({ success: true, log_id: logId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    // ---- Admin retry of a logged email.
    if (requestData?.type === "retry") {
      if (!callerIsAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      const logId = String(requestData.log_id ?? "");
      const { data: row } = await logDb.from("email_logs").select("*").eq("id", logId).maybeSingle();
      if (!row) return new Response(JSON.stringify({ error: "Email not found" }), { status: 404, headers: corsHeaders });
      if (!row.payload?.html) return new Response(JSON.stringify({ error: "Email content missing" }), { status: 400, headers: corsHeaders });
      return await sendMail(row.recipient, row.subject, row.payload.html, row.email_type, row.id);
    }

    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    // ---- Bypass warning: always sent to the signed-in caller only.
    if (requestData?.type === "bypass_warning") {
      if (isService || !callerEmail) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: prof } = await admin.from("user_profiles").select("name").eq("user_id", callerId).maybeSingle();
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
      const html = `<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f4f5;margin:0;padding:20px">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">
          <div style="background:#dc2626;padding:30px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">⚠️ Verification bypass detected</h1></div>
          <div style="padding:30px;color:#374151;line-height:1.7">
            <p>Hi ${esc(prof?.name || "Student")},</p>
            <p>We noticed an attempt to skip the access verification step on Test Sagar from your account. As a result, free access is paused for <b>24 hours</b> (until about <b>${esc(until)} IST</b>).</p>
            <p>To keep practising without interruptions, you can complete verification normally once the block ends, or upgrade to Premium for uninterrupted access.</p>
            <div style="text-align:center;margin:28px 0"><a href="https://test.tncnursing.site/pricing" style="background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">View Premium plans</a></div>
            <p style="font-size:14px;color:#6b7280">If you think this was a mistake, reply on WhatsApp support: +84 522122461.</p>
          </div>
        </div></body></html>`;
      return await sendMail(callerEmail, "⚠️ Test Sagar: verification bypass detected", html, "bypass_warning");
    }

    const { email, name, plan_name, plan_days, amount, payment_id, expiry_date, is_admin_activation } = requestData as PremiumEmailRequest;
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: corsHeaders });
    }
    // Only the server, an admin, or the recipient themself may send a premium email.
    if (!isService && !callerIsAdmin && email.toLowerCase() !== callerEmail) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
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
            <h1 style="color: white; margin: 0; font-size: 28px;">${is_admin_activation ? '🎊 Premium Activated!' : '🎉 Welcome to Premium!'}</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">${is_admin_activation ? 'An administrator has granted you premium access.' : 'Thank you for upgrading!'} Enjoy your stay, ${esc(name)}!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Your Premium Details</h2>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b;">Plan:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-weight: 600; text-align: right;">${esc(plan_name)}</td>
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
                  <td style="padding: 10px 0; color: #1f2937; font-size: 12px; text-align: right;">${esc(payment_id)}</td>
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
              <a href="https://test.tncnursing.site" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Practicing Now</a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px;">Need help? Contact us at <a href="mailto:support@shashanksv.com" style="color: #6366f1;">support@shashanksv.com</a></p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} Test Sagar (TRMS). All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendMail(
      email,
      is_admin_activation ? "🎊 Premium Activated!" : "🎉 Welcome to Test Sagar Premium!",
      emailHtml,
      is_admin_activation ? "admin_grant" : "premium_purchase",
    );
  } catch (error: any) {
    console.error("Error sending premium email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
