import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock, AlertTriangle, CreditCard, Tv } from "lucide-react";

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

      // No premium - user gets free access with ads
      setAccessStatus({
        hasAccess: true,
        type: 'free',
        daysLeft: 0,
        expiryDate: null
      });
    } catch (error) {
      console.error("Error checking access:", error);
      // Default to free access on error
      setAccessStatus({ hasAccess: true, type: 'free', daysLeft: 0, expiryDate: null });
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only block if user is not authenticated
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
              <Button className="w-full" size="lg">
                Login / Sign Up
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All authenticated users have access (free with ads or premium without ads)
  return <>{children}</>;
};
