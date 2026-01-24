import { useState, useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";
import { X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface StickyAdProps {
  position: "top" | "bottom";
  adSlot?: string;
  className?: string;
}

export const StickyAd = ({ 
  position = "bottom",
  adSlot = "YOUR_AD_SLOT_ID",
  className = ""
}: StickyAdProps) => {
  const [dismissed, setDismissed] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);
  const { accessStatus, loading } = useAccessStatus();
  
  const isPremium = accessStatus?.type === 'premium';

  useEffect(() => {
    if (isPremium || loading || dismissed) return;
    
    try {
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [isPremium, loading, dismissed]);

  if (loading || isPremium || dismissed) {
    return null;
  }

  const positionClasses = position === "top" 
    ? "top-0 border-b" 
    : "bottom-0 border-t";

  return (
    <div 
      ref={adRef}
      className={`fixed left-0 right-0 ${positionClasses} bg-background/95 backdrop-blur-sm z-40 shadow-lg ${className}`}
    >
      <div className="container mx-auto px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <ins
              className="adsbygoogle"
              style={{ display: "block", height: "60px" }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot={adSlot}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
            {/* Fallback placeholder */}
            <div className="bg-muted/30 rounded flex items-center justify-between px-4 py-2 h-[60px]">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">📢 Advertisement</span>
                <span className="hidden sm:inline text-xs text-muted-foreground/70">Support us by viewing ads</span>
              </div>
              <Link to="/pricing">
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <Crown className="h-3 w-3" />
                  <span className="hidden sm:inline">Go Premium</span>
                  <span className="sm:hidden">Premium</span>
                </Button>
              </Link>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyAd;
