import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Circle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";

import Footer from "@/components/Footer";

interface TestResult {
  id: string;
  test_name: string;
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  time_taken: number;
  subject_stats: any;
}

const Results = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const { data, error } = await supabase
        .from("test_results")
        .select("*")
        .eq("id", resultId)
        .single();

      if (error) throw error;
      setResult(data);
    } catch (error) {
      toast.error("Failed to load results");
      console.error(error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 75) return "text-success";
    if (percentage >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader />

      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-6xl flex-1">
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{result.test_name}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="text-center">
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-1 sm:mb-2 ${getPerformanceColor(result.percentage)}`}>
                  {result.percentage.toFixed(1)}%
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">Overall Score</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm sm:text-base">
                  <span>Marks Obtained</span>
                  <span className="font-semibold">{result.marks_obtained.toFixed(2)} / {result.max_marks}</span>
                </div>
                <Progress value={(result.marks_obtained / result.max_marks) * 100} className="h-2 sm:h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">{result.correct}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Correct</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">{result.incorrect}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Incorrect</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-lg bg-warning/10">
                  <Circle className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">{result.skipped}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Skipped</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Subject-wise Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(result.subject_stats || {}).map(([subject, stats]: [string, any]) => (
                <div key={subject}>
                  <div className="flex justify-between mb-1 sm:mb-2">
                    <span className="text-sm sm:text-base font-medium">{subject}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {stats.correct} / {stats.total}
                    </span>
                  </div>
                  <Progress value={(stats.correct / stats.total) * 100} className="h-1.5 sm:h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">Time Taken</span>
              </div>
              <p className="text-base sm:text-xl lg:text-2xl font-bold">{formatTime(result.time_taken || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">Attempted</span>
              </div>
              <p className="text-base sm:text-xl lg:text-2xl font-bold">{result.correct + result.incorrect} / {result.total}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button onClick={() => navigate(`/review/${resultId}`)} className="flex-1 text-sm sm:text-base">
            <FileText className="h-4 w-4 mr-2" />
            Review Answers
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="flex-1 text-sm sm:text-base">
            Back to Dashboard
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Results;
