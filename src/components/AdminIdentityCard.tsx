import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import AdminNameBadge from "@/components/AdminNameBadge";
import { cn } from "@/lib/utils";

interface Config {
  frame_type: string;
  badge_icon: string;
  text_effect: string;
  glow_color: string;
  anti_extraction: boolean;
}
const DEFAULTS: Config = { frame_type: "f3", badge_icon: "b3", text_effect: "gradient_black", glow_color: "#9b87f5", anti_extraction: true };
const IMG_FRAMES = ["f1", "f2", "f3"];

const nameClass = (effect: string) =>
  effect === "gradient_black"
    ? "text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 font-black"
    : effect === "solid_red" ? "text-red-600 font-bold"
    : effect === "glow_purple" ? "text-purple-600 font-bold drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]"
    : "font-semibold";

export const AdminIdentityCard = () => {
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("Admin");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("system_config").select("config_value").eq("config_key", "admin_badge_config").maybeSingle();
      if (data?.config_value) {
        try { setConfig({ ...DEFAULTS, ...JSON.parse(data.config_value) }); } catch { /* keep defaults */ }
      }
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data: p } = await supabase.from("user_profiles").select("name,avatar_url").eq("user_id", u.user.id).maybeSingle();
        if (p?.name) setName(p.name);
        setAvatar(p?.avatar_url ?? (u.user.user_metadata?.avatar_url as string) ?? null);
      }
    })();
  }, []);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const value = JSON.stringify(config);
      const { data: existing } = await supabase.from("system_config").select("id").eq("config_key", "admin_badge_config").maybeSingle();
      const { error } = existing
        ? await supabase.from("system_config").update({ config_value: value }).eq("config_key", "admin_badge_config")
        : await supabase.from("system_config").insert({ config_key: "admin_badge_config", config_value: value, description: "JSON configuration for admin visual appearance" });
      if (error) throw error;
      toast.success("Admin identity saved. It now shows on leaderboards and profiles.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Admin Identity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Choose how you appear as an admin on leaderboards and profiles.</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="flex items-center gap-5 rounded-lg border bg-muted/30 p-4">
          <div className="relative h-20 w-20 shrink-0">
            {IMG_FRAMES.includes(config.frame_type) && (
              <img src={`/frames/${config.frame_type}.png`} alt="" className="absolute -inset-[15%] h-[130%] w-[130%] object-contain z-10 pointer-events-none" />
            )}
            {config.frame_type === "rainbow" && <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 animate-spin-slow blur-[1px]" />}
            {config.frame_type === "gold" && <div className="absolute -inset-1.5 rounded-full border border-amber-500 bg-amber-500/20 blur-[2px] animate-pulse" />}
            <div className={cn("relative h-20 w-20 overflow-hidden rounded-full border-4 bg-muted",
              config.frame_type === "gold" ? "border-amber-500" : config.frame_type === "none" ? "border-border" : "border-transparent")}>
              <img src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <p className={cn("truncate text-lg", nameClass(config.text_effect))}>{name}</p>
            <AdminNameBadge badgeIcon={config.badge_icon} size="md" />
            <p className="text-[11px] text-muted-foreground">Live preview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Avatar frame</label>
            <Select value={config.frame_type} onValueChange={(v) => set("frame_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="f3">Admin frame</SelectItem>
                <SelectItem value="f1">Frame 1</SelectItem>
                <SelectItem value="f2">Frame 2</SelectItem>
                <SelectItem value="rainbow">Rainbow spin</SelectItem>
                <SelectItem value="gold">Golden glow</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Badge icon</label>
            <Select value={config.badge_icon} onValueChange={(v) => set("badge_icon", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="b3">Admin badge</SelectItem>
                <SelectItem value="b1">Premium badge</SelectItem>
                <SelectItem value="b2">Pro badge</SelectItem>
                <SelectItem value="star">Sparkle</SelectItem>
                <SelectItem value="shield">Shield</SelectItem>
                <SelectItem value="crown">Crown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Name style</label>
            <Select value={config.text_effect} onValueChange={(v) => set("text_effect", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gradient_black">Rainbow gradient</SelectItem>
                <SelectItem value="solid_red">Bold red</SelectItem>
                <SelectItem value="glow_purple">Purple glow</SelectItem>
                <SelectItem value="none">Plain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div>
            <p className="text-xs font-medium">Anti-extraction protection</p>
            <p className="text-[11px] text-muted-foreground">Blocks right-click, selection and copy on quiz pages for everyone.</p>
          </div>
          <Switch checked={config.anti_extraction} onCheckedChange={(v) => set("anti_extraction", v)} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving ? "Saving…" : "Save identity"}</Button>
      </CardContent>
    </Card>
  );
};
