import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminBadgeConfig {
  frame_type: string;
  badge_icon: string;
  text_effect: string;
  glow_color: string;
  anti_extraction?: boolean;
}

const DEFAULT_CONFIG: AdminBadgeConfig = {
  frame_type: "rainbow",
  badge_icon: "b1",
  text_effect: "gradient_black",
  glow_color: "#9b87f5",
};

export const useAdminBadgeConfig = () => {
  const [config, setConfig] = useState<AdminBadgeConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("config_value")
          .eq("config_key", "admin_badge_config")
          .maybeSingle();

        if (!error && data?.config_value) {
          setConfig(JSON.parse(data.config_value));
        }
      } catch (e) {
        console.error("Error loading admin badge config:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const getAdminFrameStyles = (isAdmin: boolean) => {
    if (!isAdmin) return null;
    
    if (config.frame_type === 'rainbow') {
      return "absolute -inset-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-full animate-spin-slow blur-[1px]";
    } else if (config.frame_type === 'gold') {
      return `absolute -inset-1.5 rounded-full blur-[2px] animate-pulse`;
    }
    return null;
  };

  const getAdminAvatarBorder = (isAdmin: boolean) => {
    if (!isAdmin) return "";
    return config.frame_type === 'gold' ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'border-purple-500';
  };

  const getAdminBadgeIcon = (isAdmin: boolean) => {
    if (!isAdmin) return null;
    return config.badge_icon;
  };

  const getAdminNameColor = (isAdmin: boolean) => {
    if (!isAdmin) return "";
    if (config.text_effect === 'gradient_black') {
      return "text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 font-black drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]";
    } else if (config.text_effect === 'solid_red') {
      return "text-red-600 font-bold";
    } else if (config.text_effect === 'glow_purple') {
      return "text-purple-600 font-bold drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]";
    }
    return "";
  };

  return { 
    config, 
    loading, 
    getAdminFrameStyles, 
    getAdminAvatarBorder, 
    getAdminBadgeIcon, 
    getAdminNameColor 
  };
};
