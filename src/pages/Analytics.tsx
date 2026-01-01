import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, TrendingUp, Award, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";

interface Analytics {
  total_tests: number;
  total_questions: number;
  total_correct: number;
  average_score: number;
  overall_accuracy: number;
  physics_accuracy: number;
  chemistry_accuracy: number;
  maths_accuracy: number;
  study_time_hours: number;
  rank_percentile: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please login to view analytics");
      navigate("/auth");
      return;
    }

    fetchAnalytics(user.id);
  };

  const fetchAnalytics = async (userId: string) => {
    try {
      // Fetch test results to calculate analytics
      const { data: results, error: resultsError } = await supabase
        .from("test_results")
        .select("*")
        .eq("user_id", userId);

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        setAnalytics(null);
        setLoading(false);
        return;
      }

      // Calculate analytics from results
      const totalTests = results.length;
      const totalQuestions = results.reduce((sum, r) => sum + (r.total || 0), 0);
      const totalCorrect = results.reduce((sum, r) => sum + (r.correct || 0), 0);
      const averageScore = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalTests;
      const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      // Calculate subject-wise accuracy
      let physicsCorrect = 0, physicsTotal = 0;
      let chemistryCorrect = 0, chemistryTotal = 0;
      let mathsCorrect = 0, mathsTotal = 0;

      results.forEach(result => {
        const subjectStats = result.subject_stats as any;
        if (subjectStats) {
          if (subjectStats.Physics) {
            physicsCorrect += subjectStats.Physics.correct || 0;
            physicsTotal += subjectStats.Physics.total || 0;
          }
          if (subjectStats.Chemistry) {
            chemistryCorrect += subjectStats.Chemistry.correct || 0;
            chemistryTotal += subjectStats.Chemistry.total || 0;
          }
          if (subjectStats.Mathematics) {
            mathsCorrect += subjectStats.Mathematics.correct || 0;
            mathsTotal += subjectStats.Mathematics.total || 0;
          }
        }
      });

      const physicsAccuracy = physicsTotal > 0 ? (physicsCorrect / physicsTotal) * 100 : 0;
      const chemistryAccuracy = chemistryTotal > 0 ? (chemistryCorrect / chemistryTotal) * 100 : 0;
      const mathsAccuracy = mathsTotal > 0 ? (mathsCorrect / mathsTotal) * 100 : 0;

      // Calculate study time (sum of time_taken in minutes, convert to hours)
      const studyTimeHours = Math.floor(
        results.reduce((sum, r) => sum + (r.time_taken || 0), 0) / 60
      );

      setAnalytics({
        total_tests: totalTests,
        total_questions: totalQuestions,
        total_correct: totalCorrect,
        average_score: averageScore,
        overall_accuracy: overallAccuracy,
        physics_accuracy: physicsAccuracy,
        chemistry_accuracy: chemistryAccuracy,
        maths_accuracy: mathsAccuracy,
        study_time_hours: studyTimeHours,
        rank_percentile: 0 // This would need a separate calculation based on all users
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>No analytics data available yet.</p>
        <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
      </div>
    );
  }

  const subjects = [
    { name: "Physics", accuracy: analytics.physics_accuracy, color: "bg-blue-500" },
    { name: "Chemistry", accuracy: analytics.chemistry_accuracy, color: "bg-green-500" },
    { name: "Mathematics", accuracy: analytics.maths_accuracy, color: "bg-purple-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <NavigationHeader />
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Performance Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Track your progress and insights</p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart className="h-4 w-4 text-primary" />
                Tests Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{analytics.total_tests}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{analytics.average_score.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-warning" />
                Rank Percentile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{analytics.rank_percentile.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Study Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{analytics.study_time_hours}h</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {subjects.map((subject) => (
              <div key={subject.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{subject.name}</span>
                  <span className="text-sm text-muted-foreground">{subject.accuracy.toFixed(1)}%</span>
                </div>
                <Progress value={subject.accuracy} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall Statistics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Questions Attempted</p>
              <p className="text-2xl font-bold">{analytics.total_questions}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Correct Answers</p>
              <p className="text-2xl font-bold text-success">{analytics.total_correct}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overall Accuracy</p>
              <p className="text-2xl font-bold text-primary">{analytics.overall_accuracy.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
};

export default Analytics;
