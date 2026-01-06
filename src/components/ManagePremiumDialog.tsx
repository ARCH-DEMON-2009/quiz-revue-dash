import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, Minus, Plus, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";

interface UserData {
  user_id: string;
  name: string;
  email: string;
  account_type: "premium" | "trial" | "expired" | "new";
  premium_expiry: string | null;
  trial_start: string | null;
}

interface ManagePremiumDialogProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const extensionOptions = [
  { id: "7days", label: "+7 Days", days: 7 },
  { id: "30days", label: "+1 Month", days: 30 },
  { id: "90days", label: "+3 Months", days: 90 },
  { id: "180days", label: "+6 Months", days: 180 },
  { id: "365days", label: "+1 Year", days: 365 },
];

const reductionOptions = [
  { id: "7days", label: "-7 Days", days: -7 },
  { id: "30days", label: "-1 Month", days: -30 },
  { id: "90days", label: "-3 Months", days: -90 },
];

const newPlanOptions = [
  { id: "1week", name: "1 Week", days: 7 },
  { id: "1month", name: "1 Month", days: 30 },
  { id: "3months", name: "3 Months", days: 90 },
  { id: "6months", name: "6 Months", days: 180 },
  { id: "1year", name: "1 Year", days: 365 },
  { id: "2years", name: "2 Years", days: 730 },
];

export const ManagePremiumDialog = ({ user, open, onOpenChange, onSuccess }: ManagePremiumDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [customDays, setCustomDays] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentId, setPaymentId] = useState("admin_manual");

  if (!user) return null;

  const isPremium = user.account_type === "premium";
  const currentExpiry = user.premium_expiry ? new Date(user.premium_expiry) : null;

  const handleExtendPremium = async (days: number) => {
    if (!user.premium_expiry) return;
    
    setLoading(true);
    try {
      const newExpiry = new Date(user.premium_expiry);
      newExpiry.setDate(newExpiry.getDate() + days);

      const { error } = await supabase
        .from("premium_users")
        .update({ expiry_date: newExpiry.toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.user_id)
        .eq("status", "active");

      if (error) throw error;

      toast.success(`Extended ${user.name}'s premium by ${days} days`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error extending premium:", error);
      toast.error(error.message || "Failed to extend premium");
    } finally {
      setLoading(false);
    }
  };

  const handleReducePremium = async (days: number) => {
    if (!user.premium_expiry) return;
    
    setLoading(true);
    try {
      const newExpiry = new Date(user.premium_expiry);
      newExpiry.setDate(newExpiry.getDate() + days); // days is negative

      // Check if new expiry is in the past
      if (newExpiry <= new Date()) {
        toast.error("Cannot reduce to past date. Use 'Revoke Premium' instead.");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("premium_users")
        .update({ expiry_date: newExpiry.toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.user_id)
        .eq("status", "active");

      if (error) throw error;

      toast.success(`Reduced ${user.name}'s premium by ${Math.abs(days)} days`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error reducing premium:", error);
      toast.error(error.message || "Failed to reduce premium");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePremium = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("premium_users")
        .update({ status: "revoked", expiry_date: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.user_id)
        .eq("status", "active");

      if (error) throw error;

      toast.success(`Revoked ${user.name}'s premium access`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error revoking premium:", error);
      toast.error(error.message || "Failed to revoke premium");
    } finally {
      setLoading(false);
    }
  };

  const handleMakePremium = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    setLoading(true);
    try {
      const plan = newPlanOptions.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Invalid plan");

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.days);

      // Check if user already has a premium record (expired/revoked)
      const { data: existingPremium } = await supabase
        .from("premium_users")
        .select("id")
        .eq("user_id", user.user_id)
        .single();

      if (existingPremium) {
        // Update existing record
        const { error } = await supabase
          .from("premium_users")
          .update({
            expiry_date: expiryDate.toISOString(),
            status: "active",
            payment_id: paymentId,
            plan_months: Math.round(plan.days / 30),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.user_id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from("premium_users").insert({
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          payment_id: paymentId,
          expiry_date: expiryDate.toISOString(),
          plan_months: Math.round(plan.days / 30),
          plan_duration_type: plan.days >= 30 ? "month" : "week",
          plan_duration_value: plan.days >= 365 ? Math.round(plan.days / 365) : plan.days >= 30 ? Math.round(plan.days / 30) : 1,
          status: "active",
        });

        if (error) throw error;
      }

      toast.success(`${user.name} is now a premium user!`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error making premium:", error);
      toast.error(error.message || "Failed to make user premium");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomExtend = async () => {
    const days = parseInt(customDays);
    if (isNaN(days) || days === 0) {
      toast.error("Enter a valid number of days");
      return;
    }
    
    if (days > 0) {
      await handleExtendPremium(days);
    } else {
      await handleReducePremium(days);
    }
  };

  const handleSetExactDate = async (dateStr: string) => {
    if (!dateStr) return;
    
    setLoading(true);
    try {
      const newExpiry = new Date(dateStr);
      
      if (newExpiry <= new Date()) {
        toast.error("Expiry date must be in the future");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("premium_users")
        .update({ expiry_date: newExpiry.toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.user_id)
        .eq("status", "active");

      if (error) throw error;

      toast.success(`Set ${user.name}'s expiry to ${newExpiry.toLocaleDateString()}`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error setting expiry:", error);
      toast.error(error.message || "Failed to set expiry date");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User: {user.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-sm mt-1">
              Status: <span className={isPremium ? "text-yellow-500 font-medium" : "text-muted-foreground"}>
                {user.account_type === "premium" ? "Premium" : user.account_type === "trial" ? "Trial" : user.account_type === "new" ? "New User" : "Expired"}
              </span>
            </p>
            {currentExpiry && (
              <p className="text-sm">
                Expires: <span className="font-medium">{currentExpiry.toLocaleDateString()}</span>
                {" "}({Math.ceil((currentExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
              </p>
            )}
          </div>

          {isPremium ? (
            <>
              {/* Extend Premium */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-500" />
                  Extend Premium
                </Label>
                <div className="flex flex-wrap gap-2">
                  {extensionOptions.map((opt) => (
                    <Button
                      key={opt.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExtendPremium(opt.days)}
                      disabled={loading}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reduce Premium */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-orange-500" />
                  Reduce Premium
                </Label>
                <div className="flex flex-wrap gap-2">
                  {reductionOptions.map((opt) => (
                    <Button
                      key={opt.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleReducePremium(opt.days)}
                      disabled={loading}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Days */}
              <div className="space-y-2">
                <Label>Custom Days (+/-)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 15 or -10"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                  />
                  <Button onClick={handleCustomExtend} disabled={loading || !customDays}>
                    Apply
                  </Button>
                </div>
              </div>

              {/* Set Exact Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Set Exact Expiry Date
                </Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleSetExactDate(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Revoke Premium */}
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleRevokePremium}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Revoke Premium Access
                </Button>
              </div>
            </>
          ) : (
            /* Make User Premium */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Make Premium User
                </Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {newPlanOptions.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input
                  placeholder="admin_manual"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                />
              </div>

              <Button 
                className="w-full"
                onClick={handleMakePremium}
                disabled={loading || !selectedPlan}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                Make Premium
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
