import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const ShippingPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Shipping Policy</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Information about our digital product delivery
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">Digital Product Delivery</h2>
              <p className="text-muted-foreground">
                TestSagar is a digital educational platform. All our products and services are 
                delivered digitally and do not require physical shipping. Upon successful payment, 
                your premium subscription is activated instantly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Instant Activation</h2>
              <p className="text-muted-foreground">
                Once your payment is confirmed, your premium subscription is automatically activated. 
                You will have immediate access to all premium features including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Unlimited test attempts</li>
                <li>Detailed performance analytics</li>
                <li>Subject-wise analysis</li>
                <li>Priority support</li>
                <li>Ad-free experience</li>
                <li>Access to all tests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Access Issues</h2>
              <p className="text-muted-foreground">
                If you experience any issues accessing your premium features after payment:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Try logging out and logging back in</li>
                <li>Clear your browser cache</li>
                <li>Contact our support team with your payment ID</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Support</h2>
              <p className="text-muted-foreground">
                For any delivery-related issues or questions, please contact us at{" "}
                <a href="mailto:support@testsagar.com" className="text-primary hover:underline">
                  support@testsagar.com
                </a>{" "}
                or via Telegram at{" "}
                <a 
                  href="https://t.me/testsagar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @testsagar
                </a>
              </p>
            </section>

            <section className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Last updated: January 2025
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ShippingPolicy;
