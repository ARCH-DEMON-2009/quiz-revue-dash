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

    // Admin-only: list all trials with privacy-safe repeat indicators.
    if (body?.mode === "admin") {
      const { data: isAdmin } = await admin.rpc("is_admin");
      // is_admin() reads auth.uid() from the JWT, which is absent here; verify role directly.
      let adminOk = false;
      if (isAdmin === true) adminOk = true;
      else {
        const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        adminOk = !!roleRow;
      }
      if (!adminOk) return json({ error: "Forbidden" }, 403);

      const { data: trials, error: tErr } = await admin
        .from("tnc_trials").select("*").order("created_at", { ascending: false }).limit(500);
      if (tErr) throw tErr;
      const rows = trials ?? [];
      const ids = rows.map((r: any) => r.user_id);
      const { data: profiles } = ids.length
        ? await admin.from("user_profiles").select("user_id,name,email").in("user_id", ids)
        : { data: [] };
      const pmap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

      const deviceCount = new Map<string, number>();
      const netCount = new Map<string, number>();
      for (const r of rows) {
        if (r.device_id) deviceCount.set(r.device_id, (deviceCount.get(r.device_id) ?? 0) + 1);
        if (r.ip_hash && r.ua_hash) {
          const k = r.ip_hash + "|" + r.ua_hash;
          netCount.set(k, (netCount.get(k) ?? 0) + 1);
        }
      }
      const list = rows.map((r: any) => {
        const p = pmap.get(r.user_id) as any;
        const active = r.status === "active" && new Date(r.expires_at).getTime() > Date.now();
        return {
          userId: r.user_id,
          name: p?.name ?? "Unknown",
          email: p?.email ?? "",
          status: active ? "active" : r.status,
          startedAt: r.started_at,
          expiresAt: r.expires_at,
          reason: r.reason,
          // Privacy-safe: only counts and shortened hashes, never raw IP/device data.
          sharedDeviceCount: r.device_id ? deviceCount.get(r.device_id) ?? 0 : 0,
          sharedNetworkCount: r.ip_hash && r.ua_hash ? netCount.get(r.ip_hash + "|" + r.ua_hash) ?? 0 : 0,
          deviceTag: r.device_id ? String(r.device_id).slice(0, 8) : null,
          networkTag: r.ip_hash ? String(r.ip_hash).slice(0, 8) : null,
        };
      });
      return json({ trials: list });
    }

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
