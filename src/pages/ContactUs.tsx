import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const ContactUs = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us through any of the channels below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">For general inquiries and support</p>
              <a 
                href="mailto:support@testsagar.com" 
                className="text-primary hover:underline font-medium"
              >
                support@testsagar.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Quick responses via Telegram</p>
              <a 
                href="https://t.me/testsagar" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                @testsagar
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Phone Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Available Mon-Sat, 10 AM - 6 PM IST</p>
              <a 
                href="tel:+919876543210" 
                className="text-primary hover:underline font-medium"
              >
                +91 98765 43210
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                TestSagar Education Pvt. Ltd.<br />
                India
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-4">Response Time</h3>
            <p className="text-muted-foreground">
              We typically respond to all inquiries within 24-48 hours during business days. 
              For urgent matters, please reach out via Telegram for the fastest response.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ContactUs;
