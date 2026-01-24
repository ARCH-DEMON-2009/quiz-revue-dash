import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

interface InlineAdProps {
  adSlot?: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const InlineAd = ({ 
  adSlot = "YOUR_AD_SLOT_ID",
  className = ""
}: InlineAdProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const { accessStatus, loading } = useAccessStatus();
  
  const isPremium = accessStatus?.type === 'premium';
  
  useEffect(() => {
    if (isPremium || loading) return;
    
    try {
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [isPremium, loading]);

  if (loading || isPremium) {
    return null;
  }

  return (
    <div 
      ref={adRef}
      className={`inline-ad-container my-4 ${className}`}
    >
      <div className="text-center text-xs text-muted-foreground mb-1">Sponsored</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={adSlot}
      />
      {/* Fallback placeholder */}
      <div className="bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 border border-muted-foreground/10 rounded-lg p-6 text-center">
        <p className="text-muted-foreground text-sm">📱 Sponsored Content</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Go Premium to remove ads</p>
      </div>
    </div>
  );
};

export default InlineAd;
