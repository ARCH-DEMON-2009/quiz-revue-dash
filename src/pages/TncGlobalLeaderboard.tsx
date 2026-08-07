import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, AlertCircle, RefreshCw, Crown, ArrowLeft, Clock, Star, Shield } from "lucide-react";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTncGlobalLeaderboard,
  type TncGlobalLeaderboardRow,
  type TncLeaderboardPeriod,
} from "@/lib/tncApi";
import { toast } from "sonner";

const SITE = "https://test.shashanksv.com";
const CACHE_KEY = "tnc_global_leaderboard_cache";

const PERIODS: { value: TncLeaderboardPeriod; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "monthly", label: "This Month" },
  { value: "all", label: "All Time" },
];

const fmtTime = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const TncGlobalLeaderboard = () => {
  const [period, setPeriod] = useState<TncLeaderboardPeriod>("all");
  const [rows, setRows] = useState<(TncGlobalLeaderboardRow & { isAdmin?: boolean; avatarUrl?: string | null; planType?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const { 
    config,
    getAdminFrameStyles, 
    getAdminAvatarBorder, 
    getAdminBadgeIcon, 
    getAdminNameColor 
  } = useAdminBadgeConfig();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const load = async (p: TncLeaderboardPeriod, isRetry = false, attempt = 0) => {
    setLoading(true);
    setError(false);
    
    // Try to load from cache first if not a retry
    if (!isRetry) {
      const cached = localStorage.getItem(`${CACHE_KEY}_${p}`);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          setRows(data);
          setLastUpdated(timestamp);
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }

    try {
      const res = await fetchTncGlobalLeaderboard(p);
      const userIds = res.rows.map(r => r.userId);
      
      const [adminRes, profileRes, premiumRes] = await Promise.all([
        supabase.from('user_roles').select('user_id').in('user_id', userIds).eq('role', 'admin'),
        supabase.from('user_profiles').select('user_id, avatar_url, name').in('user_id', userIds),
        supabase.from('premium_users').select('user_id, plan_duration_type').in('user_id', userIds).eq('status', 'active').gt('expiry_date', new Date().toISOString())
      ]);

      const adminSet = new Set(adminRes.data?.map(a => a.user_id) || []);
      const profileMap = new Map(profileRes.data?.map(p => [p.user_id, p.avatar_url]) || []);
      const premMap = new Map(premiumRes.data?.map(p => [p.user_id, p.plan_duration_type]) || []);

      const enhancedRows = res.rows.map(r => ({
        ...r,
        isAdmin: adminSet.has(r.userId),
        avatarUrl: profileMap.get(r.userId),
        planType: premMap.get(r.userId)
      }));

      setRows(enhancedRows);
      const now = Date.now();
      setLastUpdated(now);
      localStorage.setItem(`${CACHE_KEY}_${p}`, JSON.stringify({ data: enhancedRows, timestamp: now }));
    } catch (e) {
      console.error(e);
      // Exponential backoff retries (limit to 3)
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        setTimeout(() => load(p, true, attempt + 1), delay);
        return;
      }
      
      setError(true);
      if (!rows.length) {
        toast.error("Couldn't refresh the leaderboard. Showing last cached data if available.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(period);
  }, [period]);

  const medal = (rank: number) => {
    if (rank === 1) return "text-amber-500";
    if (rank === 2) return "text-slate-400";
    if (rank === 3) return "text-orange-600";
    return "text-muted-foreground";
  };

  const getNameColor = (r: any) => {
    if (r.isAdmin) return getAdminNameColor(true);
    if (!r.isPremium) return "text-foreground";
    if (r.planType === 'yearly' || r.planType === '12_months' || r.planType === '2years') return "text-amber-500 font-bold";
    if (r.planType === '6_months') return "text-blue-500 font-bold";
    return "text-emerald-500 font-bold";
  };

  const title = "TNC Test Series Leaderboard — All-India Rankings";
  const canonical = `${SITE}/tnc-tests/leaderboard`;
  const me = rows.find((r) => r.userId === meId);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content="Overall TNC nursing test series rankings across all mock tests. Daily, monthly and all-time leaderboards for free and premium students on Test Sagar."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content="Daily, monthly and all-time TNC test series rankings across every mock test. See where you rank in the Test Sagar community." />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/8e5rLwi05IUp3glqNPHnHEmvlvs2/social-images/social-1766994335179-thumbnail.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content="Daily, monthly and all-time TNC test series rankings across every mock test." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": title,
            "description": "Overall TNC nursing test series rankings across all mock tests.",
            "url": canonical,
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": SITE
              }, {
                "@type": "ListItem",
                "position": 2,
                "name": "TNC Tests",
                "item": `${SITE}/tnc-tests`
              }, {
                "@type": "ListItem",
                "position": 3,
                "name": "Global Leaderboard",
                "item": canonical
              }]
            }
          })}
        </script>
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Button variant="ghost" className="mb-4 gap-2" asChild>
          <Link to="/tnc-tests">
            <ArrowLeft className="h-4 w-4" /> Back to Test Series
          </Link>
        </Button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <Trophy className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">TNC Overall Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked on total marks scored across every TNC test series
          </p>
          {lastUpdated && (
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              <button 
                onClick={() => load(period, true)} 
                className="ml-1 flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh Now
              </button>
            </div>
          )}
        </div>

        <Tabs 
          value={period} 
          onValueChange={(v) => {
            const p = v as TncLeaderboardPeriod;
            setPeriod(p);
            // Track analytics event for leaderboard tab change
            try {
              (window as any).posthog?.capture('leaderboard_tab_changed', { period: p });
              console.log(`Leaderboard tab changed to: ${p}`);
            } catch (e) { /* ignore analytics errors */ }
          }} 
          className="mb-5"
        >
          <TabsList className="grid w-full grid-cols-3">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {me && (
          <Card 
            className="mb-4 cursor-pointer border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
            onClick={() => {
              // Track analytics event for clicking on personal rank card
              try {
                (window as any).posthog?.capture('leaderboard_me_card_clicked');
              } catch (e) { /* ignore analytics errors */ }
              toast.info("This is your current ranking based on your best performance.");
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Your Rank</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-foreground">#{me.rank}</span>
              <span className="text-sm text-muted-foreground">
                {me.testsTaken} tests · {me.accuracy.toFixed(1)}% accuracy
              </span>
              <span className="font-bold text-primary">{me.totalScore.toFixed(1)} pts</span>
            </div>
          </Card>
        )}

        {loading && !rows.length ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
        ) : error && !rows.length ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">Couldn't load the leaderboard.</p>
            <Button onClick={() => load(period, true)} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </Card>
        ) : rows.length === 0 && !loading ? (
          <Card className="p-10 text-center text-muted-foreground">
            No attempts in this period yet. Take a test to claim the top spot!
          </Card>
        ) : (
          <div className={`space-y-2 ${loading ? "opacity-60" : ""}`}>
            {rows.map((r) => (
              <Card
                key={r.userId}
                className={`flex items-center gap-3 p-3 sm:gap-4 sm:p-4 ${
                  r.userId === meId ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <div className={`flex w-8 shrink-0 items-center justify-center font-bold ${medal(r.rank)}`}>
                  {r.rank <= 3 ? <Medal className="h-5 w-5" /> : r.rank}
                </div>
                
                <div className="relative shrink-0">
                  <div className="absolute -inset-0 z-0 pointer-events-none">
                    {r.isAdmin ? (
                      ['f1', 'f2', 'f3'].includes(config.frame_type) ? (
                        <img src={`/frames/${config.frame_type}.png`} alt="Admin Frame" className="w-full h-full object-contain scale-[1.5]" />
                      ) : (
                        <div className={getAdminFrameStyles(true) || ""} />
                      )
                    ) : r.isPremium ? (
                      <img src="/frames/f1.png" alt="Premium Frame" className="w-full h-full object-contain scale-[1.5]" />
                    ) : null}
                  </div>
                  <div className={`h-10 w-10 relative bg-background border-2 rounded-full overflow-hidden shrink-0 ${r.isAdmin && !['f1', 'f2', 'f3'].includes(config.frame_type) ? getAdminAvatarBorder(true) : 'border-transparent'}`}>
                    <img 
                      src={r.avatarUrl || (r.isAdmin ? "/admin-avatar.png" : `https://api.dicebear.com/7.x/initials/svg?seed=${r.userName}`)} 
                      className="h-full w-full object-cover"
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${r.userName}`;
                      }}
                    />
                  </div>
                  {r.isAdmin ? (
                    <div className="absolute -top-2 -right-2 w-6 h-6 z-10 animate-pulse">
                      {['b1', 'b2', 'b3'].includes(getAdminBadgeIcon(true) || "") ? (
                        <img src={`/badges/${getAdminBadgeIcon(true)}.png`} alt="Admin Badge" className="w-full h-full object-contain" />
                      ) : getAdminBadgeIcon(true) === 'shield' ? (
                        <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                          <Shield className="h-3 w-3 text-white fill-white" />
                        </div>
                      ) : getAdminBadgeIcon(true) === 'crown' ? (
                        <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                          <Crown className="h-3 w-3 text-white fill-white" />
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                          <Star className="h-3 w-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  ) : r.isPremium ? (
                    <div className="absolute -top-0.5 -right-0.5 z-10">
                      <img src="/badges/b3.png" alt="Premium Badge" className="w-5 h-5 object-contain" />
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`truncate font-semibold ${getNameColor(r)}`}>{r.userName}</p>
                    {r.isAdmin && (
                      <Badge className="shrink-0 bg-red-600 text-[10px] text-white hover:bg-red-600">
                        Admin
                      </Badge>
                    )}
                    {r.isPremium && !r.isAdmin && (
                      <Badge className="shrink-0 gap-1 bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">
                        <Crown className="h-2.5 w-2.5" /> Premium
                      </Badge>
                    )}
                    {!r.isPremium && !r.isAdmin && (
                      <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
                        Free
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.testsTaken} tests · {r.accuracy.toFixed(1)}% accuracy · {fmtTime(r.timeTakenSeconds)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-primary sm:text-lg">{r.totalScore.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">/ {r.totalMarks.toFixed(0)}</p>
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


export default TncGlobalLeaderboard;
