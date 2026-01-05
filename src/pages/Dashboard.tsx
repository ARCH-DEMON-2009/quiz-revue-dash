import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { User as SupabaseUser } from "@supabase/supabase-js";
import NavigationHeader from "@/components/NavigationHeader";
import FloatingBackground from "@/components/FloatingBackground";
import TelegramPopup from "@/components/TelegramPopup";
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
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    fetchTests();
  };
  const fetchTests = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("tests").select("*").eq("status", "active").order("stream", {
        ascending: true
      }).order("created_at", {
        ascending: false
      });
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
  const filteredTests = selectedClass ? tests.filter(test => test.stream === selectedClass) : [];
  if (!user) {
    return null;
  }
  return <div className="min-h-screen bg-background relative">
      <FloatingBackground />
      <NavigationHeader showFullNav />
      <TelegramPopup />

      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {!selectedClass ? <>
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2">Select Your Class</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Choose your class to view available tests</p>
            </div>

            {loading ? <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                {[...Array(6)].map((_, i) => <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="space-y-3">
                        <div className="h-6 sm:h-8 bg-muted rounded animate-pulse" />
                        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                    </CardContent>
                  </Card>)}
              </div> : availableClasses.length === 0 ? <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No classes available</p>
                </CardContent>
              </Card> : <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                {availableClasses.map(className => {
            const classTests = tests.filter(t => t.stream === className);
            return <Card key={className} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => setSelectedClass(className)}>
                      <CardHeader className="pb-2 sm:pb-4 p-3 sm:p-4 lg:p-6">
                        <CardTitle className="text-lg sm:text-xl lg:text-2xl">{className}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Click to view tests</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-sm sm:text-base lg:text-lg font-semibold">{classTests.length} Tests</span>
                        </div>
                      </CardContent>
                    </Card>;
          })}
              </div>}
          </> : <>
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <Button variant="ghost" onClick={() => setSelectedClass(null)} className="mb-2 sm:mb-4 -ml-2 sm:-ml-4">
                ← Back to Classes
              </Button>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold">{selectedClass}</h2>
                <Badge variant="outline" className="text-xs sm:text-sm">{filteredTests.length} tests</Badge>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Select a test to begin</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {filteredTests.map(test => <Card key={test.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="p-3 sm:p-4 lg:p-6">
                    <CardTitle className="text-base sm:text-lg lg:text-xl">{test.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">{test.description || "Test your knowledge"}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{test.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{test.total_questions} questions</span>
                      </div>
                    </div>
                    <Button className="w-full text-sm sm:text-base" onClick={() => navigate(`/quiz/${test.id}`)}>
                      Start Test
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
          </>}
      </main>
    </div>;
};
export default Dashboard;