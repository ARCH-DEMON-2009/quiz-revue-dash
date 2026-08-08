import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";

import { isValidEmailProvider } from "@/lib/emailValidator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users onward
        if (session?.user) {
          const whatsapp = session.user.user_metadata?.whatsapp_number;
          if (!whatsapp) {
            setPendingUser(session.user);
            setShowWhatsappDialog(true);
          } else {
            // Use replace to prevent back-button loops after auth
            setTimeout(() => navigate(redirectTo, { replace: true }), 0);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const whatsapp = session.user.user_metadata?.whatsapp_number;
        if (!whatsapp) {
          setPendingUser(session.user);
          setShowWhatsappDialog(true);
        } else {
          navigate(redirectTo, { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!name.trim()) {
        toast.error("Please enter your name");
        return;
      }

      if (!whatsappNumber.trim()) {
        toast.error("Please enter your WhatsApp number");
        return;
      }

      // Validate email provider
      const emailValidation = isValidEmailProvider(email);
      if (!emailValidation.valid) {
        toast.error(emailValidation.message);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name.trim(),
            whatsapp_number: whatsappNumber.trim()
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Account created - user gets free access with ads
      toast.success("Account created successfully! Please check your email to confirm.");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Logged in successfully!");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };


  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      toast.success("Verification email resent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordRequest = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWhatsapp = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!whatsappNumber.trim()) {
      toast.error("Please enter your WhatsApp number");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { whatsapp_number: whatsappNumber.trim() }
      });
      
      if (error) throw error;
      
      toast.success("Profile updated successfully!");
      setShowWhatsappDialog(false);
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(error.message || "Failed to update WhatsApp number");
    } finally {
      setLoading(false);
    }
  };

  if (user && user.user_metadata?.whatsapp_number) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="bg-grid opacity-10" />
      <div className="bg-circles">
        <div className="bg-circle bg-circle-1 opacity-20" />
        <div className="bg-circle bg-circle-2 opacity-20" />
      </div>
      <Card className="w-full max-w-md glass shadow-glow animate-in fade-in zoom-in duration-500 relative z-10">
        <CardHeader className="space-y-4 text-center">
          <div 
            className="flex flex-col items-center gap-3 cursor-pointer group" 
            onClick={() => navigate("/")}
          >
            <img 
              src="/logo.png" 
              alt="Test Sagar Logo" 
              className="h-16 w-16 object-contain rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Test Sagar
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {isLogin ? "Welcome Back" : "Get Started"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access your account"
              : "Create an account to start taking tests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="+91 1234567890"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
            </Button>
            
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setName("");
                setWhatsappNumber("");
              }}
              className="text-sm text-primary hover:underline block w-full"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </button>
          </div>

        </CardContent>
      </Card>

      <Dialog open={showWhatsappDialog} onOpenChange={setShowWhatsappDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>One last thing!</DialogTitle>
            <DialogDescription>
              We need your WhatsApp number to keep you updated on your test progress and results.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateWhatsapp} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-popup">WhatsApp Number *</Label>
              <Input
                id="whatsapp-popup"
                type="tel"
                placeholder="+91 1234567890"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Continue to Dashboard"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
