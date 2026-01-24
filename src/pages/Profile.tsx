import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Award, HelpCircle, Crown, Tv, LogOut } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { AdBanner, InlineAd } from "@/components/ads";
import { Link } from "react-router-dom";

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

interface AccessStatus {
  type: 'premium' | 'free';
  daysLeft: number;
  expiryDate: string | null;
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
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);

  useEffect(() => {
    fetchProfileData();
    checkAccessStatus();
  }, []);

  const checkAccessStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check premium status
      const { data: premium } = await supabase
        .from("premium_users")
        .select("expiry_date, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (premium && new Date(premium.expiry_date) > new Date()) {
        const daysLeft = Math.ceil((new Date(premium.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        setAccessStatus({
          type: 'premium',
          daysLeft,
          expiryDate: premium.expiry_date
        });
        return;
      }

      // No premium - user has free access with ads
      setAccessStatus({
        type: 'free',
        daysLeft: 0,
        expiryDate: null
      });
    } catch (error) {
      console.error("Error checking access status:", error);
    }
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader />
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-2 flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open("https://t.me/TestSagarHelpRobot", "_blank")}
          >
            <HelpCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Help & Support</span>
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl flex-1">
        {/* Access Status Card */}
        {accessStatus && (
          <Card className={`mb-4 sm:mb-6 lg:mb-8 ${accessStatus.type === 'premium' ? 'border-primary' : 'border-muted-foreground/30'}`}>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  {accessStatus.type === 'premium' ? (
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                  ) : (
                    <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold">
                        {accessStatus.type === 'premium' ? 'Premium Active' : 'Free Plan (with Ads)'}
                      </h3>
                      <Badge variant={accessStatus.type === 'premium' ? 'default' : 'secondary'} className="text-xs">
                        {accessStatus.type === 'premium' ? `${accessStatus.daysLeft} days left` : 'Ad-Supported'}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {accessStatus.type === 'premium' 
                        ? `Expires: ${new Date(accessStatus.expiryDate!).toLocaleDateString()}`
                        : 'Upgrade to Premium for an ad-free experience'}
                    </p>
                  </div>
                </div>
                {accessStatus.type === 'free' && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                    <Link to="/pricing">
                      <Button size="sm" className="w-full sm:w-auto gap-2">
                        <Crown className="h-4 w-4" />
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ad Banner for free users */}
        <AdBanner position="inline" className="mb-4 sm:mb-6" />

        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Your Performance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your progress and achievements</p>
        </div>

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Loading profile...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              <Card>
                <CardContent className="p-3 sm:p-4 lg:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.overallAccuracy.toFixed(1)}%</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-success/10">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.totalTests}</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Tests Taken</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-warning/10">
                      <Award className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.averageScore.toFixed(1)}%</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-4 sm:space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm sm:text-base font-medium">Physics</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stats.physicsAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.physicsAccuracy} className="h-2 sm:h-3" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm sm:text-base font-medium">Chemistry</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stats.chemistryAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.chemistryAccuracy} className="h-2 sm:h-3" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm sm:text-base font-medium">Mathematics</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stats.mathsAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.mathsAccuracy} className="h-2 sm:h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Inline Ad between sections */}
            <InlineAd className="my-4 sm:my-6" />

            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Recent Tests</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                {recentTests.length === 0 ? (
                  <p className="text-center text-sm sm:text-base text-muted-foreground py-6 sm:py-8">No tests taken yet</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {recentTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer gap-3"
                        onClick={() => navigate(`/results/${test.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base mb-1 truncate">{test.test_name}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span>{test.correct}/{test.total} correct</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{test.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-lg sm:text-2xl font-bold ${
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

      <Footer />
    </div>
  );
};

export default Profile;
