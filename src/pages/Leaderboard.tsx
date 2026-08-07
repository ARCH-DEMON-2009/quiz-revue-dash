import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, Crown, Shield } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  average_score: number;
  total_tests: number;
  overall_accuracy: number;
  rank_percentile: number;
  global_rank: number;
  is_premium?: boolean;
  plan_duration_type?: string;
  is_admin?: boolean;
}

const AvatarImageWithProfile = ({ userId, fallback }: { userId: string, fallback: string }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching avatar for user:", userId, error);
          return;
        }
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (e) {
        console.error("Failed to fetch avatar:", e);
      }
    };
    fetchAvatar();
  }, [userId]);

  return (
    <>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
        {fallback}
      </AvatarFallback>
    </>
  );
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { 
    config,
    getAdminFrameStyles, 
    getAdminAvatarBorder, 
    getAdminBadgeIcon, 
    getAdminNameColor 
  } = useAdminBadgeConfig();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please login to view leaderboard");
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);
    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_data');

      if (error) throw error;

      // Fetch premium status and admin status for these users
      const userIds = (data || []).map((e: any) => e.user_id);
      
      const [premiumResponse, adminResponse] = await Promise.all([
        supabase
          .from('premium_users')
          .select('user_id, plan_duration_type')
          .in('user_id', userIds)
          .eq('status', 'active')
          .gt('expiry_date', new Date().toISOString()),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('role', 'admin')
      ]);

      const premiumMap = new Map(premiumResponse.data?.map(p => [p.user_id, p.plan_duration_type || 'standard']) || []);
      const adminSet = new Set(adminResponse.data?.map(a => a.user_id) || []);

      const leaderboardData: LeaderboardEntry[] = (data || []).map((entry: any) => ({
        user_id: entry.user_id,
        name: entry.name || 'Student',
        average_score: Number(entry.average_score) || 0,
        total_tests: Number(entry.total_tests) || 0,
        overall_accuracy: Number(entry.overall_accuracy) || 0,
        rank_percentile: Number(entry.rank_percentile) || 0,
        global_rank: Number(entry.global_rank) || 0,
        is_premium: premiumMap.has(entry.user_id),
        plan_duration_type: premiumMap.get(entry.user_id),
        is_admin: adminSet.has(entry.user_id)
      }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600";
    return "bg-card";
  };

  const isCurrentUser = (userId: string) => currentUserId === userId;

  const getNameColor = (entry: LeaderboardEntry) => {
    if (entry.is_admin) return getAdminNameColor(true);
    if (!entry.is_premium) return "text-foreground";
    // Different colors based on plan
    if (entry.plan_duration_type === 'yearly' || entry.plan_duration_type === '12_months' || entry.plan_duration_type === '2years') return "text-amber-500 font-bold drop-shadow-sm";
    if (entry.plan_duration_type === '6_months') return "text-blue-500 font-bold drop-shadow-sm";
    return "text-emerald-500 font-bold drop-shadow-sm";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading leaderboard...</div>
      </div>
    );
  }

  // Separate current user if they're outside top 50
  const top50 = leaderboard.filter(e => e.global_rank <= 50);
  const currentUserEntry = leaderboard.find(e => e.user_id === currentUserId && e.global_rank > 50);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex flex-col">
      <Helmet>
        <title>All-India Leaderboard & Rankings | Test Sagar — JEE, NEET & TNC</title>
        <meta name="description" content="See where you rank on the Test Sagar all-India leaderboard. Live rankings by average score, accuracy and tests taken for JEE, NEET, and TNC nursing exams." />
        <link rel="canonical" href="https://test.shashanksv.com/leaderboard" />
        <meta property="og:title" content="All-India Leaderboard & Rankings | Test Sagar" />
        <meta property="og:description" content="Live all-India rankings by average score and accuracy. Compete with students across India on the best test taking site." />
        <meta property="og:url" content="https://test.shashanksv.com/leaderboard" />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/8e5rLwi05IUp3glqNPHnHEmvlvs2/social-images/social-1766994335179-thumbnail.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "All-India Leaderboard",
            "description": "Rankings of students on Test Sagar.",
            "url": "https://test.shashanksv.com/leaderboard",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://test.shashanksv.com/"
              }, {
                "@type": "ListItem",
                "position": 2,
                "name": "Leaderboard",
                "item": "https://test.shashanksv.com/leaderboard"
              }]
            }
          })}
        </script>
      </Helmet>
      <NavigationHeader />
      <div className="p-4 md:p-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">Top performers across all tests</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top 50 Students
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {top50.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data available yet</p>
              ) : (
                <>
                  {top50.map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                        isCurrentUser(entry.user_id) 
                          ? "ring-2 ring-primary bg-primary/10 shadow-lg" 
                          : entry.global_rank <= 3 
                            ? getRankBadge(entry.global_rank) + " shadow-lg" 
                            : "bg-card hover:bg-accent/5"
                      }`}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background/50">
                        {getRankIcon(entry.global_rank) || (
                          <span className="font-bold text-lg">{entry.global_rank}</span>
                        )}
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -inset-0 z-0 pointer-events-none">
                          {entry.is_admin ? (
                            ['f1', 'f2', 'f3'].includes(config.frame_type) ? (
                              <img src={`/frames/${config.frame_type}.png`} alt="Admin Frame" className="absolute -inset-[15%] w-[130%] h-[130%] object-contain" />
                            ) : (
                              <div className={getAdminFrameStyles(true) || ""} />
                            )
                          ) : entry.is_premium ? (
                            <img src="/frames/f1.png" alt="Premium Frame" className="absolute -inset-[15%] w-[130%] h-[130%] object-contain" />
                          ) : null}
                        </div>
                        
                        <Avatar className={`h-10 w-10 relative bg-background border-2 overflow-hidden ${entry.is_admin && !['f1', 'f2', 'f3'].includes(config.frame_type) ? getAdminAvatarBorder(true) : 'border-transparent'}`}>
                          {entry.user_id ? (
                            <AvatarImageWithProfile userId={entry.user_id} fallback={entry.name.charAt(0).toUpperCase()} />
                          ) : (
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                              {entry.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        {entry.is_admin ? (
                          <div className="absolute -top-3.5 -right-3.5 w-10 h-10 z-10 animate-pulse">
                            {['b1', 'b2', 'b3'].includes(getAdminBadgeIcon(true) || "") ? (
                              <img src={`/badges/${getAdminBadgeIcon(true)}.png`} alt="Admin Badge" className="w-full h-full object-contain" />
                            ) : getAdminBadgeIcon(true) === 'shield' ? (
                              <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                                <Shield className="h-4 w-4 text-white fill-white" />
                              </div>
                            ) : getAdminBadgeIcon(true) === 'crown' ? (
                              <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                                <Crown className="h-4 w-4 text-white fill-white" />
                              </div>
                            ) : (
                              <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                                <Star className="h-4 w-4 text-white fill-white" />
                              </div>
                            )}
                          </div>
                        ) : entry.is_premium ? (
                          <div className="absolute -top-3 -right-3 z-10">
                            <img src="/badges/b1.png" alt="Premium Badge" className="w-8 h-8 object-contain" />
                          </div>
                        ) : null}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <p className={`font-semibold text-sm sm:text-base truncate max-w-[100px] sm:max-w-[150px] md:max-w-none ${getNameColor(entry)}`}>
                            {entry.name}
                          </p>
                          {entry.is_premium && (
                            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          {isCurrentUser(entry.user_id) && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/20 text-primary shrink-0">
                              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {entry.total_tests} tests • {entry.overall_accuracy.toFixed(1)}%
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg">{entry.average_score.toFixed(1)}%</p>
                        <Badge variant="outline" className="text-xs">
                          Top {(100 - entry.rank_percentile).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Show current user's rank if outside top 50 */}
                  {currentUserEntry && (
                    <>
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                        <span className="text-sm text-muted-foreground">Your Position</span>
                        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                      </div>
                      <div
                        className="flex items-center gap-4 p-4 rounded-lg ring-2 ring-primary bg-primary/10 shadow-lg"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background/50">
                          <span className="font-bold text-lg">{currentUserEntry.global_rank}</span>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute -inset-0 z-0 pointer-events-none">
                            {currentUserEntry.is_admin ? (
                              ['f1', 'f2', 'f3'].includes(config.frame_type) ? (
                                <img src={`/frames/${config.frame_type}.png`} alt="Admin Frame" className="absolute -inset-[15%] w-[130%] h-[130%] object-contain" />
                              ) : (
                                <div className={getAdminFrameStyles(true) || ""} />
                              )
                            ) : currentUserEntry.is_premium ? (
                              <img src="/frames/f1.png" alt="Premium Frame" className="absolute -inset-[15%] w-[130%] h-[130%] object-contain" />
                            ) : null}
                          </div>

                          <Avatar className={`h-10 w-10 relative bg-background border-2 overflow-hidden ${currentUserEntry.is_admin && !['f1', 'f2', 'f3'].includes(config.frame_type) ? getAdminAvatarBorder(true) : 'border-transparent'}`}>
                            {currentUserEntry.user_id ? (
                              <AvatarImageWithProfile userId={currentUserEntry.user_id} fallback={currentUserEntry.name.charAt(0).toUpperCase()} />
                            ) : (
                              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                {currentUserEntry.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          {currentUserEntry.is_admin ? (
                            <div className="absolute -top-3.5 -right-3.5 w-10 h-10 z-10 animate-pulse">
                              {['b1', 'b2', 'b3'].includes(getAdminBadgeIcon(true) || "") ? (
                                <img src={`/badges/${getAdminBadgeIcon(true)}.png`} alt="Admin Badge" className="w-full h-full object-contain" />
                              ) : getAdminBadgeIcon(true) === 'shield' ? (
                                <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                                  <Shield className="h-4 w-4 text-white fill-white" />
                                </div>
                              ) : getAdminBadgeIcon(true) === 'crown' ? (
                                <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                                  <Crown className="h-4 w-4 text-white fill-white" />
                                </div>
                              ) : (
                                <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                                  <Star className="h-4 w-4 text-white fill-white" />
                                </div>
                              )}
                            </div>
                          ) : currentUserEntry.is_premium ? (
                            <div className="absolute -top-2 -right-2 z-10">
                              <img src="/badges/b3.png" alt="Premium Badge" className="w-6 h-6 object-contain" />
                            </div>
                          ) : null}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <p className={`font-semibold text-sm sm:text-base truncate max-w-[100px] sm:max-w-[150px] md:max-w-none ${getNameColor(currentUserEntry)}`}>
                              {currentUserEntry.name}
                            </p>
                            {currentUserEntry.is_premium && (
                              <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/20 text-primary shrink-0">
                              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              You
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {currentUserEntry.total_tests} tests • {currentUserEntry.overall_accuracy.toFixed(1)}%
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-lg">{currentUserEntry.average_score.toFixed(1)}%</p>
                          <Badge variant="outline" className="text-xs">
                            Top {(100 - currentUserEntry.rank_percentile).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Leaderboard;
