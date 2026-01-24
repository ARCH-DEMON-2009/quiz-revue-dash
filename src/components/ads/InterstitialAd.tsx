import { useState, useEffect } from "react";
import { useAccessStatus } from "@/components/AccessGuard";
import { X, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InterstitialAdProps {
  open: boolean;
  onClose: () => void;
  adSlot?: string;
  countdownSeconds?: number;
}

export const InterstitialAd = ({ 
  open,
  onClose,
  adSlot = "YOUR_AD_SLOT_ID",
  countdownSeconds = 5
}: InterstitialAdProps) => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [canClose, setCanClose] = useState(false);
  const { accessStatus, loading } = useAccessStatus();
  
  const isPremium = accessStatus?.type === 'premium';

  useEffect(() => {
    if (!open || isPremium) return;
    
    setCountdown(countdownSeconds);
    setCanClose(false);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdownSeconds, isPremium]);

  // Auto-close for premium users
  useEffect(() => {
    if (open && isPremium) {
      onClose();
    }
  }, [open, isPremium, onClose]);

  if (loading || isPremium) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && canClose && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-xl" onPointerDownOutside={(e) => !canClose && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Advertisement</span>
            {!canClose && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground font-normal">
                <Clock className="h-4 w-4" />
                Skip in {countdown}s
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* Ad content placeholder */}
          <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{ display: "block", minHeight: "250px" }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot={adSlot}
              data-ad-format="rectangle"
            />
            <p className="text-muted-foreground mb-4">📺 Video/Display Ad</p>
            <p className="text-sm text-muted-foreground/70 mb-6">This ad helps keep TestSagar free for everyone</p>
            
            <Link to="/pricing">
              <Button variant="outline" className="gap-2">
                <Crown className="h-4 w-4" />
                Remove Ads with Premium
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-end">
          {canClose ? (
            <Button onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Continue
            </Button>
          ) : (
            <Button disabled variant="secondary">
              Please wait {countdown}s...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InterstitialAd;
