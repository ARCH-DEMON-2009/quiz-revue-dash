import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

interface AdBannerProps {
  adSlot?: string;
  adFormat?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
  position?: "top" | "bottom" | "inline";
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdBanner = ({ 
  adSlot = "YOUR_AD_SLOT_ID", 
  adFormat = "auto",
  className = "",
  position = "inline"
}: AdBannerProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const { accessStatus, loading } = useAccessStatus();
  
  // Don't show ads to premium users
  const isPremium = accessStatus?.type === 'premium';
  
  useEffect(() => {
    if (isPremium || loading) return;
    
    // Load AdSense script if not already loaded
    const existingScript = document.querySelector('script[src*="adsbygoogle"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    // Initialize the ad
    try {
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [isPremium, loading]);

  // Don't render anything for premium users
  if (loading || isPremium) {
    return null;
  }

  const positionClasses = {
    top: "w-full border-b bg-muted/30",
    bottom: "w-full border-t bg-muted/30",
    inline: "my-4"
  };

  return (
    <div 
      ref={adRef}
      className={`ad-container overflow-hidden ${positionClasses[position]} ${className}`}
    >
      <div className="text-center text-xs text-muted-foreground mb-1">Advertisement</div>
      {/* AdSense Auto Ads - Replace with your actual ad code */}
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: position === "inline" ? "250px" : "90px" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
      {/* Fallback placeholder for development */}
      <div className="bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center text-muted-foreground text-sm p-4"
        style={{ minHeight: position === "inline" ? "250px" : "90px" }}
      >
        <div className="text-center">
          <p className="font-medium">📢 Ad Space</p>
          <p className="text-xs mt-1">Upgrade to Premium for ad-free experience</p>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
