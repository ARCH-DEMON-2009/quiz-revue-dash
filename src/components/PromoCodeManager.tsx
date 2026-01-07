import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, Percent, IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  excluded_plans: string[];
  min_order_amount: number;
  is_active: boolean;
  created_at: string;
}

const planOptions = [
  { id: "1week", name: "1 Week" },
  { id: "1month", name: "1 Month" },
  { id: "3months", name: "3 Months" },
  { id: "6months", name: "6 Months" },
  { id: "1year", name: "1 Year" },
  { id: "2years", name: "2 Years" },
];

export const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [excludedPlans, setExcludedPlans] = useState<string[]>([]);
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      toast.error("Failed to fetch promo codes");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMaxUses("");
    setValidUntil("");
    setExcludedPlans([]);
    setMinOrderAmount("");
    setIsActive(true);
    setEditingCode(null);
  };

  const openEditDialog = (promo: PromoCode) => {
    setEditingCode(promo);
    setCode(promo.code);
    setDiscountType(promo.discount_type as "percentage" | "fixed");
    setDiscountValue(promo.discount_value.toString());
    setMaxUses(promo.max_uses?.toString() || "");
    setValidUntil(promo.valid_until ? promo.valid_until.split("T")[0] : "");
    setExcludedPlans(promo.excluded_plans || []);
    setMinOrderAmount(promo.min_order_amount?.toString() || "");
    setIsActive(promo.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim()) {
      toast.error("Promo code is required");
      return;
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error("Valid discount value is required");
      return;
    }
    if (discountType === "percentage" && parseFloat(discountValue) > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    setSaving(true);
    try {
      const promoData = {
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        max_uses: maxUses ? parseInt(maxUses) : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        excluded_plans: excludedPlans,
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        is_active: isActive,
      };

      if (editingCode) {
        const { error } = await supabase
          .from("promo_codes")
          .update(promoData)
          .eq("id", editingCode.id);

        if (error) throw error;
        toast.success("Promo code updated successfully");
      } else {
        const { error } = await supabase
          .from("promo_codes")
          .insert(promoData);

        if (error) {
          if (error.code === "23505") {
            toast.error("This promo code already exists");
            return;
          }
          throw error;
        }
        toast.success("Promo code created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchPromoCodes();
    } catch (error) {
      console.error("Error saving promo code:", error);
      toast.error("Failed to save promo code");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    try {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Promo code deleted");
      fetchPromoCodes();
    } catch (error) {
      console.error("Error deleting promo code:", error);
      toast.error("Failed to delete promo code");
    }
  };

  const togglePlanExclusion = (planId: string) => {
    if (excludedPlans.includes(planId)) {
      setExcludedPlans(excludedPlans.filter(p => p !== planId));
    } else {
      setExcludedPlans([...excludedPlans, planId]);
    }
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isMaxedOut = (promo: PromoCode) => {
    if (promo.max_uses === null) return false;
    return promo.current_uses >= promo.max_uses;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Promo Codes</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCode ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Promo Code *</Label>
                <Input
                  placeholder="e.g., SAVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={!!editingCode}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Percentage
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4" />
                          Fixed Amount
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    placeholder={discountType === "percentage" ? "e.g., 20" : "e.g., 50"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Uses (leave empty for unlimited)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valid Until (leave empty for no expiry)</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Min Order Amount</Label>
                <Input
                  type="number"
                  placeholder="e.g., 50"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Exclude Plans (promo won't work on these)</Label>
                <div className="flex flex-wrap gap-2">
                  {planOptions.map((plan) => (
                    <Badge
                      key={plan.id}
                      variant={excludedPlans.includes(plan.id) ? "destructive" : "outline"}
                      className="cursor-pointer"
                      onClick={() => togglePlanExclusion(plan.id)}
                    >
                      {plan.name}
                      {excludedPlans.includes(plan.id) && " ✕"}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingCode ? "Update Promo Code" : "Create Promo Code"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {promoCodes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No promo codes created yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                    <TableCell>
                      {promo.discount_type === "percentage" ? (
                        <span>{promo.discount_value}%</span>
                      ) : (
                        <span>₹{promo.discount_value}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {promo.current_uses}{promo.max_uses !== null ? `/${promo.max_uses}` : ""}
                    </TableCell>
                    <TableCell>
                      {promo.valid_until 
                        ? new Date(promo.valid_until).toLocaleDateString()
                        : "No expiry"}
                    </TableCell>
                    <TableCell>
                      {!promo.is_active ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : isExpired(promo.valid_until) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : isMaxedOut(promo) ? (
                        <Badge variant="destructive">Maxed Out</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(promo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
