import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Eye, CalendarDays, CalendarRange, Calendar } from "lucide-react";

interface AnalyticsData {
  totalVerified: number;
  dailyVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
}

export const AdminAnalyticsSection = () => {
  const [data, setData] = useState<AnalyticsData>({
    totalVerified: 0,
    dailyVisits: 0,
    weeklyVisits: 0,
    monthlyVisits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch verified users count
      const { count: verifiedCount } = await supabase
        .from("access_verifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "verified");

      // Fetch daily visits (sessions created today)
      const { count: dailyCount } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart);

      // Fetch weekly visits
      const { count: weeklyCount } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);

      // Fetch monthly visits
      const { count: monthlyCount } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthAgo);

      setData({
        totalVerified: verifiedCount || 0,
        dailyVisits: dailyCount || 0,
        weeklyVisits: weeklyCount || 0,
        monthlyVisits: monthlyCount || 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-3 sm:mb-4">
        <CardContent className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <Card>
        <CardHeader className="p-3 sm:pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Verified Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{data.totalVerified}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Today's Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{data.dailyVisits}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Weekly Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{data.weeklyVisits}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Monthly Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{data.monthlyVisits}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
