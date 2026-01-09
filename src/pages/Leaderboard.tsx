import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  average_score: number;
  total_tests: number;
  overall_accuracy: number;
  rank_percentile: number;
  global_rank: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

      const leaderboardData: LeaderboardEntry[] = (data || []).map((entry: any) => ({
        user_id: entry.user_id,
        name: entry.name || 'Student',
        average_score: Number(entry.average_score) || 0,
        total_tests: Number(entry.total_tests) || 0,
        overall_accuracy: Number(entry.overall_accuracy) || 0,
        rank_percentile: Number(entry.rank_percentile) || 0,
        global_rank: Number(entry.global_rank) || 0
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <NavigationHeader />
      <div className="p-4 md:p-8">
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
                      
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {entry.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">{entry.name}</p>
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
                        
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {currentUserEntry.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <p className="font-semibold text-sm sm:text-base truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">{currentUserEntry.name}</p>
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
    </div>
  );
};

export default Leaderboard;
