import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Trophy, User, Sparkles, Shield, Crown, Target, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";

interface NavigationHeaderProps {
  showFullNav?: boolean;
}

const NavigationHeader = ({ showFullNav = false }: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { isPremium } = usePremiumStatus();
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { config, getAdminFrameStyles, getAdminAvatarBorder, getAdminBadgeIcon } = useAdminBadgeConfig();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: adminData } = await supabase.rpc('is_admin');
      setIsAdmin(adminData === true);
      
      if (user.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleAIQuiz = () => {
    toast.info("AI quiz making is temporarily disabled.");
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
              onClick={() => navigate("/tnc-tests")} 
              className="bg-gradient-to-r from-emerald-500/15 to-primary/15 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/20 transition-all font-semibold"
            >
              <Target className="h-4 w-4 mr-1 sm:mr-2 text-emerald-600" />
              <span className="hidden xs:inline sm:inline">TNC Tests</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/rwa-study")} 
              className="bg-gradient-to-r from-blue-500/15 to-primary/15 border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/20 transition-all font-semibold"
            >
              <BookOpen className="h-4 w-4 mr-1 sm:mr-2 text-blue-600" />
              <span className="hidden xs:inline sm:inline">Study Vault</span>

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} aria-label="Profile" className="gap-2 relative min-w-[40px] px-2">
              {loading ? (
                <Skeleton className="h-6 w-6 rounded-full" />
              ) : avatarUrl ? (
                <div className="relative flex items-center gap-2">
                  <div className={`relative h-7 w-7 rounded-full border border-primary/10 overflow-hidden bg-muted aspect-square shadow-sm`}>
                    {!imgLoaded && <Skeleton className="absolute inset-0 h-full w-full rounded-full" />}
                    <img 
                      src={avatarUrl} 
                      alt="User" 
                      className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImgLoaded(true)}
                    />
                  </div>
                  <span className="hidden sm:inline font-medium text-sm">Profile</span>
                </div>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </>
              )}
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/tnc-tests")} className="flex-col h-auto py-1">
            <Target className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold">TNC</span>
          </Button>
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="flex-col h-auto py-1 min-w-[40px]">
            {loading ? (
              <Skeleton className="h-6 w-6 rounded-full mb-1" />
            ) : avatarUrl ? (
              <div className="relative h-6 w-6 rounded-full border border-primary/20 overflow-hidden bg-muted aspect-square mb-1">
                {!imgLoaded && <Skeleton className="absolute inset-0 h-full w-full rounded-full" />}
                <img 
                  src={avatarUrl} 
                  alt="User" 
                  className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)}
                />
              </div>
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default NavigationHeader;
