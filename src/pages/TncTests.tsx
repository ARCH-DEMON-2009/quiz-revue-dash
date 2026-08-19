import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  Crown,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { TncBotPopup } from "@/components/TncBotPopup";
import { fetchTncTests, getCategory, type TncExam } from "@/lib/tncApi";

const CATEGORIES = ["All", "NORCET", "AIIMS", "SGPGI", "BTSC", "CHO", "CHN", "Daily Dose", "Other"];
const LIMIT = 20;
const SITE = "https://test.shashanksv.com";

const TncTests = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [quizzes, setQuizzes] = useState<TncExam[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cached, setCached] = useState(false);

  const loadTests = () => {
    setLoading(true);
    setError(false);
    fetchTncTests(page, LIMIT)
      .then((res) => {
        setQuizzes(res.quizzes);
        setTotal(res.total);
        setCached(!!res.cached);
      })
      .catch((e) => {
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
      .finally(() => setLoading(false));
  };

  useEffect(loadTests, [page]);

  const filtered = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesSearch = q.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = category === "All" || getCategory(q.name) === category;
      return matchesSearch && matchesCat;
    });
  }, [quizzes, search, category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: quizzes.length };
    for (const q of quizzes) {
      const c = getCategory(q.name);
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [quizzes]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const startIdx = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const endIdx = Math.min(page * LIMIT, total);

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
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl text-gradient">🎯 TNC Test Series</h1>
          <p className="mt-2 text-muted-foreground">
            6,800+ Free Mock Tests — NORCET · AIIMS · SGPGI · BTSC · CHO
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/tnc-tests/leaderboard")}>
            <Trophy className="h-4 w-4" /> Overall Leaderboard
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test series by name..."
            value={search}
            onChange={(e) => resetAndFilter(() => setSearch(e.target.value))}
            className="pl-9"
          />
        </div>

        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => resetAndFilter(() => setCategory(cat))}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
              {categoryCounts[cat] ? (
                <span className="ml-1.5 opacity-70">({categoryCounts[cat]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Results meta */}
        {!loading && (
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {startIdx}–{endIdx} of {total.toLocaleString()} tests
          </p>
        )}

        {/* Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
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
        ) : filtered.length === 0 ? (
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((q) => (
              <Card key={q.examId} className="flex flex-col p-5 card-hover group">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Badge variant="secondary">{getCategory(q.name)}</Badge>
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
          </>
        )}


        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
      <TncBotPopup />
    </div>
  );
};

export default TncTests;
