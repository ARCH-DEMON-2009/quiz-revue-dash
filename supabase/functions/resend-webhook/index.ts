import { createClient } from "npm:@supabase/supabase-js@2";

// Receives Resend delivery events (Svix-signed) and updates public.email_logs.
const STATUS_MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};
const RANK: Record<string, number> = { queued: 0, sent: 1, delayed: 2, delivered: 3, failed: 4, bounced: 4, complained: 5 };

async function verify(secret: string, id: string, ts: string, body: string, sigHeader: string) {
  const key = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return sigHeader.split(" ").some((part) => part.split(",")[1] === expected);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const body = await req.text();
  const id = req.headers.get("svix-id") ?? "";
  const ts = req.headers.get("svix-timestamp") ?? "";
  const sig = req.headers.get("svix-signature") ?? "";
  if (!id || !ts || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
    return new Response("Invalid signature", { status: 401 });
  }
  if (!(await verify(secret, id, ts, body, sig))) return new Response("Invalid signature", { status: 401 });

  let event: any;
  try { event = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }
  const status = STATUS_MAP[event?.type];
  const emailId = event?.data?.email_id;
  if (!status || !emailId) return new Response("ignored", { status: 200 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await db.from("email_logs").select("id,status").eq("resend_id", emailId).maybeSingle();
  if (!row) return new Response("unknown email", { status: 200 });
  if ((RANK[status] ?? 0) < (RANK[row.status] ?? 0)) return new Response("stale", { status: 200 });

  const error = status === "bounced" ? (event.data?.bounce?.message ?? "Bounced")
    : status === "failed" ? (event.data?.failed?.reason ?? "Failed") : null;
  await db.from("email_logs").update({ status, ...(error ? { error: String(error).slice(0, 1000) } : {}) }).eq("id", row.id);
  return new Response("ok", { status: 200 });
});
