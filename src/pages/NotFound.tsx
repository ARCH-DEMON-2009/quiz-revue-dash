import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import FloatingBackground from "@/components/FloatingBackground";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center relative overflow-hidden">
      <FloatingBackground />
      
      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* 404 Number with gradient */}
        <div className="mb-8">
          <h1 className="text-[150px] md:text-[200px] font-bold leading-none text-gradient drop-shadow-2xl">
            404
          </h1>
        </div>

        {/* Error message */}
        <div className="glass rounded-2xl p-8 mb-8 shadow-glow">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-foreground">
            Page Not Found
          </h2>
          
          <p className="text-muted-foreground text-lg mb-2">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          
          <p className="text-sm text-muted-foreground/70">
            Requested: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => navigate("/")} 
            size="lg"
            className="gap-2 shadow-glow-sm"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse delay-100" />
          <div className="w-2 h-2 rounded-full bg-primary/80 animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
};

export default NotFound;
