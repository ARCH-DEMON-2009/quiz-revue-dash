import { createClient } from "npm:@supabase/supabase-js@2";
import { renderEmail, esc, button, secondaryButton, list, para, SITE } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUBJECT = "Test Sagar is still here: TNC series, institution exams and more";

const buildHtml = (name: string) => renderEmail({
  badge: "News from Test Sagar",
  title: "Test Sagar is still alive",
  preheader: "Practise TNC Nursing test series, institution exams and more on Test Sagar.",
  subtitle: `Hi ${esc(name || "Student")}, we're still here and adding new tests every day.`,
  body: `${para("Pick up where you left off. Your account, results and rankings are waiting for you.")}
    <p style="margin:0 0 4px;color:#332f28;font-family:Georgia,serif;font-size:17px">What you can practise now</p>
    ${list([
      "<b>TNC Nursing Test Series</b> with daily dose, mains and mock tests",
      "<b>Institution exams</b> from coaching providers in one place",
      "JEE, NEET and class-wise practice tests",
      "Leaderboards, detailed reports and downloadable PDFs",
    ])}
    ${button(SITE, "Open Test Sagar")}
    <div style="margin:-6px 0 18px">${secondaryButton(`${SITE}/tnc-tests`, "TNC test series")}${secondaryButton(`${SITE}/institutions`, "Institution exams")}</div>`,
  footnote: `You are receiving this because you have a Test Sagar account. Visit <a href="${SITE}" style="color:#5c6447;text-decoration:underline">tncnursing.site</a>.`,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode ?? "count");
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (mode === "count") {
      const { count } = await db.from("user_profiles").select("id", { count: "exact", head: true }).not("email", "is", null);
      return json({ total: count ?? 0 });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: "Email service not configured" }, 500);

    const send = async (to: string, name: string, type: string) => {
      const html = buildHtml(name);
      const { data: row } = await db.from("email_logs")
        .insert({ recipient: to, subject: SUBJECT, email_type: type, payload: { html }, status: "queued" }).select("id").single();
      const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": RESEND_API_KEY },
        body: JSON.stringify({ from: "Test Sagar <team@tncnursing.site>", to: [to], subject: SUBJECT, html }),
      });
      const text = await r.text();
      let id: string | null = null;
      try { id = JSON.parse(text)?.id ?? null; } catch { /* ignore */ }
      if (row?.id) await db.from("email_logs").update({
        status: r.ok ? "sent" : "failed", resend_id: id, error: r.ok ? null : text.slice(0, 1000), attempts: 1, last_attempt_at: new Date().toISOString(),
      }).eq("id", row.id);
      return { ok: r.ok, error: r.ok ? null : text.slice(0, 300) };
    };

    if (mode === "test") {
      const r = await send(u.user.email!, "Admin", "broadcast_test");
      return r.ok ? json({ sent: 1 }) : json({ error: r.error }, 502);
    }

    if (mode === "send") {
      const offset = Math.max(0, Number(body.offset) || 0);
      const limit = 40;
      const { data: rows, error } = await db.from("user_profiles").select("email,name")
        .not("email", "is", null).order("created_at", { ascending: true }).range(offset, offset + limit - 1);
      if (error) throw error;
      let sent = 0, failed = 0;
      for (const p of rows ?? []) {
        const email = String(p.email ?? "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { failed++; continue; }
        const r = await send(email, p.name === "User" ? "Student" : p.name, "broadcast");
        r.ok ? sent++ : failed++;
        await new Promise((res) => setTimeout(res, 550)); // stay under Resend rate limit
      }
      const done = (rows?.length ?? 0) < limit;
      return json({ sent, failed, nextOffset: offset + (rows?.length ?? 0), done });
    }
    return json({ error: "Unknown mode" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
