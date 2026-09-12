import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Send, Copy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const BOT_URL = "https://t.me/TestSagarHelpRobot";

export interface ManualPaymentDetails {
  name: string;
  email: string;
  whatsapp?: string | null;
  userId: string;
  planId: string;
  planName: string;
  planDuration: string;
  price: number;
  originalPrice: number;
  promoCode?: string | null;
}

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ManualPaymentDetails | null;
}

const buildMessage = (d: ManualPaymentDetails) => {
  const lines = [
    "🔔 Premium Activation Request",
    "",
    `👤 Name: ${d.name}`,
    `📧 Email: ${d.email}`,
    d.whatsapp ? `📱 WhatsApp: ${d.whatsapp}` : null,
    `🆔 User ID: ${d.userId}`,
    "",
    `⭐ Plan: ${d.planName} (${d.planDuration})`,
    `🏷️ Plan Code: ${d.planId}`,
    d.promoCode ? `🎟️ Promo Code: ${d.promoCode}` : null,
    `💰 Amount to pay: ₹${d.price}${d.price !== d.originalPrice ? ` (original ₹${d.originalPrice})` : ""}`,
    "",
    "Online payment is currently unavailable on the website. Please share payment details so I can pay and get my premium activated.",
  ].filter(Boolean);
  return lines.join("\n");
};

export const ManualPaymentDialog = ({ open, onOpenChange, details }: ManualPaymentDialogProps) => {
  const [copied, setCopied] = useState(false);

  const message = details ? buildMessage(details) : "";

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      return false;
    }
  };

  const continueToBot = async () => {
    const didCopy = await copyMessage();
    const ref = details
      ? `pay_${details.planId}_${details.userId.slice(0, 8)}`.replace(/[^a-zA-Z0-9_-]/g, "")
      : "pay";
    window.open(`${BOT_URL}?start=${ref}`, "_blank", "noopener,noreferrer");
    toast.success(
      didCopy
        ? "Your details are copied — just paste them in the chat and send."
        : "Chat opened. Please copy your details from this page and paste them in the chat."
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-xl">Online payment is temporarily unavailable</DialogTitle>
          <DialogDescription className="text-center">
            Our payment gateway is facing an issue right now. You can still get premium instantly — send your plan
            details to our support assistant and premium will be activated for you after payment.
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{details.planName} · {details.planDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">₹{details.price}</span>
            </div>
            {details.promoCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promo code</span>
                <span className="font-medium">{details.promoCode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account</span>
              <span className="font-medium truncate max-w-[55%]">{details.email}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={continueToBot} disabled={!details}>
            <Send className="mr-2 h-4 w-4" />
            Continue on Telegram
          </Button>
          <Button variant="outline" className="w-full" onClick={copyMessage} disabled={!details}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Details copied" : "Copy my details"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back to plans
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Activation is usually done within a few hours of payment confirmation.
        </p>
      </DialogContent>
    </Dialog>
  );
};
