import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string | undefined) ?? null;

    // Use service role to bypass any RLS gotchas — this is read-only verification.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();

    const orFilter = email
      ? `user_id.eq.${userId},email.eq.${email}`
      : `user_id.eq.${userId}`;

    const { data, error } = await admin
      .from("premium_users")
      .select("expiry_date, status, plan_duration_type, plan_duration_value")
      .or(orFilter)
      .eq("status", "active")
      .gt("expiry_date", nowIso)
      .order("expiry_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("check-premium query error", error);
      return json({ isPremium: false, expiresAt: null, plan: null, error: error.message }, 200);
    }

    if (!data) return json({ isPremium: false, expiresAt: null, plan: null }, 200);

    return json({
      isPremium: true,
      expiresAt: data.expiry_date,
      plan: data.plan_duration_type ?? null,
      planValue: data.plan_duration_value ?? null,
    }, 200);
  } catch (e) {
    console.error("check-premium fatal", e);
    return json({ error: (e as Error).message, isPremium: false }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
