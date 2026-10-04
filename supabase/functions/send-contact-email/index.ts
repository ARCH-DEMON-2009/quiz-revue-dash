const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const submissionsByIp = new Map<string, number[]>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function isRateLimited(ip: string) {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  const recent = (submissionsByIp.get(ip) ?? []).filter((timestamp) => timestamp > cutoff);
  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    submissionsByIp.set(ip, recent);
    return true;
  }
  recent.push(Date.now());
  submissionsByIp.set(ip, recent);
  return false;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) return json({ error: "Too many messages. Please try again later." }, 429);

  try {
    const body = await request.json();
    if (typeof body.website === "string" && body.website.trim()) return json({ success: true });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (
      !name || name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !subject || subject.length > 120 ||
      message.length < 10 || message.length > 5_000
    ) {
      return json({ error: "Enter a valid name, email, subject, and message." }, 400);
    }

    const apiKey = Deno.env.get("resend_api_key") ?? Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "Email service is not configured." }, 503);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        from: "Test Sagar <team@tncnursing.site>",
        to: [Deno.env.get("RESEND_SUPPORT_EMAIL") ?? "support@shashanksv.com"],
        reply_to: email,
        subject: `Contact form: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        html: `<h2>Contact form message</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Subject:</strong> ${safeSubject}</p><p>${safeMessage.replace(/\n/g, "<br>")}</p>`,
      }),
    });

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      console.error("Resend contact email failed", response.status, details?.message ?? "");
      return json({ error: "Could not send your message. Please try again later." }, 502);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Contact email failed", error);
    return json({ error: "Could not send your message. Please try again later." }, 500);
  }
});