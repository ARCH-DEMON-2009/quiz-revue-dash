import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, AlertCircle, RefreshCw, Crown, Star } from "lucide-react";
import { fetchTncLeaderboard, type TncLeaderboardRow } from "@/lib/tncApi";
import { supabase } from "@/integrations/supabase/client";

interface ExtendedTncRow extends TncLeaderboardRow {
  isPremium?: boolean;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  planType?: string;
}

const SITE = "https://quiz-revue-dash.lovable.app";

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const TncLeaderboard = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ExtendedTncRow[]>([]);
  const [examName, setExamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    if (!examId) return;
    setLoading(true);
    setError(false);
    fetchTncLeaderboard(examId)
      .then(async (res) => {
        const userIds = res.rows.map(r => r.userId);
        
        // Fetch premium & admin status
        const [premiumRes, adminRes, profileRes] = await Promise.all([
          supabase.from('premium_users').select('user_id, plan_duration_type').in('user_id', userIds).eq('status', 'active').gt('expiry_date', new Date().toISOString()),
          supabase.from('user_roles').select('user_id').in('user_id', userIds).eq('role', 'admin'),
          supabase.from('user_profiles').select('user_id, avatar_url').in('user_id', userIds)
        ]);

        const premMap = new Map(premiumRes.data?.map(p => [p.user_id, p.plan_duration_type]) || []);
        const adminSet = new Set(adminRes.data?.map(a => a.user_id) || []);
        const profileMap = new Map(profileRes.data?.map(p => [p.user_id, p.avatar_url]) || []);

        const extendedRows: ExtendedTncRow[] = res.rows.map(r => ({
          ...r,
          isPremium: premMap.has(r.userId),
          isAdmin: adminSet.has(r.userId),
          avatarUrl: profileMap.get(r.userId),
          planType: premMap.get(r.userId)
        }));

        setRows(extendedRows);
        setExamName(res.examName);
      })
      .catch((e) => {
        console.error(e);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [examId]);

  const title = `${examName ?? "TNC Test"} Leaderboard — Top Rankings`;
  const canonical = `${SITE}/tnc-tests/${examId}/leaderboard`;

  const medal = (rank: number) => {
    if (rank === 1) return "text-amber-500";
    if (rank === 2) return "text-slate-400";
    if (rank === 3) return "text-orange-600";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={`Top scorers ranked by score for ${examName ?? "this TNC test"}. See correct, wrong and skipped breakdown.`} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={canonical} />
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate(`/tnc-tests/${examId}`)}>
          <ArrowLeft className="h-4 w-4" /> Back to Test
        </Button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <Trophy className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Leaderboard</h1>
          {examName && <p className="mt-1 text-muted-foreground">{examName}</p>}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">Couldn't load the leaderboard.</p>
            <Button onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            No attempts yet. Be the first to take this test!
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.userId} className="flex items-center gap-4 p-4">
                <div className={`flex w-8 shrink-0 items-center justify-center font-bold ${medal(r.rank)}`}>
                  {r.rank <= 3 ? <Medal className="h-5 w-5" /> : r.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{r.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{r.correctCount} correct</span> ·{" "}
                    <span className="text-red-600">{r.wrongCount} wrong</span> ·{" "}
                    <span className="text-amber-600">{r.skippedCount} skipped</span> · {fmtTime(r.timeTakenSeconds)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-primary">{r.score.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">/ {r.totalMarks}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TncLeaderboard;
