import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

const ContactUs = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        // Try to get name from user_profiles
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("name")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          setUserName(profile.name);
        }
      }
    };
    fetchUserData();
  }, []);

  const getWhatsAppUrl = () => {
    const message = userName && userEmail 
      ? `Hello, I'm ${userName} (${userEmail}). I need assistance.`
      : "Hello, I need assistance.";
    return `https://wa.me/84522122461?text=${encodeURIComponent(message)}`;
  };

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
            Have questions? We're here to help. Reach out to us through WhatsApp.
          </p>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                WhatsApp Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Chat with us on WhatsApp for instant support</p>
              <a 
                href={getWhatsAppUrl()}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Phone className="h-4 w-4" />
                +84 522122461
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-4">Response Time</h3>
            <p className="text-muted-foreground">
              We typically respond to all inquiries within 24-48 hours during business days. 
              For urgent matters, please reach out via WhatsApp for the fastest response.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ContactUs;
