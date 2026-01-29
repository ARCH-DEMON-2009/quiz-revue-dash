import { useEffect } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

export const AdsterraSocialBar = () => {
  const { accessStatus, loading } = useAccessStatus();
  const isPremium = accessStatus?.type === 'premium';

  useEffect(() => {
    if (loading || isPremium) return;

    // Only load social bar for non-premium users
    const existingScript = document.querySelector('script[src*="440431777cf8706fc842fbc5c0fa6156"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://performhouseholduneasy.com/44/04/31/440431777cf8706fc842fbc5c0fa6156.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isPremium, loading]);

  return null;
};

export default AdsterraSocialBar;
