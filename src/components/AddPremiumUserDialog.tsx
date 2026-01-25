import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  whatsapp_number: string | null;
}

interface Plan {
  id: string;
  name: string;
  days: number;
}

const plans: Plan[] = [
  { id: "1week", name: "1 Week", days: 7 },
  { id: "1month", name: "1 Month", days: 30 },
  { id: "3months", name: "3 Months", days: 90 },
  { id: "6months", name: "6 Months", days: 180 },
  { id: "1year", name: "1 Year", days: 365 },
  { id: "2years", name: "2 Years", days: 730 },
];

interface AddPremiumUserDialogProps {
  onSuccess: () => void;
}

export const AddPremiumUserDialog = ({ onSuccess }: AddPremiumUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [paymentId, setPaymentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error("Enter a name or email to search");
      return;
    }
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, name, email, whatsapp_number")
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      
      if (!data?.length) {
        toast.info("No users found");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleAddPremium = async () => {
    if (!selectedUser || !selectedPlan || !paymentId.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Invalid plan");

      // Check if user already has premium status
      const { data: existingPremium } = await supabase
        .from("premium_users")
        .select("id, expiry_date, status")
        .eq("user_id", selectedUser.user_id)
        .maybeSingle();

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.days);

      if (existingPremium) {
        // Update existing premium record
        const { error } = await supabase
          .from("premium_users")
          .update({
            payment_id: paymentId,
            expiry_date: expiryDate.toISOString(),
            plan_months: Math.round(plan.days / 30),
            plan_duration_type: plan.days >= 30 ? "month" : "week",
            plan_duration_value: plan.days >= 365 ? Math.round(plan.days / 365) : plan.days >= 30 ? Math.round(plan.days / 30) : 1,
            status: "active",
            start_date: new Date().toISOString(),
          })
          .eq("id", existingPremium.id);

        if (error) throw error;
        toast.success(`${selectedUser.name}'s premium updated!`);
      } else {
        // Insert new premium record
        const { error } = await supabase.from("premium_users").insert({
          user_id: selectedUser.user_id,
          email: selectedUser.email,
          name: selectedUser.name,
          payment_id: paymentId,
          expiry_date: expiryDate.toISOString(),
          plan_months: Math.round(plan.days / 30),
          plan_duration_type: plan.days >= 30 ? "month" : "week",
          plan_duration_value: plan.days >= 365 ? Math.round(plan.days / 365) : plan.days >= 30 ? Math.round(plan.days / 30) : 1,
          status: "active",
        });

        if (error) throw error;
        toast.success(`${selectedUser.name} added to premium!`);
      }

      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error adding premium:", error);
      toast.error(error.message || "Failed to add premium user");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedPlan("");
    setPaymentId("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Premium User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add User to Premium</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Users */}
          <div className="space-y-2">
            <Label>Search User</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={searching} size="icon">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <Label>Select User</Label>
              {searchResults.map((user) => (
                <div
                  key={user.user_id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setSelectedUser(user)}
                >
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  {selectedUser.whatsapp_number && (
                    <p className="text-sm text-muted-foreground">{selectedUser.whatsapp_number}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label>Select Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment ID */}
          <div className="space-y-2">
            <Label>Payment ID / Reference</Label>
            <Input
              placeholder="e.g., manual_admin, upi_ref, etc."
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full" 
            onClick={handleAddPremium}
            disabled={!selectedUser || !selectedPlan || !paymentId.trim() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Add to Premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
