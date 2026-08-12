import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Award, Target, ChevronLeft, Layout } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";

interface ComparisonData {
  date: string;
  accuracy: number;
  rank: number | null;
  testName: string;
  category: string;
}

const AttemptComparison = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // 1. Fetch standard test results
      const { data: standardResults, error: standardError } = await supabase
        .from("test_results")
        .select("created_at, percentage, test_name, tests(stream, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (standardError) throw standardError;

      // 2. Fetch TNC results (quiz_attempts table)
      const { data: tncResults, error: tncError } = await supabase
        .from("quiz_attempts")
        .select("submitted_at, score, total_marks, exam_name, exam_id")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: true });

      if (tncError) throw tncError;

      const combined: ComparisonData[] = [];

      // Process standard results
      standardResults?.forEach((r: any) => {
        combined.push({
          date: new Date(r.created_at).toLocaleDateString(),
          accuracy: r.percentage || 0,
          rank: null, // Global rank is complex to calculate per-attempt historically
          testName: r.test_name,
          category: r.tests?.stream || "Other"
        });
      });

      // Process TNC results
      tncResults?.forEach((r: any) => {
        combined.push({
          date: new Date(r.submitted_at).toLocaleDateString(),
          accuracy: r.total_marks > 0 ? (r.score / r.total_marks) * 100 : 0,
          rank: null,
          testName: r.exam_name || "TNC Test",
          category: "TNC Nursing"
        });
      });

      // Sort by date (already partially sorted but good to be sure)
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData(combined);
      const uniqueCats = Array.from(new Set(combined.map(d => d.category)));
      setCategories(["All", ...uniqueCats]);
    } catch (error) {
      console.error("Error fetching comparison data:", error);
      toast.error("Failed to load performance history");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = activeCategory === "All" 
    ? data 
    : data.filter(d => d.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground font-medium">Analyzing your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col">
      <Helmet>
        <title>Performance Comparison | Test Sagar</title>
        <meta name="description" content="Compare your test attempts and track accuracy changes over time." />
      </Helmet>
      
      <NavigationHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/analytics")}
              className="mb-2 -ml-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Analytics
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Attempt Comparison
            </h1>
            <p className="text-muted-foreground">Visualize your growth across all exam types</p>
          </div>

          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <select 
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredData.length < 2 ? (
          <Card className="text-center py-12 glass-card">
            <CardContent>
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-xl font-medium">Not enough data to compare</p>
              <p className="text-muted-foreground mt-2">Take at least two tests in this category to see your progress chart.</p>
              <Button className="mt-6 btn-glow" onClick={() => navigate("/")}>Take a Test</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="glass-card border-primary/20 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Accuracy Trend
                </CardTitle>
                <CardDescription>Percentage score changes across sequential attempts</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription>Total Attempts</CardDescription>
                  <CardTitle className="text-2xl">{filteredData.length}</CardTitle>
                </CardHeader>
              </Card>
              <CardHeader className="glass-card p-6">
                <CardDescription>Best Accuracy</CardDescription>
                <CardTitle className="text-2xl text-success">
                  {Math.max(...filteredData.map(d => d.accuracy)).toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardHeader className="glass-card p-6">
                <CardDescription>Average Accuracy</CardDescription>
                <CardTitle className="text-2xl text-primary">
                  {(filteredData.reduce((acc, d) => acc + d.accuracy, 0) / filteredData.length).toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Recent Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...filteredData].reverse().slice(0, 5).map((attempt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm sm:text-base">{attempt.testName}</p>
                        <p className="text-xs text-muted-foreground">{attempt.date} • {attempt.category}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${attempt.accuracy >= 75 ? 'text-success' : attempt.accuracy >= 50 ? 'text-warning' : 'text-destructive'}`}>
                          {attempt.accuracy.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AttemptComparison;
