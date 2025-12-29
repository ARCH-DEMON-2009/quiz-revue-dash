import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, User, BookOpen, BarChart, Trophy, LogOut, Crown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useAccessStatus } from "@/components/AccessGuard";

interface Test {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  stream: string;
  category: string;
}

const Dashboard = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const navigate = useNavigate();
  const { accessStatus, loading: accessLoading } = useAccessStatus();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setUser(user);
    fetchTests();
  };

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("status", "active")
        .order("stream", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      toast.error("Failed to load tests");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const availableClasses = Array.from(new Set(tests.map(test => test.stream)));
  const filteredTests = selectedClass 
    ? tests.filter(test => test.stream === selectedClass)
    : [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  const hasAccess = accessStatus?.hasAccess;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Test Sagar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")}>
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")}>
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Access Status Banner */}
      {accessStatus && !accessLoading && (
        <div className={`border-b ${!hasAccess ? 'bg-destructive/10' : accessStatus.type === 'trial' ? 'bg-warning/10' : 'bg-primary/10'}`}>
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!hasAccess ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Trial expired - Contact admin to buy premium
                  </span>
                </>
              ) : accessStatus.type === 'trial' ? (
                <>
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="text-sm font-medium">
                    Free Trial: {accessStatus.daysLeft} day{accessStatus.daysLeft !== 1 ? 's' : ''} left
                  </span>
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">
                    Premium Active: {accessStatus.daysLeft} days left
                  </span>
                </>
              )}
            </div>
            {!hasAccess && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open("https://t.me/TestSagarHelpRobot", "_blank")}
                >
                  Help Bot
                </Button>
                <Button 
                  size="sm"
                  onClick={() => window.open("https://t.me/Its_trms", "_blank")}
                >
                  Contact Admin
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {!selectedClass ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Select Your Class</h2>
              <p className="text-muted-foreground">Choose your class to view available tests</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-8">
                      <div className="space-y-3">
                        <div className="h-8 bg-muted rounded animate-pulse" />
                        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : availableClasses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No classes available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableClasses.map((className) => {
                  const classTests = tests.filter(t => t.stream === className);
                  return (
                    <Card 
                      key={className} 
                      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                      onClick={() => setSelectedClass(className)}
                    >
                      <CardHeader>
                        <CardTitle className="text-2xl">{className}</CardTitle>
                        <CardDescription>Click to view available tests</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-5 w-5" />
                          <span className="text-lg font-semibold">{classTests.length} Tests Available</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedClass(null)}
                className="mb-4"
              >
                ← Back to Classes
              </Button>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">{selectedClass}</h2>
                <Badge variant="outline">{filteredTests.length} tests</Badge>
              </div>
              <p className="text-muted-foreground mt-2">Select a test to begin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => (
                <Card key={test.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="text-xl">{test.name}</CardTitle>
                    <CardDescription>{test.description || "Test your knowledge"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{test.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{test.total_questions} questions</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/quiz/${test.id}`)}
                      disabled={!hasAccess}
                    >
                      {hasAccess ? 'Start Test' : 'Access Required'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
