import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gift, Send } from "lucide-react";
import { toast } from "sonner";

export const SendGiftEmailDialog = () => {
  const [email, setEmail] = useState("");
  const [giftKey, setGiftKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; giftKey?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; giftKey?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!giftKey) {
      newErrors.giftKey = "Gift key is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendGift = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Get the admin user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // 2. Call the edge function
      const payload = {
        email: email.trim().toLowerCase(),
        gift_key: giftKey.trim(),
        name: "Premium Member",
        plan_name: "Admin Gift Plan",
        plan_days: 365,
        amount: 0,
        payment_id: "ADMIN_GIFT_" + Math.random().toString(36).substring(7).toUpperCase(),
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        is_admin_activation: true
      };

      const { data, error } = await supabase.functions.invoke("send-premium-email", {
        body: payload
      });

      if (error) {
        // Internal logging of status and context
        console.group("Edge Function Failure: send-premium-email");
        console.error("Status:", (error as any).status || "N/A");
        console.error("Payload:", payload);
        console.error("Error Object:", error);
        console.groupEnd();
        throw error;
      }

      // 3. Log the successful attempt
      await supabase.from("admin_gift_logs" as any).insert({
        admin_id: user?.id,
        recipient_email: email.trim().toLowerCase(),
        status: "success"
      });

      toast.success("Gift premium email sent successfully to " + email);
      setEmail("");
      setGiftKey("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending gift email:", error);
      
      let errorDetails = "Unknown error";
      let statusCode = "N/A";
      
      try {
        if (error.context) {
          statusCode = error.context.status || statusCode;
          if (typeof error.context.json === 'function') {
            const body = await error.context.json();
            errorDetails = JSON.stringify(body);
            console.log("Response Body:", body);
          }
        } else {
          errorDetails = error.message || error.toString();
        }
      } catch (e) {
        errorDetails = error.message || "Failed to parse error response";
      }

      // Log the failed attempt to database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("admin_gift_logs" as any).insert({
          admin_id: user?.id,
          recipient_email: email.trim().toLowerCase(),
          status: "failed",
          error_details: `Code: ${statusCode}, Body: ${errorDetails}`
        });
      } catch (logErr) {
        console.error("Failed to log error to DB:", logErr);
      }

      toast.error(
        `'''Do not make any visual modifications. The\n\nphrases I write are commands to understand what I\n\nwant, not to be written down. Understand their\n\ncontent well, then execute what is required.''' fix\n\n'Do not make any visual modifications. The phrases\n\nI write are commands to understand what I want,\n\nnot to be written down. Understand their content\n\nwell, then execute what is required.'\" Show the\n\nexact failure reason and response body in the gift\n\nemail dialog when an Edge Function mail send\n\nattempt fails. Edge Function returned a non-2xx\n\nstatus code`,
        {
          description: `Reason: ${errorDetails}`,
          duration: 15000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary">
          <Gift className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Send Gift Email</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Gift Premium</DialogTitle>
          <DialogDescription>
            Enter a user's email and your gift key to send them a "Premium Activated" notification. 
            This email includes details for a 365-day plan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">User Email</label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="giftKey" className="text-sm font-medium">Gift Key</label>
            <Input
              id="giftKey"
              type="password"
              placeholder="Enter gift key"
              value={giftKey}
              onChange={(e) => {
                setGiftKey(e.target.value);
                if (errors.giftKey) setErrors({ ...errors, giftKey: undefined });
              }}
              className={errors.giftKey ? "border-destructive" : ""}
            />
            {errors.giftKey && <span className="text-xs text-destructive">{errors.giftKey}</span>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSendGift} disabled={loading} className="gap-2">
            {loading ? "Sending..." : (
              <>
                <Send className="h-4 w-4" />
                Send Notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};