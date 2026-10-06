import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  FileText,
  Clock,
  Trophy,
  Minus,
  ArrowRight,
  ArrowLeft,
  Crown,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Bot,
  Info,
  Loader2,
  Star,
  Award,
  X,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MilestoneBadgeArt from "@/components/MilestoneBadgeArt";
import { MILESTONE_DEFINITIONS } from "@/components/MilestoneBadges";
import { fetchMyTncAttempts, type TncAttemptSummary } from "@/lib/tncApi";
import {
  fetchTncTests,
  examCategoryOf,
  examCategoryReason,
  type TncExam,
} from "@/lib/tncApi";

const LIMIT = 20;
const SITE = "https://test.tncnursing.site";
const EXAM_CARD_IMAGE = "https://i.pinimg.com/736x/09/89/d4/0989d4b9b55e6c4d33ec4a5f459e9e22.jpg";
const FAVORITE_GROUPS_KEY = "tnc_favorite_exam_groups";
const BROWSE_ALL_TESTS_KEY = "tnc_browse_all_tests";
const ACHIEVEMENT_PROMO_LAST_SHOWN_KEY = "tnc_achievement_promo_last_shown";
const ACHIEVEMENT_PROMO_SESSION_KEY = "tnc_achievement_promo_checked";
const ACHIEVEMENT_PROMO_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const FEATURED_MILESTONE_IDS = ["first", "streak3", "scorePerfect"];

