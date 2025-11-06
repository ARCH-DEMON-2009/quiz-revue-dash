import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
      // Fetch all users' test results
      const { data: allResults, error: resultsError } = await supabase
        .from("test_results")
        .select(`
          user_id,
          percentage,
          correct,
          total,
          user_profiles!inner(name)
        `);

      if (resultsError) throw resultsError;

      if (!allResults || allResults.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Group by user_id and calculate stats
      const userStatsMap = new Map<string, {
        name: string;
        totalTests: number;
        totalScore: number;
        totalCorrect: number;
        totalQuestions: number;
      }>();

      allResults.forEach((result: any) => {
        const userId = result.user_id;
        const existing = userStatsMap.get(userId) || {
          name: result.user_profiles?.name || "Unknown User",
          totalTests: 0,
          totalScore: 0,
          totalCorrect: 0,
          totalQuestions: 0
        };

        existing.totalTests += 1;
        existing.totalScore += result.percentage || 0;
        existing.totalCorrect += result.correct || 0;
        existing.totalQuestions += result.total || 0;

        userStatsMap.set(userId, existing);
      });

      // Convert to array and calculate averages
      const leaderboardData = Array.from(userStatsMap.entries()).map(([userId, stats]) => ({
        user_id: userId,
        name: stats.name,
        average_score: stats.totalTests > 0 ? stats.totalScore / stats.totalTests : 0,
        total_tests: stats.totalTests,
        overall_accuracy: stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0,
        rank_percentile: 0 // Will be calculated after sorting
      }));

      // Sort by average score
      leaderboardData.sort((a, b) => b.average_score - a.average_score);

      // Calculate percentiles
      const totalUsers = leaderboardData.length;
      leaderboardData.forEach((entry, index) => {
        entry.rank_percentile = totalUsers > 0 ? ((totalUsers - index) / totalUsers) * 100 : 0;
      });

      setLeaderboard(leaderboardData.slice(0, 50));
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">Top performers across all tests</p>
          </div>
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
  );
};

export default Leaderboard;
