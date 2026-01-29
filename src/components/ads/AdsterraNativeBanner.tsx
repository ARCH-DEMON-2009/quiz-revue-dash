import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

interface AdsterraNativeBannerProps {
  className?: string;
}

export const AdsterraNativeBanner = ({ className = "" }: AdsterraNativeBannerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { accessStatus, loading } = useAccessStatus();
  const isPremium = accessStatus?.type === 'premium';
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (loading || isPremium || scriptLoadedRef.current) return;

    const containerId = `container-f289af19e1608db5e6e03c9a1c25d297-${Math.random().toString(36).substr(2, 9)}`;
    
    if (containerRef.current) {
      containerRef.current.id = containerId;
      
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = "https://performhouseholduneasy.com/f289af19e1608db5e6e03c9a1c25d297/invoke.js";
      containerRef.current.appendChild(script);
      scriptLoadedRef.current = true;
    }
  }, [isPremium, loading]);

  if (loading || isPremium) {
    return null;
  }

  return (
    <div className={`adsterra-native-banner my-4 ${className}`}>
      <div className="text-center text-xs text-muted-foreground mb-1">Sponsored</div>
      <div ref={containerRef} id="container-f289af19e1608db5e6e03c9a1c25d297"></div>
    </div>
  );
};

export default AdsterraNativeBanner;
