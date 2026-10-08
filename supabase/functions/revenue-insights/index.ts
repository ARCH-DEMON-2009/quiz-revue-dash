import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const summary = body?.summary;
    if (!summary || typeof summary !== "object") return json({ error: "Missing summary" }, 400);
    const text = JSON.stringify(summary);
    if (text.length > 40000) return json({ error: "Summary too large" }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are a revenue analyst for an Indian exam-prep website. Amounts are INR. Given aggregated payment data for a period (with the previous equal period for comparison), write a short report in plain English for a non-technical owner. Sections: 'Summary' (2-3 sentences), 'Trends' (3-5 bullets), 'Unusual changes' (bullets flagging spikes, drops, refund surges, promo-heavy days, plan mix shifts; say 'None found' if none). Keep it under 250 words. Use markdown bullets, no tables.",
        input: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok || !res.body) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      const msg = res.status === 429 ? "Too many requests, try again shortly."
        : res.status === 402 ? "AI credits are used up. Add credits in workspace settings."
        : "AI analysis failed.";
      return json({ error: msg }, res.status);
    }

    // Consume SSE stream, collecting output text.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") {
            return json({ error: ev.response?.error?.message ?? ev.message ?? "AI analysis failed." }, 502);
          }
        } catch { /* ignore */ }
      }
    }
    if (!out.trim()) return json({ error: "The AI returned no analysis." }, 502);
    return json({ analysis: out.trim() });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
