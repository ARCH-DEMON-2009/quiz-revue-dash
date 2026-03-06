import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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

export const blockDevice = async (): Promise<{ until: Date; smsStatus: string }> => {
  const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
  localStorage.setItem(BYPASS_BLOCK_KEY, until.toISOString());
  
  let smsStatus = 'no_number';
  
  // Send warning SMS to the user
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { mode: 'bypass_warning', user_id: user.id }
      });
      if (error) {
        smsStatus = 'failed';
      } else if (data?.sent > 0) {
        smsStatus = 'sent';
      } else {
        smsStatus = data?.message?.includes('No phone') ? 'no_number' : 'failed';
      }
    }
  } catch (err) {
    console.error('Failed to send bypass warning SMS:', err);
    smsStatus = 'failed';
  }
  
  return { until, smsStatus };
};

export const BypassBlockGuard = () => {
  const location = useLocation();
  const initialDeviceBlock = useMemo(() => isDeviceBlocked(), []);

  const [blocked, setBlocked] = useState(initialDeviceBlock.blocked);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(initialDeviceBlock.until);
  const [remaining, setRemaining] = useState("");
  const [checking, setChecking] = useState(true);

  const updateRemaining = (until: Date) => {
    const diff = until.getTime() - Date.now();
    if (diff <= 0) {
      setBlocked(false);
      setBlockedUntil(null);
      setRemaining("");
      localStorage.removeItem(BYPASS_BLOCK_KEY);
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  const checkBlock = async () => {
    try {
      // Local device-level block check first (instant hard lock)
      const deviceBlock = isDeviceBlocked();
      if (deviceBlock.blocked && deviceBlock.until) {
        setBlocked(true);
        setBlockedUntil(deviceBlock.until);
        updateRemaining(deviceBlock.until);
        return;
      }

      // Check logged-in user DB block
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBlocked(false);
        setBlockedUntil(null);
        setRemaining("");
        return;
      }

      // Admin bypass
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (isAdmin) {
        setBlocked(false);
        setBlockedUntil(null);
        setRemaining("");
        localStorage.removeItem(BYPASS_BLOCK_KEY);
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

      if (block?.blocked_until) {
        const until = new Date(block.blocked_until);
        setBlocked(true);
        setBlockedUntil(until);
        updateRemaining(until);
        localStorage.setItem(BYPASS_BLOCK_KEY, until.toISOString());
      } else {
        setBlocked(false);
        setBlockedUntil(null);
        setRemaining("");
      }
    } catch (err) {
      console.error("Bypass block check failed:", err);
      // Keep current blocked state if check fails to avoid accidental unlock
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBlock();
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (blockedUntil) updateRemaining(blockedUntil);
    }, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  if (!blocked && !checking) return null;

  if (checking && !blocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

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
            Your access is suspended during the block period.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">Time remaining until unblock</p>
            <p className="text-3xl font-bold font-mono text-destructive">{remaining}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            If this was a mistake, contact support: {" "}
            <a 
              href="https://t.me/TestSagarHelpRobot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              @TestSagarHelpRobot
            </a>
            {" "}or WhatsApp: {" "}
            <a 
              href="https://wa.me/84522122461" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              +84 522122461
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
