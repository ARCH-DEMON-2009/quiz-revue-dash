import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock, AlertTriangle } from "lucide-react";

interface AccessStatus {
  hasAccess: boolean;
  type: 'premium' | 'trial' | 'expired' | 'none';
  daysLeft: number;
  expiryDate: string | null;
}

interface AccessGuardProps {
  children: React.ReactNode;
}

export const useAccessStatus = () => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessStatus({ hasAccess: false, type: 'none', daysLeft: 0, expiryDate: null });
        setLoading(false);
        return;
      }

      // Check premium status first
      const { data: premium } = await supabase
        .from("premium_users")
        .select("expiry_date, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      // Also check by email as fallback
      let premiumData = premium;
      if (!premiumData && user.email) {
        const { data: premiumByEmail } = await supabase
          .from("premium_users")
          .select("expiry_date, status")
          .eq("email", user.email)
          .eq("status", "active")
          .maybeSingle();
        premiumData = premiumByEmail;
      }

      if (premiumData && new Date(premiumData.expiry_date) > new Date()) {
        const daysLeft = Math.ceil((new Date(premiumData.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        setAccessStatus({
          hasAccess: true,
          type: 'premium',
          daysLeft,
          expiryDate: premiumData.expiry_date
        });
        setLoading(false);
        return;
      }

      // Check trial status
      const { data: trial } = await supabase
        .from("user_trials")
        .select("start_date")
        .eq("user_id", user.id)
        .maybeSingle();

      // Also check by email as fallback
      let trialData = trial;
      if (!trialData && user.email) {
        const { data: trialByEmail } = await supabase
          .from("user_trials")
          .select("start_date")
          .eq("email", user.email)
          .maybeSingle();
        trialData = trialByEmail;
      }

      if (trialData) {
        const trialEnd = new Date(trialData.start_date);
        trialEnd.setDate(trialEnd.getDate() + 3); // 3-day trial
        const daysLeft = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft > 0) {
          setAccessStatus({
            hasAccess: true,
            type: 'trial',
            daysLeft,
            expiryDate: trialEnd.toISOString()
          });
        } else {
          setAccessStatus({
            hasAccess: false,
            type: 'expired',
            daysLeft: 0,
            expiryDate: trialEnd.toISOString()
          });
        }
        setLoading(false);
        return;
      }

      // No trial found - should not happen for new users, but handle it
      setAccessStatus({ hasAccess: false, type: 'none', daysLeft: 0, expiryDate: null });
    } catch (error) {
      console.error("Error checking access:", error);
      setAccessStatus({ hasAccess: false, type: 'none', daysLeft: 0, expiryDate: null });
    } finally {
      setLoading(false);
    }
  };

  return { accessStatus, loading, refetch: checkAccess };
};

export const AccessGuard = ({ children }: AccessGuardProps) => {
  const navigate = useNavigate();
  const { accessStatus, loading } = useAccessStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!accessStatus?.hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">
              {accessStatus?.type === 'expired' ? 'Trial Expired' : 'Access Required'}
            </CardTitle>
            <CardDescription>
              {accessStatus?.type === 'expired' 
                ? 'Your 3-day free trial has ended. Please buy premium to continue accessing tests.'
                : 'You need a premium subscription to access this feature.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                To buy premium, please contact our admin:
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={() => window.open("https://t.me/TestSagarHelpRobot", "_blank")}
                  variant="outline"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Help Bot
                </Button>
                <Button 
                  onClick={() => window.open("https://t.me/Its_trms", "_blank")}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Contact Admin
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => navigate("/")}
              >
                Back to Home
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/profile")}
              >
                View Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
