import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Shield, User, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppInfo {
  name: string;
  logo_url: string | null;
}

const OauthConsent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [user, setUser] = useState<any>(null);

  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const scope = searchParams.get("scope") || "openid profile email";
  const state = searchParams.get("state");
  const responseType = searchParams.get("response_type");

  useEffect(() => {
    const checkUserAndFetchApp = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login but keep the current URL as redirect
        const currentUrl = window.location.pathname + window.location.search;
        navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }
      setUser(user);

      if (!clientId) {
        toast.error("Missing client_id");
        setLoading(false);
        return;
      }

      try {
        // We use a custom query to system_config or a specific table if Supabase doesn't expose app info yet
        // However, Supabase usually handles the "get app info" part via its own internal APIs.
        // For now, we'll try to fetch it or use placeholder if it's a mock/demo
        // In a real Supabase OAuth Server setup, there might be a RPC or table to query.
        
        // Mocking app info for now as the Supabase JS client might not have a direct public method for this yet
        // unless it's very new.
        setAppInfo({
          name: "Third Party Application",
          logo_url: null
        });
      } catch (error) {
        console.error("Error fetching app info:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchApp();
  }, [clientId, navigate, searchParams]);

  const handleAuthorize = async () => {
    setAuthorizing(true);
    try {
      // The authorization flow usually involves redirecting back to the Supabase authorization endpoint
      // with the user's consent.
      // https://<project-ref>.supabase.co/auth/v1/authorize?client_id=...&redirect_uri=...&...
      
      const authUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/authorize`);
      searchParams.forEach((value, key) => {
        authUrl.searchParams.set(key, value);
      });
      // Add a internal consent flag that Supabase Auth recognizes
      authUrl.searchParams.set("skip_consent", "true"); 

      window.location.href = authUrl.toString();
    } catch (error: any) {
      toast.error(error.message || "Failed to authorize");
      setAuthorizing(false);
    }
  };

  const handleCancel = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set("error", "access_denied");
      url.searchParams.set("error_description", "The user denied the request");
      if (state) url.searchParams.set("state", state);
      window.location.href = url.toString();
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scopes = scope.split(" ").filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner">
              <img src="/logo.png" alt="Test Sagar" className="h-10 w-10 object-contain" />
            </div>
            <div className="h-4 w-4 bg-muted-foreground/20 rounded-full" />
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center border-2 border-border shadow-inner">
              {appInfo?.logo_url ? (
                <img src={appInfo.logo_url} alt={appInfo.name} className="h-10 w-10 object-contain" />
              ) : (
                <Globe className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Authorize {appInfo?.name || "App"}
          </CardTitle>
          <CardDescription className="text-base">
            <span className="font-semibold text-foreground">{appInfo?.name}</span> wants to access your <span className="font-semibold text-primary">Test Sagar</span> account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              This will allow the app to:
            </p>
            <ul className="space-y-3">
              {scopes.includes("openid") && (
                <li className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span>Know who you are on Test Sagar</span>
                </li>
              )}
              {scopes.includes("profile") && (
                <li className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span>View your basic profile info (name, avatar)</span>
                </li>
              )}
              {scopes.includes("email") && (
                <li className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span>View your email address</span>
                </li>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-xs">
            <Shield className="h-4 w-4 shrink-0" />
            <p>Make sure you trust this application. You can revoke access at any time in your profile settings.</p>
          </div>
          
          <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Signed in as <span className="text-foreground font-medium">{user?.email}</span></span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
          <Button 
            className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" 
            onClick={handleAuthorize}
            disabled={authorizing}
          >
            {authorizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              "Authorize Access"
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-destructive" 
            onClick={handleCancel}
            disabled={authorizing}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OauthConsent;
