import { renderEmail, esc, button, detailsTable, list, callout, SITE } from "../_shared/email-layout.ts";
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


    // ---- Bypass warning: always sent to the signed-in caller only.
    if (requestData?.type === "bypass_warning") {
      if (isService || !callerEmail) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: prof } = await admin.from("user_profiles").select("name").eq("user_id", callerId).maybeSingle();
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
      const html = renderEmail({
        tone: "danger", badge: "Account notice", title: "Verification bypass detected",
        subtitle: `Hi ${esc(prof?.name || "Student")}, free access is paused for 24 hours.`,
        body: `<p>We noticed an attempt to skip the access verification step from your account.</p>
          ${callout(`⏳ Free access resumes around <b>${esc(until)} IST</b>`, "danger")}
          <p>You can complete verification normally once the pause ends, or go Premium for uninterrupted practice.</p>
          ${button(`${SITE}/pricing`, "View Premium plans")}
          <p style="font-size:13px;color:#94a3b8;text-align:center">Think this is a mistake? Message us on WhatsApp: +84 522122461.</p>`,
      });
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

    const emailHtml = renderEmail({
      tone: "success",
      badge: is_admin_activation ? "Premium activated" : "Payment successful",
      title: is_admin_activation ? "🎊 Your Premium is now active" : "🎉 Welcome to Test Sagar Premium",
      subtitle: `${is_admin_activation ? "Our team has unlocked Premium on your account." : "Thank you for upgrading!"} Enjoy, ${esc(name || "Student")}.`,
      body: `${detailsTable([
          ["Plan", esc(plan_name)],
          ["Duration", `${esc(plan_days)} days`],
          ...(is_admin_activation && !Number(amount) ? [] : [["Amount paid", `₹${esc(amount)}`] as [string, string]]),
          ["Valid until", esc(formattedExpiry), "#34d399"],
          ...(payment_id ? [["Reference", `<span style="font-size:12px">${esc(payment_id)}</span>`] as [string, string]] : []),
        ])}
        <p style="margin:0 0 4px;color:#f1f5f9;font-weight:700">What's unlocked</p>
        ${list(["Unlimited test attempts", "Full TNC Nursing test series", "Detailed analytics &amp; subject-wise analysis", "Premium avatars &amp; ranking badges", "Ad-free, verification-free practice", "Priority WhatsApp support"])}
        ${button(SITE, "Start practising now")}`,
    });

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
