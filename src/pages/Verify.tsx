import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Verify = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    handleVerification();
  }, []);

  const handleVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('error');
        setErrorMessage('Please log in first.');
        return;
      }

      // Find pending verification for this user (created within last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: pending, error: fetchError } = await supabase
        .from("access_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gt("initiated_at", tenMinutesAgo)
        .order("initiated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!pending) {
        setStatus('error');
        setErrorMessage('No pending verification found. Please start verification from the dashboard first.');
        return;
      }

      // Check minimum 15 seconds elapsed
      const initiatedAt = new Date(pending.initiated_at);
      const elapsed = (Date.now() - initiatedAt.getTime()) / 1000;
      
      if (elapsed < 60) {
        setStatus('error');
        setErrorMessage('Verification completed too quickly. Please complete the full verification process.');
        return;
      }

      // Mark as verified with 12-hour expiry
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      
      const { error: updateError } = await supabase
        .from("access_verifications")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          expires_at: expiresAt,
        })
        .eq("id", pending.id);

      if (updateError) throw updateError;

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
