import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

const BYPASS_BLOCK_KEY = "bypass_block_until";

export const isDeviceBlocked = (): { blocked: boolean; until: Date | null } => {
  const stored = localStorage.getItem(BYPASS_BLOCK_KEY);
  if (!stored) return { blocked: false, until: null };
  
  const until = new Date(stored);
  if (until > new Date()) {
    return { blocked: true, until };
  }
  
  localStorage.removeItem(BYPASS_BLOCK_KEY);
  return { blocked: false, until: null };
};

export const blockDevice = () => {
  const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
  localStorage.setItem(BYPASS_BLOCK_KEY, until.toISOString());
  return until;
};

export const BypassBlockGuard = () => {
  const [blocked, setBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    checkBlock();
    const interval = setInterval(checkBlock, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkBlock = async () => {
    // Check localStorage first (device-level)
    const deviceBlock = isDeviceBlocked();
    if (deviceBlock.blocked && deviceBlock.until) {
      setBlocked(true);
      setBlockedUntil(deviceBlock.until);
      updateRemaining(deviceBlock.until);
      return;
    }

    // Check database (account-level)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBlocked(false);
        return;
      }

      const { data: block } = await supabase
        .from("bypass_blocks")
        .select("blocked_until")
        .eq("user_id", user.id)
        .gt("blocked_until", new Date().toISOString())
        .order("blocked_until", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (block) {
        const until = new Date(block.blocked_until);
        setBlocked(true);
        setBlockedUntil(until);
        updateRemaining(until);
        // Also set localStorage so they can't bypass by logging out
        localStorage.setItem(BYPASS_BLOCK_KEY, until.toISOString());
      } else {
        setBlocked(false);
        setBlockedUntil(null);
      }
    } catch {
      // Don't block on error
    }
  };

  const updateRemaining = (until: Date) => {
    const diff = until.getTime() - Date.now();
    if (diff <= 0) {
      setBlocked(false);
      setBlockedUntil(null);
      localStorage.removeItem(BYPASS_BLOCK_KEY);
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">
            Bypass Detected — Blocked for 24 Hours
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Our system detected an attempt to bypass the verification process. 
            Your access has been temporarily suspended for 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">Time remaining until unblock</p>
            <p className="text-3xl font-bold font-mono text-destructive">{remaining}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You cannot access the site or log out until the block expires.
            If you believe this is a mistake, contact admin:{" "}
            <a 
              href="https://t.me/TestSagarHelpRobot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              @TestSagarHelpRobot
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
