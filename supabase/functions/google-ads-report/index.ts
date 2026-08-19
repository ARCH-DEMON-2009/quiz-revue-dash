import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_ads";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // --- Admin-only: ad spend data must never be readable by regular users ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
    if (adminErr || !isAdmin) return json({ error: "Forbidden" }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_ADS_API_KEY = Deno.env.get("GOOGLE_ADS_API_KEY");
    const CUSTOMER_ID = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");
    if (!LOVABLE_API_KEY || !GOOGLE_ADS_API_KEY || !CUSTOMER_ID) {
      return json({ error: "Google Ads is not fully set up for this project yet." }, 400);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const allowed = new Set([
      "TODAY",
      "YESTERDAY",
      "LAST_7_DAYS",
      "LAST_14_DAYS",
      "LAST_30_DAYS",
      "THIS_MONTH",
      "LAST_MONTH",
    ]);
    const range = allowed.has(String(body.range)) ? String(body.range) : "LAST_30_DAYS";

    const query = `
      SELECT campaign.id, campaign.name, campaign.status,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value, metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING ${range}
      ORDER BY metrics.impressions DESC`;

    const res = await fetch(`${GATEWAY_URL}/v24/customers/${CUSTOMER_ID}/googleAds:search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_ADS_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Google Ads request failed [${res.status}]: ${errorBody}`);
      return json({ error: "Google Ads request failed", status: res.status, details: errorBody }, res.status);
    }

    const data = await res.json();
    const rows = (data?.results ?? []).map((r: any) => ({
      campaignId: r.campaign?.id ?? "",
      name: r.campaign?.name ?? "",
      status: r.campaign?.status ?? "",
      impressions: Number(r.metrics?.impressions ?? 0),
      clicks: Number(r.metrics?.clicks ?? 0),
      cost: Number(r.metrics?.costMicros ?? 0) / 1_000_000,
      conversions: Number(r.metrics?.conversions ?? 0),
      conversionsValue: Number(r.metrics?.conversionsValue ?? 0),
      ctr: Number(r.metrics?.ctr ?? 0),
      averageCpc: Number(r.metrics?.averageCpc ?? 0) / 1_000_000,
    }));

    const totals = rows.reduce(
      (acc: any, r: any) => ({
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        cost: acc.cost + r.cost,
        conversions: acc.conversions + r.conversions,
      }),
      { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
    );

    return json({ range, rows, totals });
  } catch (e) {
    console.error("google-ads-report error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
