import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LeaderboardIdentityAvatar from "@/components/LeaderboardIdentityAvatar";
import { toDisplayName } from "@/lib/displayName";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, AlertCircle, RefreshCw, Crown, Star, Shield, Bot, ExternalLink } from "lucide-react";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";
import { fetchTncLeaderboard, type TncLeaderboardRow } from "@/lib/tncApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ExtendedTncRow extends TncLeaderboardRow {
  isPremium?: boolean;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  planType?: string;
}

const SITE = "https://test.shashanksv.com";

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
  const [showBotPopup, setShowBotPopup] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("tnc_bot_popup_seen");
    if (!hasSeen) {
      const timer = setTimeout(() => setShowBotPopup(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClosePopup = () => {
    setShowBotPopup(false);
    localStorage.setItem("tnc_bot_popup_seen", "true");
  };
  const { 
    config,
    getAdminFrameStyles, 
    getAdminAvatarBorder, 
    getAdminBadgeIcon, 
    getAdminNameColor 
  } = useAdminBadgeConfig();

  const load = () => {
    if (!examId) return;
    setLoading(true);
    setError(false);
    fetchTncLeaderboard(examId)
      .then((res) => {
        // The edge function already resolves display names, avatars, premium
        // and admin status with service-role access (client RLS hides roles).
        setRows(res.rows as ExtendedTncRow[]);
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

  const getNameColor = (r: ExtendedTncRow) => {
    if (r.isAdmin) return getAdminNameColor(true);
    if (!r.isPremium) return "text-foreground";
    if (r.planType === 'yearly' || r.planType === '12_months' || r.planType === '2years') return "text-amber-500 font-bold drop-shadow-sm";
    if (r.planType === '6_months') return "text-blue-500 font-bold drop-shadow-sm";
    return "text-emerald-500 font-bold drop-shadow-sm";
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
                
                <LeaderboardIdentityAvatar
                  name={r.userName}
                  avatarUrl={r.avatarUrl}
                  isAdmin={r.isAdmin}
                  isPremium={r.isPremium}
                  adminFrame={config.frame_type}
                  adminBadge={getAdminBadgeIcon(true) || undefined}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`truncate font-semibold ${getNameColor(r)}`}>{toDisplayName(r.userName)}</p>
                  </div>
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

      <Dialog open={showBotPopup} onOpenChange={setShowBotPopup}>
        <DialogContent className="sm:max-w-[425px] border-primary/20 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-gradient">Free Nursing Courses!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Study TNC Nursing Courses and lectures for free on <span className="font-bold text-primary">@Tnccontentbot</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-sm text-muted-foreground">
            Start the bot and open the mini app to access premium content at no cost.
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              className="w-full gap-2 btn-glow" 
              onClick={() => {
                window.open("https://t.me/Tnccontentbot", "_blank");
                handleClosePopup();
              }}
            >
              <ExternalLink className="h-4 w-4" /> Start Bot Now
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleClosePopup}>
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TncLeaderboard;
