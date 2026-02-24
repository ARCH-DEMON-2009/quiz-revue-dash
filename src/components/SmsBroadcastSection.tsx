import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const SmsBroadcastSection = () => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const sendBroadcast = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (message.length > 160) {
      toast.error("SMS message must be 160 characters or less");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { mode: "broadcast", message: message.trim() },
      });

      if (error) throw error;

      setLastResult(data);
      if (data?.sent > 0) {
        toast.success(`SMS sent to ${data.sent} users`);
      } else {
        toast.warning(data?.message || "No SMS sent");
      }
    } catch (err: any) {
      console.error("Broadcast error:", err);
      toast.error("Failed to send SMS broadcast");
    } finally {
      setSending(false);
    }
  };

  const sendExpiryReminder = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          mode: "expiry",
          message:
            "Your TestSagar premium expires in 3 days! Renew now at testsagar.com/pricing",
        },
      });

      if (error) throw error;

      setLastResult(data);
      if (data?.sent > 0) {
        toast.success(`Expiry SMS sent to ${data.sent} users`);
      } else {
        toast.info("No users with expiring premium found");
      }
    } catch (err: any) {
      console.error("Expiry SMS error:", err);
      toast.error("Failed to send expiry reminders");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mt-4 sm:mt-6">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          SMS Broadcast (Fast2SMS)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
        {/* Custom broadcast */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">
            Custom Message to All Users
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your SMS message here (max 160 chars)..."
            className="text-xs sm:text-sm resize-none"
            maxLength={160}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {message.length}/160 characters
            </span>
            <Button
              onClick={sendBroadcast}
              disabled={sending || !message.trim()}
              size="sm"
              className="text-xs sm:text-sm"
            >
              {sending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Send to All Users
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="border-t pt-4">
          <label className="text-xs sm:text-sm font-medium mb-2 block">
            Quick Actions
          </label>
          <Button
            onClick={sendExpiryReminder}
            disabled={sending}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
          >
            <Users className="h-3 w-3 mr-1" />
            Send Expiry Reminders (3-day)
          </Button>
        </div>

        {/* Last result */}
        {lastResult && (
          <div className="border-t pt-4">
            <label className="text-xs sm:text-sm font-medium mb-2 block">
              Last Result
            </label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Total: {lastResult.total || 0}</Badge>
              <Badge variant="default">Sent: {lastResult.sent || 0}</Badge>
              {lastResult.failed > 0 && (
                <Badge variant="destructive">
                  Failed: {lastResult.failed}
                </Badge>
              )}
            </div>
            {lastResult.message && (
              <p className="text-xs text-muted-foreground mt-1">
                {lastResult.message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
