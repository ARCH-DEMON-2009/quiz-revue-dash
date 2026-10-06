import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Phone, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ContactUs = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);

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

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { name: userName, email: userEmail, subject, message, website },
        timeout: 20_000,
      });
      if (error) throw error;

      toast.success("Your message was sent. We’ll reply by email.");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Contact message failed", error);
      toast.error("Could not send your message. Please try again or use WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col">
      <Helmet>
        <title>Contact & Support | Test Sagar — WhatsApp Assistance</title>
        <meta name="description" content="Need help with Test Sagar? Reach our support team on WhatsApp for account, payment, and TNC/JEE/NEET test-related queries. We are here to help." />
        <link rel="canonical" href="https://test.tncnursing.site/contact" />
        <meta property="og:title" content="Contact & Support | Test Sagar" />
        <meta property="og:description" content="Get instant help from the Test Sagar support team on WhatsApp for the best test taking experience." />
        <meta property="og:url" content="https://test.tncnursing.site/contact" />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/8e5rLwi05IUp3glqNPHnHEmvlvs2/social-images/social-1766994335179-thumbnail.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Contact Us",
            "description": "Support page for Test Sagar.",
            "url": "https://test.tncnursing.site/contact",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://test.tncnursing.site/"
              }, {
                "@type": "ListItem",
                "position": 2,
                "name": "Contact",
                "item": "https://test.tncnursing.site/contact"
              }]
            }
          })}
        </script>
      </Helmet>
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
                Support Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-1">WhatsApp Support</p>
                <a 
                  href={getWhatsAppUrl()}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  +84 522122461
                </a>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Email Support</p>
                <a href="mailto:support@shashanksv.com" className="text-primary hover:underline">
                  support@shashanksv.com
                </a>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Office Address</p>
                <p className="text-muted-foreground text-sm">Lucknow, Uttar Pradesh, India</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mx-auto mt-8 w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={userName}
                    onChange={(event) => setUserName(event.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={userEmail}
                    onChange={(event) => setUserEmail(event.target.value)}
                    maxLength={254}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  minLength={10}
                  maxLength={5000}
                  required
                />
              </div>
              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <Label htmlFor="contact-website">Website</Label>
                <Input
                  id="contact-website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending…" : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
