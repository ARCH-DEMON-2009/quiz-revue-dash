import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Award, ChevronLeft, Clock } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalTests: number;
  averageScore: number;
  overallAccuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  physicsAccuracy: number;
  chemistryAccuracy: number;
  mathsAccuracy: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    averageScore: 0,
    overallAccuracy: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    physicsAccuracy: 0,
    chemistryAccuracy: 0,
    mathsAccuracy: 0,
  });
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: results, error } = await supabase
        .from("test_results")
        .select("*")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      if (results && results.length > 0) {
        const totalTests = results.length;
        const avgScore = results.reduce((acc, r) => acc + r.percentage, 0) / totalTests;
        const totalQ = results.reduce((acc, r) => acc + r.total, 0);
        const correctQ = results.reduce((acc, r) => acc + r.correct, 0);
        const accuracy = totalQ > 0 ? (correctQ / totalQ) * 100 : 0;

        let physicsCorrect = 0, physicsTotal = 0;
        let chemistryCorrect = 0, chemistryTotal = 0;
        let mathsCorrect = 0, mathsTotal = 0;

        results.forEach(r => {
          const subStats = r.subject_stats as any || {};
          if (subStats.Physics) {
            physicsCorrect += subStats.Physics.correct || 0;
            physicsTotal += subStats.Physics.total || 0;
          }
          if (subStats.Chemistry) {
            chemistryCorrect += subStats.Chemistry.correct || 0;
            chemistryTotal += subStats.Chemistry.total || 0;
          }
          if (subStats.Maths || subStats.Mathematics) {
            const mathStats = subStats.Maths || subStats.Mathematics;
            mathsCorrect += mathStats.correct || 0;
            mathsTotal += mathStats.total || 0;
          }
        });

        setStats({
          totalTests,
          averageScore: avgScore,
          overallAccuracy: accuracy,
          totalQuestions: totalQ,
          correctAnswers: correctQ,
          physicsAccuracy: physicsTotal > 0 ? (physicsCorrect / physicsTotal) * 100 : 0,
          chemistryAccuracy: chemistryTotal > 0 ? (chemistryCorrect / chemistryTotal) * 100 : 0,
          mathsAccuracy: mathsTotal > 0 ? (mathsCorrect / mathsTotal) * 100 : 0,
        });

        setRecentTests(results.slice(0, 5));
      }
    } catch (error) {
      toast.error("Failed to load profile data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Performance</h1>
          <p className="text-muted-foreground">Track your progress and achievements</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{stats.overallAccuracy.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-success/10">
                      <Target className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{stats.totalTests}</div>
                      <p className="text-sm text-muted-foreground">Tests Taken</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-warning/10">
                      <Award className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{stats.averageScore.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Physics</span>
                    <span className="text-sm text-muted-foreground">{stats.physicsAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.physicsAccuracy} className="h-3" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Chemistry</span>
                    <span className="text-sm text-muted-foreground">{stats.chemistryAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.chemistryAccuracy} className="h-3" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Mathematics</span>
                    <span className="text-sm text-muted-foreground">{stats.mathsAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.mathsAccuracy} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Tests</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No tests taken yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/results/${test.id}`)}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{test.test_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{test.correct}/{test.total} correct</span>
                            <span>•</span>
                            <span>{test.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            test.percentage >= 75 ? "text-success" :
                            test.percentage >= 50 ? "text-warning" : "text-destructive"
                          }`}>
                            {test.percentage.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