const TncTests = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [quizzes, setQuizzes] = useState<TncExam[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [browseAll, setBrowseAll] = useState(() => {
    try {
      return window.localStorage.getItem(BROWSE_ALL_TESTS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [favoriteGroups, setFavoriteGroups] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITE_GROUPS_KEY) ?? "[]");
      return Array.isArray(stored) ? stored.filter((group): group is string => typeof group === "string") : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cached, setCached] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [examGroups, setExamGroups] = useState<Record<string, number>>({});
  const [examGroupLatest, setExamGroupLatest] = useState<Record<string, string | null>>({});
  const [showAchievementPromo, setShowAchievementPromo] = useState(false);
  const [showTakenTests, setShowTakenTests] = useState(false);
  const [takenAttempts, setTakenAttempts] = useState<TncAttemptSummary[]>([]);
  const [takenLoading, setTakenLoading] = useState(true);
  const [takenError, setTakenError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const showingExamDirectory = !showTakenTests && !selectedGroup && !browseAll;

  useEffect(() => {
    let active = true;
    fetchMyTncAttempts(10_000)
      .then((attempts) => {
        if (active) setTakenAttempts(attempts);
      })
      .catch((loadError) => {
        console.error("Could not load taken TNC series", loadError);
        if (active) setTakenError(true);
      })
      .finally(() => {
        if (active) setTakenLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ACHIEVEMENT_PROMO_SESSION_KEY)) return;
      window.sessionStorage.setItem(ACHIEVEMENT_PROMO_SESSION_KEY, "1");

      const now = Date.now();
      const lastShown = Number(window.localStorage.getItem(ACHIEVEMENT_PROMO_LAST_SHOWN_KEY) ?? 0);
      if (now - lastShown >= ACHIEVEMENT_PROMO_INTERVAL_MS) {
        window.localStorage.setItem(ACHIEVEMENT_PROMO_LAST_SHOWN_KEY, String(now));
        setShowAchievementPromo(true);
      }
    } catch {
      setShowAchievementPromo(true);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITE_GROUPS_KEY, JSON.stringify(favoriteGroups));
    } catch { /* storage may be unavailable */ }
  }, [favoriteGroups]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BROWSE_ALL_TESTS_KEY, String(browseAll));
    } catch { /* storage may be unavailable */ }
  }, [browseAll]);

  // Debounce typing so each keystroke doesn't hit the provider.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadTests = useCallback(() => {
    const currentRequestId = ++requestId.current;
    const appendPage = page > 1;
    setLoading(!appendPage);
    setLoadingMore(appendPage);
    setError(false);
    fetchTncTests(page, LIMIT, debouncedSearch, "All", selectedGroup, !browseAll)
      .then((res) => {
        if (currentRequestId !== requestId.current) return;
        setQuizzes((current) => appendPage ? [...current, ...res.quizzes] : res.quizzes);
        setTotal(res.total);
        setCached(!!res.cached);
        if (res.examGroups) setExamGroups(res.examGroups);
        if (res.examGroupLatest) setExamGroupLatest(res.examGroupLatest);
      })
      .catch((e) => {
        if (currentRequestId !== requestId.current) return;
        console.error(e);
        const raw = String(e?.message ?? "");
        // Distinguish a TNC provider outage from a local network problem so the
        // user isn't told to check a connection that is actually fine.
        const upstreamDown = /Connection refused|error sending request|502|503|504|timed out/i.test(raw);
        setErrorMsg(
          upstreamDown
            ? "The TNC test provider is temporarily unreachable. This is on their side — please try again in a few minutes."
            : "Couldn't load the test series. Check your connection and try again."
        );
        setError(true);
        toast.error(
          upstreamDown
            ? "TNC provider is temporarily down. Please retry shortly."
            : "Failed to load tests. Please try again."
        );
      })
      .finally(() => {
        if (currentRequestId !== requestId.current) return;
        setLoading(false);
        setLoadingMore(false);
      });
  }, [browseAll, debouncedSearch, page, selectedGroup]);

  useEffect(() => {
    if (!showTakenTests) loadTests();
    return () => {
      requestId.current += 1;
    };
  }, [loadTests, showTakenTests]);

  // Filtering now happens on the server across the entire catalogue, so the
  // page already contains exactly the tests that match.
  const filtered = quizzes;
  const query = examSearch.trim().toLowerCase();
  const examGroupCards = Object.entries(examGroups)
    .filter(([name]) => !query || name.toLowerCase().includes(query))
    .sort(([nameA, countA], [nameB, countB]) => {
      const favoriteDifference = Number(favoriteGroups.includes(nameB)) - Number(favoriteGroups.includes(nameA));
      if (favoriteDifference !== 0) return favoriteDifference;
      const latestA = Date.parse(examGroupLatest[nameA] ?? "") || 0;
      const latestB = Date.parse(examGroupLatest[nameB] ?? "") || 0;
      return latestB - latestA || Number(countB) - Number(countA);
    });
  const featuredMilestones = MILESTONE_DEFINITIONS.filter((milestone) => FEATURED_MILESTONE_IDS.includes(milestone.id));

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const takenSeries = Array.from(takenAttempts.reduce((series, attempt) => {
    const existing = series.get(attempt.examId);
    if (existing) {
      existing.attemptCount += 1;
    } else {
      series.set(attempt.examId, { latestAttempt: attempt, attemptCount: 1 });
    }
    return series;
  }, new Map<string, { latestAttempt: TncAttemptSummary; attemptCount: number }>()).values());

  const resetAndFilter = (fn: () => void) => {
    fn();
    if (page !== 1) setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>TNC Nursing Test Series — Free Mock Tests | Test Sagar</title>
        <meta
          name="description"
          content="Practice 6,800+ free TNC nursing mock tests for NORCET, AIIMS, SGPGI, BTSC and CHO. Timed exams, instant scoring, detailed solutions and leaderboards on Test Sagar."
        />
        <link rel="canonical" href={`${SITE}/tnc-tests`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="TNC Nursing Test Series — Free Mock Tests | Test Sagar" />
        <meta property="og:description" content="6,800+ free nursing mock tests with timer, scoring and solutions. Best test taking site for TNC Nursing preparation." />
        <meta property="og:url" content={`${SITE}/tnc-tests`} />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/8e5rLwi05IUp3glqNPHnHEmvlvs2/social-images/social-1766994335179-thumbnail.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TNC Nursing Test Series — Free Mock Tests | Test Sagar" />
        <meta name="twitter:description" content="6,800+ free nursing mock tests with timer, scoring and solutions." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "TNC Nursing Test Series",
            "description": "Free nursing mock tests for NORCET, AIIMS, SGPGI, BTSC and CHO.",
            "url": `${SITE}/tnc-tests`,
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
              }]
            }
          })}
        </script>
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl text-gradient">
            🎯 {selectedGroup ? `${selectedGroup} Test Series` : browseAll ? "All Test Series" : "TNC Exams"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {showingExamDirectory
              ? "Choose an exam to browse its test series."
              : "Choose a test series to start practicing."}
          </p>
          <div className="mt-5 flex flex-col items-center gap-1.5">
            <Button
              asChild
              className="h-12 gap-2 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500 via-yellow-400 to-lime-400 px-6 font-bold text-slate-950 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(245,158,11,0.75)]"
            >
              <Link to="/tnc-tests/leaderboard">
                <Trophy className="h-5 w-5" /> View Overall Leaderboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">See where you rank across every TNC test</span>
            <Button asChild variant="outline" size="sm" className="mt-2 gap-2">
              <Link to="/tnc-study"><CalendarDays className="h-4 w-4" /> Build my study plan</Link>
            </Button>
          </div>
          {showAchievementPromo && <div className="relative mx-auto mt-4 flex max-w-3xl flex-col gap-3 border-y border-border/70 py-4 sm:flex-row sm:items-center">
            <button
              type="button"
              aria-label="Dismiss achievement invitation"
              onClick={() => setShowAchievementPromo(false)}
              className="absolute right-0 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:static"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">What will you unlock next?</h2>
                <p className="text-sm text-muted-foreground">Every completed test builds toward a new achievement.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {featuredMilestones.map((milestone) => (
                <span key={milestone.id} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground" title={milestone.description}>
                  <MilestoneBadgeArt id={milestone.id} icon={milestone.icon} size="sm" locked />
                  {milestone.title}
                </span>
              ))}
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1">
              <Link to="/profile">My achievements <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>}
        </div>

        <div className="mb-6 flex justify-center">
          <div role="group" aria-label="Test series browsing mode" className="inline-flex flex-wrap justify-center rounded-md border border-border p-1">
            <Button
              size="sm"
              variant={!showTakenTests && !browseAll ? "default" : "ghost"}
              onClick={() => {
                setShowTakenTests(false);
                setBrowseAll(false);
                setSelectedGroup("");
                setSearch("");
                setPage(1);
              }}
            >
              By exam
            </Button>
            <Button
              size="sm"
              variant={!showTakenTests && browseAll ? "default" : "ghost"}
              onClick={() => {
                setShowTakenTests(false);
                setBrowseAll(true);
                setSelectedGroup("");
                setSearch("");
                setPage(1);
              }}
            >
              All test series
            </Button>
            <Button
              size="sm"
              variant={showTakenTests ? "default" : "ghost"}
              onClick={() => {
                setShowTakenTests(true);
                setSelectedGroup("");
              }}
            >
              Taken test series
            </Button>
          </div>
        </div>

        {showingExamDirectory && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={examSearch}
              onChange={(event) => setExamSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {!showTakenTests && (selectedGroup || browseAll) && (
          <>
            {selectedGroup && <Button
              variant="ghost"
              className="mb-4 gap-2 px-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelectedGroup("");
                setSearch("");
                setPage(1);
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to exams
            </Button>}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{selectedGroup ? `${selectedGroup} Test Series` : "All Test Series"}</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a test series to start practicing.
                </p>
              </div>
              {selectedGroup && <Badge variant="secondary">{examGroups[selectedGroup] ?? 0} tests</Badge>}
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search test series by name..."
                value={search}
                onChange={(e) => resetAndFilter(() => setSearch(e.target.value))}
                className="pl-9"
              />
            </div>
          </>
        )}

        {/* Results meta */}
        {!showTakenTests && !loading && (selectedGroup || browseAll) && (
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {quizzes.length.toLocaleString()} of {total.toLocaleString()} tests
          </p>
        )}

        {/* Cards */}
        {showTakenTests ? (
          takenLoading ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
            </div>
          ) : takenError ? (
            <Card className="p-8 text-center text-muted-foreground">
              Couldn’t load your taken test series. Please refresh and try again.
            </Card>
          ) : takenSeries.length === 0 ? (
            <Card className="space-y-3 p-8 text-center">
              <p className="font-medium text-foreground">No completed TNC series yet.</p>
              <p className="text-sm text-muted-foreground">Your completed tests will appear here.</p>
              <Button onClick={() => setShowTakenTests(false)}>Browse test series</Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {takenSeries.map(({ latestAttempt, attemptCount }) => {
                const percentage = latestAttempt.totalMarks > 0
                  ? (latestAttempt.score / latestAttempt.totalMarks) * 100
                  : 0;
                return (
                  <Card key={latestAttempt.examId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-foreground">
                        {latestAttempt.examName || "TNC test series"}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {attemptCount} {attemptCount === 1 ? "attempt" : "attempts"} · Latest score {percentage.toFixed(1)}% · {new Date(latestAttempt.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild variant="outline" className="shrink-0 gap-2">
                      <Link to={`/tnc-tests/${encodeURIComponent(latestAttempt.examId)}/result/${latestAttempt.attemptId}`}>
                        <FileText className="h-4 w-4" /> View latest result
                      </Link>
                    </Button>
                  </Card>
                );
              })}
            </div>
          )
        ) : loading ? (
          <div aria-busy="true" aria-live="polite" className="space-y-5">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span>Loading test series...</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="max-w-md text-muted-foreground">
              {errorMsg || "Couldn't load the test series. Check your connection and try again."}
            </p>
            <Button className="gap-2" onClick={loadTests}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </Card>
        ) : !showingExamDirectory && filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No tests found.</div>
        ) : (
          <>
          {cached && (
            <Card className="mb-4 flex items-start gap-3 border-amber-500/40 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                The TNC provider is temporarily unreachable, so you're seeing your saved test
                series. Newly added tests may be missing until the provider is back — everything
                shown here can still be attempted normally.
              </p>
            </Card>
          )}

          {showingExamDirectory ? (
            examGroupCards.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No exams match your search.</div>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {examGroupCards.map(([exam, count]) => (
                <Card key={exam} className="flex flex-col overflow-hidden p-0 card-hover group">
                  <img
                    src={EXAM_CARD_IMAGE}
                    alt={`${exam} exam`}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {exam}
                      </h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="-mr-2 -mt-2 shrink-0"
                        aria-label={favoriteGroups.includes(exam) ? `Remove ${exam} from favorites` : `Add ${exam} to favorites`}
                        aria-pressed={favoriteGroups.includes(exam)}
                        onClick={() => setFavoriteGroups((current) => current.includes(exam)
                          ? current.filter((favorite) => favorite !== exam)
                          : [...current, exam])}
                      >
                        <Star className={`h-4 w-4 ${favoriteGroups.includes(exam) ? "fill-amber-400 text-amber-500" : ""}`} />
                      </Button>
                    </div>
                    <p className="mb-5 text-sm text-muted-foreground">
                      {count.toLocaleString()} test series available
                    </p>
                    <Button
                      className="mt-auto w-full gap-2 btn-glow shadow-sm"
                      onClick={() => {
                        setSelectedGroup(exam);
                        setBrowseAll(false);
                        setPage(1);
                        setSearch("");
                      }}
                    >
                      View Test Series <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((q) => (
                <Card key={q.examId} className="flex flex-col p-5 card-hover group">
                  <img
                    src={EXAM_CARD_IMAGE}
                    alt="TNC nursing test series"
                    className="mb-4 h-40 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="cursor-help gap-1">
                          {examCategoryOf(q)} <Info className="h-3 w-3 opacity-70" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">{examCategoryReason(q)}</p>
                      </TooltipContent>
                    </Tooltip>
                    {q.allowForPremium && (
                      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                        <Crown className="h-3 w-3" /> Premium
                      </Badge>
                    )}
                  </div>
                  <h3 className="mb-4 line-clamp-2 min-h-[3rem] font-semibold text-foreground group-hover:text-primary transition-colors">
                    {q.name}
                  </h3>
                  <div className="mb-5 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" /> {q.questionCount} Qs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> {parseInt(q.durationMinutes)} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4" /> {q.maxMarks} Marks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Minus className="h-4 w-4" /> -{q.negativeMarks}
                    </span>
                  </div>
                  <Button
                    className="mt-auto w-full gap-2 btn-glow shadow-sm"
                    onClick={() => navigate(`/tnc-tests/${q.examId}`)}
                  >
                    Attempt Now <ArrowRight className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
          </>
        )}


        {/* Pagination */}
        {!showTakenTests && !loading && !showingExamDirectory && page < totalPages && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loadingMore ? "Loading tests..." : "Load more tests"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default TncTests;
