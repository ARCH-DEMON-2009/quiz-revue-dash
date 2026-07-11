import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { blockDevice, isDeviceBlockedFor } from "@/components/BypassBlockGuard";
import { VERIFY_RETURN_KEY } from "@/components/LinkShortenerGate";

/** Only allow same-app relative paths to prevent open-redirects. */
const safeReturnPath = (raw: string | null): string => {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
};

const Verify = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const deviceBlock = isDeviceBlockedFor(user.id);
        if (deviceBlock.blocked) {
          setStatus('error');
          setErrorMessage('You are blocked for bypass attempt. Please wait for the block to expire.');
          return;
        }
      }
      handleVerification();
    })();
  }, []);


  const handleVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('error');
        setErrorMessage('Please log in first.');
        return;
      }

      // Completion (timing check, bypass detection, and marking verified) is
      // done entirely server-side. The client can no longer set status=verified,
      // so a direct API call cannot skip the ad/link-shortener flow.
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "complete-verification",
        {},
      );

      if (fnError) throw fnError;

      if (result?.status === "blocked") {
        // Mirror the block locally so the guard shows the block screen immediately.
        await blockDevice();
        setStatus('error');
        setErrorMessage(result.error || 'Bypass detected! You have been blocked for 24 hours.');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      if (result?.status === "no_pending") {
        setStatus('error');
        setErrorMessage('No pending verification found. Please start verification from the dashboard first.');
        return;
      }

      if (result?.status !== "verified") {
        setStatus('error');
        setErrorMessage(result?.error || 'Verification could not be completed. Please try again.');
        return;
      }

      setStatus('success');
      toast.success("Verification complete! You have 12 hours of access.");

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Verification error:", error);
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
            {status === 'verifying' && (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-8 w-8 text-success" />
            )}
            {status === 'error' && (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'verifying' && 'Verifying...'}
            {status === 'success' && 'Verification Complete!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your access.'}
            {status === 'success' && 'You now have 12 hours of full access. Redirecting...'}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Verify;
