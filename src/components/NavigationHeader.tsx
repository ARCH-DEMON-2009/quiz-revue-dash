import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Trophy, User, Sparkles, Shield, Crown, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { toast } from "sonner";

interface NavigationHeaderProps {
  showFullNav?: boolean;
}

const NavigationHeader = ({ showFullNav = false }: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isPremium } = usePremiumStatus();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: adminData } = await supabase.rpc('is_admin');
      setIsAdmin(adminData === true);
    };
    checkAdmin();
  }, []);

  const handleAIQuiz = () => {
    window.open("https://shashank-quiz-maker.vercel.app/", "_blank");
  };

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/")}
        >
          <img 
            src="/logo.png" 
            alt="Test Sagar Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-xl shadow-md"
          />
          <div className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Test Sagar
          </div>
          {isPremium && (
            <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-md">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
        
        {showFullNav && (
          <div className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/admin")} 
                className="hidden sm:flex bg-gradient-to-r from-destructive/10 to-primary/10 border-destructive/30 hover:border-destructive hover:bg-destructive/20 transition-all"
              >
                <Shield className="h-4 w-4 mr-2 text-destructive" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAIQuiz} 
              className="hidden sm:flex bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:border-primary hover:bg-primary/20 transition-all"
            >
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
              <span className="hidden md:inline">Make Quiz with AI</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="hidden sm:flex">
              <BarChart className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Analytics</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="hidden sm:flex">
              <Trophy className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Leaderboard</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} aria-label="Profile">
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Mobile bottom nav */}
      {showFullNav && (
        <div className="sm:hidden flex justify-around border-t border-border/50 py-2 bg-card/80 backdrop-blur-xl">
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="flex-col h-auto py-1">
              <Shield className="h-4 w-4 text-destructive" />
              <span className="text-xs">Admin</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleAIQuiz} className="flex-col h-auto py-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs">AI Quiz</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="flex-col h-auto py-1">
            <BarChart className="h-4 w-4" />
            <span className="text-xs">Analytics</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="flex-col h-auto py-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs">Ranks</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="flex-col h-auto py-1">
            <User className="h-4 w-4" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default NavigationHeader;
