import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const TermsAndConditions = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Please read these terms carefully before using our service
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using TestSagar, you accept and agree to be bound by the terms 
                and provisions of this agreement. If you do not agree to abide by these terms, 
                please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. User Account</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account and password. 
                You agree to accept responsibility for all activities that occur under your account. 
                You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Subscription and Payment</h2>
              <p className="text-muted-foreground">
                Premium subscriptions are billed based on the plan selected at the time of purchase. 
                All payments are processed securely through Razorpay. Prices are subject to change 
                with prior notice to existing subscribers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Refund Policy</h2>
              <p className="text-muted-foreground">
                Due to the digital nature of our products, refunds are generally not provided. 
                However, we may consider refunds on a case-by-case basis for technical issues 
                preventing access to our services. Please contact support within 7 days of purchase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content on TestSagar, including but not limited to tests, questions, analytics, 
                and materials, is the property of TestSagar and protected by intellectual property laws. 
                You may not reproduce, distribute, or create derivative works without express permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Prohibited Activities</h2>
              <p className="text-muted-foreground">Users are prohibited from:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Sharing account credentials with others</li>
                <li>Attempting to access other users' accounts</li>
                <li>Copying or distributing test content</li>
                <li>Using automated systems to access the platform</li>
                <li>Any activity that disrupts or interferes with the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TestSagar is provided "as is" without any warranties. We shall not be liable for any 
                indirect, incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Modifications to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the service 
                after changes constitutes acceptance of the new terms. We will notify users of 
                significant changes via email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms and Conditions, please contact us at{" "}
                <a href="mailto:support@testsagar.com" className="text-primary hover:underline">
                  support@testsagar.com
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

export default TermsAndConditions;
