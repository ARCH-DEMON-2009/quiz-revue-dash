import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v + "|" + (Deno.env.get("SUPABASE_URL") ?? "")));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u, error } = await admin.auth.getUser(auth.slice(7));
    if (error || !u?.user) return json({ error: "Unauthorized" }, 401);
    const user = u.user;

    const body = await req.json().catch(() => ({}));
    const rawDevice = typeof body?.deviceId === "string" ? body.deviceId.slice(0, 128) : "";
    const fp = typeof body?.fingerprint === "string" ? body.fingerprint.slice(0, 256) : "";

    const status = (row: any) => {
      const active = row.status === "active" && new Date(row.expires_at).getTime() > Date.now();
      return json({ active, status: active ? "active" : row.status === "denied" ? "denied" : "expired", expiresAt: row.expires_at, reason: row.reason });
    };

    const { data: existing } = await admin.from("tnc_trials").select("*").eq("user_id", user.id).maybeSingle();
    if (existing) return status(existing);

    const createdAt = new Date(user.created_at).getTime();
    const expiresAt = new Date(createdAt + TRIAL_MS).toISOString();
    // Only brand-new accounts get a trial.
    if (Date.now() - createdAt > TRIAL_MS) return json({ active: false, status: "not_eligible" });

    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "").split(",")[0].trim();
    const ua = req.headers.get("user-agent") ?? "";
    const deviceId = rawDevice ? await sha("d:" + rawDevice) : null;
    const ipHash = ip ? await sha("ip:" + ip) : null;
    const uaHash = await sha("ua:" + ua + "|" + fp);

    // Same device, or same network + same browser fingerprint, already had a trial.
    let reason: string | null = null;
    if (deviceId) {
      const { count } = await admin.from("tnc_trials").select("id", { count: "exact", head: true }).eq("device_id", deviceId);
      if (count) reason = "device_already_used";
    }
    if (!reason && ipHash) {
      const { count } = await admin.from("tnc_trials").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("ua_hash", uaHash);
      if (count) reason = "network_already_used";
    }

    const row = {
      user_id: user.id, started_at: new Date().toISOString(),
      expires_at: reason ? new Date().toISOString() : expiresAt,
      status: reason ? "denied" : "active", device_id: deviceId, ip_hash: ipHash, ua_hash: uaHash, reason,
    };
    const { data: inserted, error: insErr } = await admin.from("tnc_trials").insert(row).select("*").single();
    if (insErr) {
      const { data: again } = await admin.from("tnc_trials").select("*").eq("user_id", user.id).maybeSingle();
      if (again) return status(again);
      throw insErr;
    }
    return status(inserted);
  } catch (e) {
    console.error("tnc-trial error", e);
    return json({ active: false, status: "error", error: (e as Error).message }, 500);
  }
});
