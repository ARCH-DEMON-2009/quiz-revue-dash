import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  average_score: number;
  total_tests: number;
  overall_accuracy: number;
  rank_percentile: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    try {
      // Use the security definer function to get leaderboard data
      const { data, error } = await supabase.rpc('get_leaderboard_data');

      if (error) throw error;

      const leaderboardData: LeaderboardEntry[] = (data || []).map((entry: any) => ({
        user_id: entry.user_id,
        name: entry.name || 'Unknown User',
        average_score: Number(entry.average_score) || 0,
        total_tests: Number(entry.total_tests) || 0,
        overall_accuracy: Number(entry.overall_accuracy) || 0,
        rank_percentile: Number(entry.rank_percentile) || 0
      }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (index === 2) return "bg-gradient-to-r from-orange-400 to-orange-600";
    return "bg-muted";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading leaderboard...</div>
      </div>
    );
  }

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
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data available yet</p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    index < 3 ? getRankBadge(index) + " shadow-lg" : "bg-card hover:bg-accent/5"
                  }`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background/50">
                    {getRankIcon(index) || (
                      <span className="font-bold text-lg">{index + 1}</span>
                    )}
                  </div>

                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {entry.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${index < 3 ? "text-white" : ""}`}>
                      {entry.name}
                    </p>
                    <p className={`text-sm ${index < 3 ? "text-white/80" : "text-muted-foreground"}`}>
                      {entry.total_tests} tests • {entry.overall_accuracy.toFixed(1)}% accuracy
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`text-xl font-bold ${index < 3 ? "text-white" : "text-primary"}`}>
                      {entry.average_score.toFixed(1)}%
                    </p>
                    <Badge variant={index < 3 ? "secondary" : "outline"} className="mt-1">
                      {entry.rank_percentile.toFixed(1)}th percentile
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
