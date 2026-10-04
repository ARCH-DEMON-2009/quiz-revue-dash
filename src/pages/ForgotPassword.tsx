import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import FloatingBackground from "@/components/FloatingBackground";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResetMode(true);
        setRecoveryError("");
      }
    });

    const searchType = searchParams.get("type");
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hashType = hashParams.get("type");
    const accessToken = searchParams.get("access_token") ?? hashParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token") ?? hashParams.get("refresh_token");
    if (accessToken && (searchType === "recovery" || hashType === "recovery")) {
      void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? "" })
        .then(({ error }) => {
          if (!active) return;
          if (error) setRecoveryError("This reset link is invalid or expired. Request a new one.");
          else setIsResetMode(true);
        });
    }

    const code = searchParams.get("code");
    if (code) {
      void (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session) {
          setIsResetMode(true);
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) setRecoveryError("This reset link is invalid or expired. Request a new one.");
        else setIsResetMode(true);
      })().catch((error) => {
        if (active) setRecoveryError(error instanceof Error ? error.message : "Could not verify this reset link.");
      });
    }

    if (searchType === "recovery" || hashType === "recovery") setIsResetMode(true);

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/forgot-password", window.location.origin).toString(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password reset link sent! Check your email.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      navigate("/auth");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-background p-4 relative">
      <FloatingBackground />
      
      <Card className="w-full max-w-md glass">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {isResetMode ? "Set New Password" : "Forgot Password"}
          </CardTitle>
          <CardDescription>
            {isResetMode
              ? "Enter your new password below"
              : "Enter your email to receive a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {recoveryError && <p className="text-sm text-destructive" role="alert">{recoveryError}</p>}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-sm text-primary hover:underline"
            >
              Back to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;