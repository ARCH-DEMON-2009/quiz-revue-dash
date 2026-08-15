import { supabase } from "@/integrations/supabase/client";

export interface PdfIdentity {
  name: string;
  avatarUrl: string | null;
  frameUrl: string | null;
  badgeUrl: string | null;
}

/**
 * Resolve the signed-in user's display identity for PDF reports:
 * real name (never the email), avatar, and the frame/badge that matches
 * their tier (admin > premium > free).
 */
export async function getPdfIdentity(): Promise<PdfIdentity> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { name: "Student", avatarUrl: null, frameUrl: null, badgeUrl: null };

  const [profileRes, adminRes, premiumRes, configRes] = await Promise.all([
    supabase.from("user_profiles").select("name, avatar_url").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("is_admin"),
    supabase
      .from("premium_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expiry_date", new Date().toISOString())
      .limit(1),
    supabase.from("system_config").select("config_value").eq("config_key", "admin_badge_config").maybeSingle(),
  ]);

  const profileName = profileRes.data?.name;
  const metaName = (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined;
  const raw = (profileName && profileName !== "User" ? profileName : metaName) ?? "";
  const name = toDisplayName(raw);

  const isAdmin = adminRes.data === true;
  const isPremium = (premiumRes.data?.length ?? 0) > 0;

  let frameUrl: string | null = null;
  let badgeUrl: string | null = null;
  if (isAdmin) {
    let frame = "f3";
    let badge = "b3";
    try {
      const cfg = configRes.data?.config_value ? JSON.parse(configRes.data.config_value) : null;
      if (cfg?.frame_type && ["f1", "f2", "f3"].includes(cfg.frame_type)) frame = cfg.frame_type;
      if (cfg?.badge_icon && ["b1", "b2", "b3"].includes(cfg.badge_icon)) badge = cfg.badge_icon;
    } catch {
      /* keep defaults */
    }
    frameUrl = `/frames/${frame}.png`;
    badgeUrl = `/badges/${badge}.png`;
  } else if (isPremium) {
    frameUrl = "/frames/f3.png";
    badgeUrl = "/badges/b1.png";
  }

  // Only raster avatars can be embedded in the PDF (jsPDF can't rasterize SVG).
  const avatar = profileRes.data?.avatar_url ?? null;
  const avatarUrl = avatar && !avatar.endsWith(".svg") && !avatar.includes("dicebear") ? avatar : null;

  return { name, avatarUrl, frameUrl, badgeUrl };
}
