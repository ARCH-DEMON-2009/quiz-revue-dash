import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ExternalLink, Shield, Clock, CheckCircle2 } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface LinkShortenerGateProps {
  children: React.ReactNode;
}

export const LinkShortenerGate = ({ children }: LinkShortenerGateProps) => {
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const [accessStatus, setAccessStatus] = useState<'loading' | 'verified' | 'free'>('loading');
  const [shortenerLink, setShortenerLink] = useState<string>('');
  const [initiating, setInitiating] = useState(false);
  const [initiated, setInitiated] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(600); // 10 min

  useEffect(() => {
    if (premiumLoading) return;
    if (isPremium) {
      setAccessStatus('loading'); // will short-circuit below
      return;
    }
    checkVerification();
  }, [isPremium, premiumLoading]);

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

  if (premiumLoading || accessStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (isPremium || accessStatus === 'verified') {
    return <>{children}</>;
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
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
    </div>
  );
};

export default LinkShortenerGate;
