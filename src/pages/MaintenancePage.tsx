import { Wrench, Clock, Mail } from "lucide-react";
import FloatingBackground from "@/components/FloatingBackground";

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center relative overflow-hidden">
      <FloatingBackground />
      
      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* Maintenance Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-6 animate-pulse">
            <Wrench className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Message */}
        <div className="glass rounded-2xl p-8 mb-8 shadow-glow">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">
            Under Maintenance
          </h1>
          
          <p className="text-lg text-muted-foreground mb-6">
            We're currently performing scheduled maintenance to improve your experience. 
            Please check back soon!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>We'll be back shortly</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a 
                href="mailto:support@testsagar.com" 
                className="hover:text-primary transition-colors"
              >
                support@testsagar.com
              </a>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 opacity-70">
          <img 
            src="/logo.png" 
            alt="Test Sagar Logo" 
            className="h-10 w-10 object-contain rounded-xl"
          />
          <span className="text-xl font-bold text-gradient">Test Sagar</span>
        </div>

        {/* Decorative elements */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse delay-100" />
          <div className="w-2 h-2 rounded-full bg-primary/80 animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
