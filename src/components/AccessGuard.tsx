import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface AccessStatus {
  hasAccess: boolean;
  type: 'premium' | 'free' | 'none';
  daysLeft: number;
  expiryDate: string | null;
}

interface AccessGuardProps {
  children: React.ReactNode;
}

export const useAccessStatus = () => {
  const { isPremium, daysLeft, expiresAt, isLoading: premiumLoading } = usePremiumStatus();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setAuthed(!!user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setAuthed(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const loading = premiumLoading || authed === null;

  let accessStatus: AccessStatus;
  if (authed === false) {
    accessStatus = { hasAccess: false, type: 'none', daysLeft: 0, expiryDate: null };
  } else if (isPremium) {
    accessStatus = { hasAccess: true, type: 'premium', daysLeft, expiryDate: expiresAt };
  } else {
    accessStatus = { hasAccess: true, type: 'free', daysLeft: 0, expiryDate: null };
  }

  return { accessStatus, loading };
};

export const AccessGuard = ({ children }: AccessGuardProps) => {
  const navigate = useNavigate();
  const { accessStatus, loading } = useAccessStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (accessStatus?.type === 'none') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Login Required</CardTitle>
            <CardDescription>
              Please login or create an account to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/auth" className="block">
              <Button className="w-full" size="lg">Login / Sign Up</Button>
            </Link>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
