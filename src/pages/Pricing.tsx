import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Percent, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PricingPlan {
  id: string;
  name: string;
  duration: string;
  durationDays: number;
  price: number;
  originalPrice?: number;
  perMonth: number;
  popular?: boolean;
}

const plans: PricingPlan[] = [
  { id: "1week", name: "1 Week", duration: "7 days", durationDays: 7, price: 15, perMonth: 60 },
  { id: "1month", name: "1 Month", duration: "30 days", durationDays: 30, price: 40, perMonth: 40 },
  { id: "3months", name: "3 Months", duration: "90 days", durationDays: 90, price: 70, originalPrice: 120, perMonth: 23, popular: true },
  { id: "6months", name: "6 Months", duration: "180 days", durationDays: 180, price: 100, originalPrice: 240, perMonth: 17 },
  { id: "1year", name: "1 Year", duration: "365 days", durationDays: 365, price: 140, originalPrice: 480, perMonth: 12 },
  { id: "2years", name: "2 Years", duration: "730 days", durationDays: 730, price: 210, originalPrice: 960, perMonth: 9 },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Pricing = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadRazorpay();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to purchase premium");
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const loadRazorpay = () => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    // Simulated promo codes - in production, fetch from database
    const promoCodes: Record<string, number> = {
      "WELCOME10": 10,
      "SAVE20": 20,
      "PREMIUM30": 30,
      "SPECIAL50": 50,
    };

    const discount = promoCodes[promoCode.toUpperCase()];
    if (discount) {
      setAppliedPromo({ code: promoCode.toUpperCase(), discount });
      toast.success(`Promo code applied! ${discount}% off`);
    } else {
      toast.error("Invalid promo code");
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode("");
  };

  const calculateFinalPrice = (plan: PricingPlan) => {
    if (appliedPromo) {
      return Math.round(plan.price * (1 - appliedPromo.discount / 100));
    }
    return plan.price;
  };

  const handlePayment = async (plan: PricingPlan) => {
    if (!user) {
      toast.error("Please login first");
      navigate("/auth");
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);
    const finalPrice = calculateFinalPrice(plan);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      // Ensure Razorpay is loaded
      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh the page.");
        setLoading(false);
        return;
      }

      const options = {
        key: "rzp_live_zxasMqJyhIe3pG",
        amount: finalPrice * 100, // Razorpay expects amount in paise
        currency: "INR",
        name: "TestSagar Premium",
        description: `${plan.name} Premium Subscription`,
        image: "https://testsagar.com/logo.png",
        handler: async function (response: any) {
          // Payment successful - save to database
          try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

            const { error } = await supabase.from("premium_users").insert({
              user_id: user.id,
              email: user.email || "",
              name: profile?.name || "User",
              payment_id: response.razorpay_payment_id,
              expiry_date: expiryDate.toISOString(),
              plan_months: Math.round(plan.durationDays / 30),
              original_amount: plan.price,
              discounted_amount: finalPrice,
              promo_code_used: appliedPromo?.code || null,
              status: "active",
            });

            if (error) {
              console.error("Database error:", error);
              toast.error("Payment received but error activating premium. Contact support with payment ID: " + response.razorpay_payment_id);
              return;
            }

            toast.success("Payment successful! Welcome to Premium!");
            navigate("/");
          } catch (err) {
            console.error("Error saving premium status:", err);
            toast.error("Payment received but error activating premium. Contact support.");
          }
        },
        prefill: {
          name: profile?.name || "",
          email: user.email || "",
          contact: "",
        },
        notes: {
          plan_id: plan.id,
          plan_name: plan.name,
          user_id: user.id,
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast.info("Payment cancelled");
          },
          escape: true,
          backdropclose: false,
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Crown className="h-5 w-5" />
            <span className="font-medium">Premium Plans</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Unlock Your Full Potential
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get unlimited access to all tests, detailed analytics, and exclusive features
          </p>
        </div>

        {/* Promo Code Section */}
        <Card className="mb-8 max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="pl-10"
                  disabled={!!appliedPromo}
                />
              </div>
              {appliedPromo ? (
                <Button variant="destructive" onClick={removePromoCode}>
                  Remove
                </Button>
              ) : (
                <Button onClick={applyPromoCode}>Apply</Button>
              )}
            </div>
            {appliedPromo && (
              <p className="text-sm text-success mt-2 flex items-center gap-1">
                <Check className="h-4 w-4" />
                {appliedPromo.code} - {appliedPromo.discount}% discount applied!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const finalPrice = calculateFinalPrice(plan);
            const hasDiscount = appliedPromo && finalPrice !== plan.price;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:shadow-xl ${
                  plan.popular ? "border-primary border-2 shadow-lg" : ""
                } ${selectedPlan?.id === plan.id ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.duration}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">₹{finalPrice}</span>
                      {(plan.originalPrice || hasDiscount) && (
                        <span className="text-lg text-muted-foreground line-through">
                          ₹{plan.originalPrice || plan.price}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ₹{plan.perMonth}/month
                    </p>
                    {hasDiscount && (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Save ₹{plan.price - finalPrice}
                      </Badge>
                    )}
                  </div>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      Unlimited test access
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      Detailed analytics
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      Performance tracking
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      Priority support
                    </li>
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePayment(plan)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>What's included in Premium?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Unlimited Tests</h3>
                <p className="text-sm text-muted-foreground">Access all available tests</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Detailed Analytics</h3>
                <p className="text-sm text-muted-foreground">Track your progress</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Leaderboard Access</h3>
                <p className="text-sm text-muted-foreground">Compare with others</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Priority Support</h3>
                <p className="text-sm text-muted-foreground">Get help faster</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Pricing;
