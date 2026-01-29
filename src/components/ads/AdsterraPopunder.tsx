import { useEffect } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

export const AdsterraPopunder = () => {
  const { accessStatus, loading } = useAccessStatus();
  const isPremium = accessStatus?.type === 'premium';

  useEffect(() => {
    if (loading || isPremium) return;

    // Only load popunder for non-premium users
    const existingScript = document.querySelector('script[src*="cf8044281095b9254045cc819bf4bc82"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://performhouseholduneasy.com/cf/80/44/cf8044281095b9254045cc819bf4bc82.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isPremium, loading]);

  return null;
};

export default AdsterraPopunder;
