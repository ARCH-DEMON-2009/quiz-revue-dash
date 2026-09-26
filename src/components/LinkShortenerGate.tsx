import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ExternalLink, Shield, Clock, CheckCircle2, LogOut, User } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { toast } from "sonner";

interface LinkShortenerGateProps {
  children: React.ReactNode;
  /**
   * Path to return to after verification completes on /verify.
   * Persisted so the shortener round-trip can resume the exact test.
   */
  returnTo?: string;
}

/** Shared localStorage key so /verify knows where to send the user back. */
export const VERIFY_RETURN_KEY = "verify-return-to";

export const LinkShortenerGate = ({ children, returnTo }: LinkShortenerGateProps) => {
  const navigate = useNavigate();
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();

  // Remember where to resume once verification finishes on /verify.
  useEffect(() => {
    if (returnTo) {
      try {
        localStorage.setItem(VERIFY_RETURN_KEY, returnTo);
      } catch {
        /* ignore storage errors */
      }
    }
  }, [returnTo]);

  const [accessStatus, setAccessStatus] = useState<'loading' | 'verified' | 'free'>('loading');
  const [shortenerLink, setShortenerLink] = useState<string>('');
  const [initiating, setInitiating] = useState(false);
  const [initiated, setInitiated] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(600); // 10 min
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) {
        setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || null);
      }
    };

    void loadAvatar().catch((error) => console.error("Error loading account avatar:", error));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (premiumLoading) return;
    if (isPremium) {
      setAccessStatus('verified');
      return;
    }
    checkVerification();
  }, [isPremium, premiumLoading]);

  // Safety net: never leave the user stuck on "Checking access..." indefinitely.
  useEffect(() => {
    const t = setTimeout(() => {
      setAccessStatus((s) => (s === 'loading' ? 'free' : s));
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  // Countdown timer for pending verification
  useEffect(() => {
    if (!initiated || !initiatedAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - initiatedAt.getTime()) / 1000);
      const remaining = 600 - elapsed;
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        setInitiated(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [initiated, initiatedAt]);

  const checkVerification = async () => {
    try {
      // If admin has disabled verification globally, grant access immediately
      const { data: verifyConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "verification_enabled")
        .maybeSingle();

      if (verifyConfig && verifyConfig.config_value === "false") {
        setAccessStatus('verified');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessStatus('free');
        return;
      }

      const { data: verification } = await supabase
        .from("access_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "verified")
        .gt("expires_at", new Date().toISOString())
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verification) {
        setAccessStatus('verified');
        return;
      }

      const { data: config } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "shortener_link")
        .maybeSingle();

      if (config?.config_value) setShortenerLink(config.config_value);
      setAccessStatus('free');
    } catch (error) {
      console.error("Error checking access:", error);
      setAccessStatus('free');
    }
  };


  const handleStartVerification = async () => {
    setInitiating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-verification');
      if (error) throw error;
      if (data?.initiated_at) {
        setInitiatedAt(new Date(data.initiated_at));
        setInitiated(true);
        setCountdown(600);
      }
    } catch (error) {
      console.error("Error starting verification:", error);
    } finally {
      setInitiating(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Unable to log out. Please try again.");
      return;
    }
    navigate("/auth", { replace: true });
  };

  const accountActions = (
    <header className="container mx-auto flex w-full max-w-6xl justify-end gap-2 px-4 py-3">
      <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} aria-label="Open profile" className="gap-2">
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </span>
        <span>Profile</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </Button>
    </header>
  );

  if (isPremium || accessStatus === 'verified') {
    return <>{children}</>;
  }

  if (premiumLoading || accessStatus === 'loading') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {accountActions}
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Checking access...</p>
          </div>
        </main>
      </div>
    );
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {accountActions}
      <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify to Continue</CardTitle>
          <CardDescription>
            Complete a quick verification to access all features for 12 hours, or go premium for unlimited access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initiated ? (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleStartVerification}
              disabled={initiating}
            >
              {initiating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Start Verification (Free)
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-center p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  Expires in {formatCountdown(countdown)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the link below to complete verification
                </p>
              </div>
              <a
                href={shortenerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full gap-2" size="lg" variant="default">
                  <ExternalLink className="h-5 w-5" />
                  Complete Verification
                </Button>
              </a>
              <p className="text-xs text-center text-muted-foreground">
                After completing the verification, you'll be redirected back automatically.
              </p>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Link to="/pricing" className="block">
            <Button variant="outline" className="w-full gap-2" size="lg">
              <Crown className="h-5 w-5" />
              Buy Premium for Ad-Free Experience
            </Button>
          </Link>
        </CardContent>
      </Card>
      </main>
    </div>
  );
};

export default LinkShortenerGate;
