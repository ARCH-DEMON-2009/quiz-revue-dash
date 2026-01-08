import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Percent, Crown, Loader2, X } from "lucide-react";
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
  const [appliedPromo, setAppliedPromo] = useState<{ 
    code: string; 
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    final_price: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
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

    if (!selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }

    setPromoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: {
          code: promoCode.trim(),
          plan_id: selectedPlan.id,
          plan_price: selectedPlan.price,
          user_id: user?.id
        }
      });

      if (error) throw error;

      if (data.valid) {
        setAppliedPromo({
          code: data.code,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: data.discount_amount,
          final_price: data.final_price
        });
        toast.success(data.message);
      } else {
        toast.error(data.error || "Invalid promo code");
      }
    } catch (error) {
      console.error("Error validating promo code:", error);
      toast.error("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode("");
  };

  const calculateFinalPrice = (plan: PricingPlan) => {
    if (appliedPromo && selectedPlan?.id === plan.id) {
      return appliedPromo.final_price;
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
    
    // Recalculate if promo was applied to a different plan
    let finalPrice = plan.price;
    let promoToUse = appliedPromo;
    
    if (appliedPromo && selectedPlan?.id !== plan.id) {
      // Promo was applied to different plan, need to revalidate
      promoToUse = null;
    } else if (appliedPromo) {
      finalPrice = appliedPromo.final_price;
    }

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      // Handle FREE orders (100% discount) - skip Razorpay
      if (finalPrice === 0) {
        toast.info("Activating your free premium...");
        
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
          body: {
            razorpay_order_id: `free_${Date.now()}`,
            razorpay_payment_id: `free_promo_${promoToUse?.code}_${Date.now()}`,
            razorpay_signature: 'FREE_ORDER',
            user_id: user.id,
            plan_id: plan.id,
            plan_name: plan.name,
            plan_days: plan.durationDays,
            original_amount: plan.price,
            final_amount: 0,
            promo_code: promoToUse?.code || null,
            is_free_order: true
          }
        });

        if (verifyError) throw verifyError;

        if (verifyData.success) {
          toast.success("Premium activated for FREE! 🎉");
          navigate("/");
        } else {
          toast.error(verifyData.error || "Failed to activate premium");
        }
        setLoading(false);
        return;
      }

      // Create order through edge function for paid orders
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: finalPrice,
          currency: 'INR',
          receipt: `premium_${user.id}_${Date.now()}`,
          notes: {
            plan_id: plan.id,
            plan_name: plan.name,
            user_id: user.id,
            promo_code: promoToUse?.code || null
          }
        }
      });

      if (orderError) throw orderError;
      
      if (orderData.error) {
        throw new Error(orderData.error);
      }

      // Ensure Razorpay is loaded
      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh the page.");
        setLoading(false);
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TestSagar Premium",
        description: `${plan.name} Premium Subscription`,
        image: "https://testsagar.com/logo.png",
        order_id: orderData.order_id,
        handler: async function (response: any) {
          // Verify payment through edge function
          try {
            toast.info("Verifying payment...");
            
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user.id,
                plan_id: plan.id,
                plan_name: plan.name,
                plan_days: plan.durationDays,
                original_amount: plan.price,
                final_amount: finalPrice,
                promo_code: promoToUse?.code || null
              }
            });

            if (verifyError) throw verifyError;

            if (verifyData.success) {
              toast.success("Payment successful! Welcome to Premium!");
              navigate("/");
            } else {
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch (err) {
            console.error("Error verifying payment:", err);
            toast.error("Payment received but verification failed. Contact support with payment ID: " + response.razorpay_payment_id);
          } finally {
            setLoading(false);
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
            <span className="font-medium">Upgrade to Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock unlimited access to all tests, detailed analytics, and premium features
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
              } ${plan.popular ? 'border-primary' : ''}`}
              onClick={() => {
                setSelectedPlan(plan);
                // Clear promo if switching plans
                if (appliedPromo && selectedPlan?.id !== plan.id) {
                  setAppliedPromo(null);
                  setPromoCode("");
                }
              }}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.duration}</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  {plan.originalPrice && (
                    <span className="text-muted-foreground line-through text-lg mr-2">
                      ₹{plan.originalPrice}
                    </span>
                  )}
                  <span className="text-4xl font-bold">₹{calculateFinalPrice(plan)}</span>
                  {appliedPromo && selectedPlan?.id === plan.id && (
                    <span className="text-muted-foreground line-through text-lg ml-2">
                      ₹{plan.price}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  ₹{Math.round(calculateFinalPrice(plan) / (plan.durationDays / 30))}/month
                </p>
                {plan.originalPrice && !appliedPromo && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    Save {Math.round((1 - plan.price / plan.originalPrice) * 100)}%
                  </Badge>
                )}
                {appliedPromo && selectedPlan?.id === plan.id && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    {appliedPromo.discount_type === 'percentage' 
                      ? `${appliedPromo.discount_value}% off` 
                      : `₹${appliedPromo.discount_amount} off`}
                  </Badge>
                )}
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan);
                      if (appliedPromo && selectedPlan?.id !== plan.id) {
                        setAppliedPromo(null);
                        setPromoCode("");
                      }
                    }}
                  >
                    {selectedPlan?.id === plan.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      "Select Plan"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Promo Code Section */}
        <Card className="max-w-md mx-auto mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="pl-10"
                  disabled={!!appliedPromo || promoLoading}
                />
              </div>
              {appliedPromo ? (
                <Button variant="outline" onClick={removePromoCode}>
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={applyPromoCode} disabled={promoLoading || !selectedPlan}>
                  {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              )}
            </div>
            {appliedPromo && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <Check className="h-4 w-4" />
                {appliedPromo.discount_type === 'percentage' 
                  ? `${appliedPromo.discount_value}% discount applied!`
                  : `₹${appliedPromo.discount_value} discount applied!`}
              </p>
            )}
            {!selectedPlan && !appliedPromo && (
              <p className="text-xs text-muted-foreground mt-2">
                Select a plan first to apply promo code
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Button */}
        <div className="text-center">
          <Button
            size="lg"
            className="min-w-[200px]"
            disabled={!selectedPlan || loading}
            onClick={() => selectedPlan && handlePayment(selectedPlan)}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 mr-2" />
                {selectedPlan ? `Pay ₹${calculateFinalPrice(selectedPlan)}` : "Select a plan"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Secure payment powered by Razorpay
          </p>
        </div>

        {/* Features */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-center mb-6">What's Included</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Unlimited test attempts",
              "Detailed performance analytics",
              "Subject-wise analysis",
              "Priority support",
              "Ad-free experience",
              "Access to all tests",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Having issues? Contact us on{" "}
            <button 
              onClick={() => window.open("https://t.me/TestSagarHelpRobot", "_blank")}
              className="text-primary hover:underline"
            >
              Telegram
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
