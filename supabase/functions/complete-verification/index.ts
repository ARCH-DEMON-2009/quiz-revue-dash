import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Minimum seconds a user must spend on the ad/link-shortener flow. */
const MIN_ELAPSED_SECONDS = 60;
/** Access granted per successful verification. */
const ACCESS_HOURS = 12;
/** Device block duration when a bypass is detected. */
const BLOCK_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller from their JWT (never trust a body-supplied user id).
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Look up the most recent pending verification created in the last 10 min.
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: pending, error: fetchError } = await admin
      .from("access_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("initiated_at", tenMinAgo)
      .order("initiated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!pending) {
      return json({ status: "no_pending", error: "No pending verification found." }, 404);
    }

    // Server-side timing check using the DB-stored initiated_at (tamper-proof).
    const elapsed = (Date.now() - new Date(pending.initiated_at).getTime()) / 1000;

    if (elapsed < MIN_ELAPSED_SECONDS) {
      const blockedUntil = new Date(Date.now() + BLOCK_HOURS * 60 * 60 * 1000);
      await admin.from("bypass_blocks").insert({
        user_id: user.id,
        blocked_until: blockedUntil.toISOString(),
        reason: `Bypass attempt: completed in ${Math.round(elapsed)}s (min ${MIN_ELAPSED_SECONDS}s required)`,
        sms_status: "not_sent",
      });
      // Best-effort SMS warning (never block the response on it).
      try {
        await admin.functions.invoke("send-sms", {
          body: { mode: "bypass_warning", user_id: user.id },
        });
      } catch (_) { /* ignore */ }

      return json({
        status: "blocked",
        blockedUntil: blockedUntil.toISOString(),
        error: "Bypass detected. You have been blocked for 24 hours.",
      });
    }

    const expiresAt = new Date(Date.now() + ACCESS_HOURS * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await admin
      .from("access_verifications")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq("id", pending.id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    return json({ status: "verified", expiresAt });
  } catch (error) {
    console.error("complete-verification error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
