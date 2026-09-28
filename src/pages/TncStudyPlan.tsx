import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Award, BookOpenCheck, CalendarDays, Check, Clock3, Target, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyTncAttempts, type TncAttemptSummary } from "@/lib/tncApi";

type StudySettings = {
  examDate: string;
  minutesPerDay: number;
};

const DEFAULT_SETTINGS: StudySettings = { examDate: "", minutesPerDay: 60 };
const DAY_MS = 24 * 60 * 60 * 1000;

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const scorePercent = (attempt: TncAttemptSummary) =>
  attempt.totalMarks > 0 ? Math.max(0, Math.min(100, (attempt.score / attempt.totalMarks) * 100)) : 0;

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const TncStudyPlan = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<TncAttemptSummary[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) {
          navigate(`/auth?redirect=${encodeURIComponent("/tnc-study")}`, { replace: true });
          return;
        }

        setUserId(user.id);
        try {
          const stored = localStorage.getItem(`tnc_study_plan_${user.id}`);
          if (stored) {
            const parsed = JSON.parse(stored) as Partial<StudySettings>;
            setSettings({
              examDate: typeof parsed.examDate === "string" ? parsed.examDate : "",
              minutesPerDay: Number.isFinite(parsed.minutesPerDay)
                ? Math.max(15, Math.min(480, Number(parsed.minutesPerDay)))
                : DEFAULT_SETTINGS.minutesPerDay,
            });
            setSaved(true);
          }
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }
        const history = await fetchMyTncAttempts(100);
        if (active) setAttempts(history);
      } catch (loadError) {
        console.error("Could not load TNC study plan", loadError);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [navigate]);

  const now = Date.now();
  const thisWeek = attempts.filter((attempt) => now - Date.parse(attempt.submittedAt) < 7 * DAY_MS);
  const previousWeek = attempts.filter((attempt) => {
    const age = now - Date.parse(attempt.submittedAt);
    return age >= 7 * DAY_MS && age < 14 * DAY_MS;
  });
  const thisWeekAverage = average(thisWeek.map(scorePercent));
  const previousWeekAverage = average(previousWeek.map(scorePercent));
  const thisWeekMissed = thisWeek.reduce((sum, attempt) => sum + attempt.wrongCount + attempt.skippedCount, 0);
  const activeDays = new Set(thisWeek.map((attempt) => localDateKey(new Date(attempt.submittedAt)))).size;
  const latestMissedAttempt = attempts.find((attempt) => attempt.wrongCount + attempt.skippedCount > 0);

  const examPerformance = new Map<string, { correct: number; total: number; attempts: number }>();
  for (const attempt of attempts) {
    const exam = attempt.examName?.trim() || "TNC Nursing Test";
    const current = examPerformance.get(exam) ?? { correct: 0, total: 0, attempts: 0 };
    current.correct += attempt.correctCount;
    current.total += attempt.correctCount + attempt.wrongCount;
    current.attempts += 1;
    examPerformance.set(exam, current);
  }
  const weakestExam = [...examPerformance.entries()]
    .filter(([, stats]) => stats.total > 0)
    .sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total || b.attempts - a.attempts)[0];

  const daysUntilExam = settings.examDate
    ? Math.ceil((new Date(`${settings.examDate}T00:00:00`).getTime() - new Date(`${localDateKey(new Date())}T00:00:00`).getTime()) / DAY_MS)
    : null;
  const weeklyScoreChange = thisWeek.length && previousWeek.length ? thisWeekAverage - previousWeekAverage : null;
  const practiceMinutes = Math.round(settings.minutesPerDay * 0.4);
  const reviewMinutes = Math.round(settings.minutesPerDay * 0.35);
  const recallMinutes = settings.minutesPerDay - practiceMinutes - reviewMinutes;

  const recommendations = [
    {
      icon: BookOpenCheck,
      title: latestMissedAttempt ? `Retry missed questions from ${latestMissedAttempt.examName || "your last test"}` : "Review your missed questions",
      detail: latestMissedAttempt
        ? `${latestMissedAttempt.wrongCount + latestMissedAttempt.skippedCount} questions to revisit from your latest attempt.`
        : "After your first test, your wrong and skipped questions will be collected here.",
      action: latestMissedAttempt ? "Start retry" : "Find a test",
      to: latestMissedAttempt
        ? `/tnc-tests/${encodeURIComponent(latestMissedAttempt.examId)}/retry/${latestMissedAttempt.attemptId}`
        : "/tnc-tests",
    },
    {
      icon: Target,
      title: weakestExam ? `Build accuracy in ${weakestExam[0]}` : "Choose a test series to begin",
      detail: weakestExam
        ? `${Math.round((weakestExam[1].correct / weakestExam[1].total) * 100)}% accuracy across ${weakestExam[1].total} answered questions.`
        : "Your study plan gets more personal as you complete tests.",
      action: "Browse test series",
      to: "/tnc-tests",
    },
    {
      icon: Clock3,
      title: settings.examDate && daysUntilExam !== null && daysUntilExam >= 0
        ? `${daysUntilExam} days until your exam`
        : "Keep a steady practice rhythm",
      detail: `${settings.minutesPerDay} minutes a day gives you time to practice and review without cramming.`,
      action: "Take a mock test",
      to: "/tnc-tests",
    },
  ];

  const saveSettings = () => {
    if (settings.examDate && new Date(`${settings.examDate}T00:00:00`).getTime() < new Date(`${localDateKey(new Date())}T00:00:00`).getTime()) {
      toast.error("Choose an exam date that is today or later.");
      return;
    }
    try {
      if (!userId) throw new Error("Sign in to save your study plan.");
      localStorage.setItem(`tnc_study_plan_${userId}`, JSON.stringify(settings));
      setSaved(true);
      toast.success("Study plan saved.");
    } catch {
      setSaved(false);
      toast.error("Could not save your study plan on this device.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="container mx-auto max-w-6xl space-y-5 px-4 py-10">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My TNC Study Plan | Test Sagar</title>
        <meta name="description" content="Set your TNC nursing exam goals, practice missed questions, and review your weekly progress." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Your preparation</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">My study plan</h1>
            <p className="mt-2 text-muted-foreground">A practical routine built from your TNC test attempts.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/tnc-tests")}>
            <BookOpenCheck className="h-4 w-4" /> Browse tests
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-destructive/30 p-4 text-sm text-destructive">
            Couldn’t load your attempt history. Your saved goals are still available.
          </Card>
        )}

        <section aria-labelledby="goal-title" className="grid gap-6 border-b border-border pb-8 md:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-700" />
              <h2 id="goal-title" className="text-xl font-bold">Set your study target</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">Set a target date and a realistic daily practice budget. Your plan is saved to this account on this device.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <label className="grid gap-2 text-sm font-medium">
              Exam date
              <input
                type="date"
                min={localDateKey(new Date())}
                value={settings.examDate}
                onChange={(event) => {
                  setSettings((current) => ({ ...current, examDate: event.target.value }));
                  setSaved(false);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Daily study time
              <span className="flex h-10 items-center gap-2 rounded-md border border-input px-3">
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={settings.minutesPerDay}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSettings((current) => ({ ...current, minutesPerDay: Number.isFinite(value) ? Math.max(15, Math.min(480, value)) : 15 }));
                    setSaved(false);
                  }}
                  className="w-full bg-transparent font-normal outline-none"
                  aria-label="Minutes of study per day"
                />
                <span className="shrink-0 text-muted-foreground">min/day</span>
              </span>
            </label>
            <div className="flex items-center gap-3 sm:col-span-2 sm:justify-end">
              <span aria-live="polite" className="text-xs text-muted-foreground">{saved ? "Saved" : "Unsaved changes"}</span>
              <Button onClick={saveSettings} className="gap-2" disabled={saved}>
                <Check className="h-4 w-4" /> Save plan
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="daily-routine-title" className="border-b border-border py-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Your daily routine</p>
              <h2 id="daily-routine-title" className="mt-1 text-2xl font-bold">A focused {settings.minutesPerDay}-minute session</h2>
            </div>
            {daysUntilExam !== null && daysUntilExam >= 0 && (
              <span className="text-sm text-muted-foreground">{daysUntilExam} days until your exam</span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border-l-2 border-emerald-500 pl-4">
              <p className="text-2xl font-bold">{practiceMinutes}<span className="ml-1 text-sm font-medium text-muted-foreground">min</span></p>
              <h3 className="mt-1 font-semibold">Timed practice</h3>
              <p className="mt-1 text-sm text-muted-foreground">Attempt a section or mock test under exam conditions.</p>
            </div>
            <div className="border-l-2 border-amber-500 pl-4">
              <p className="text-2xl font-bold">{reviewMinutes}<span className="ml-1 text-sm font-medium text-muted-foreground">min</span></p>
              <h3 className="mt-1 font-semibold">Review mistakes</h3>
              <p className="mt-1 text-sm text-muted-foreground">Retry missed questions and understand the explanations.</p>
            </div>
            <div className="border-l-2 border-sky-600 pl-4">
              <p className="text-2xl font-bold">{recallMinutes}<span className="ml-1 text-sm font-medium text-muted-foreground">min</span></p>
              <h3 className="mt-1 font-semibold">Recall and revise</h3>
              <p className="mt-1 text-sm text-muted-foreground">Revisit key facts from your weakest test series.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="weekly-title" className="py-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Last seven days</p>
              <h2 id="weekly-title" className="mt-1 text-2xl font-bold">Weekly progress</h2>
            </div>
            <p className="text-sm text-muted-foreground">Based on your completed TNC tests</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Tests completed</p>
              <p className="mt-2 text-3xl font-bold">{thisWeek.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{previousWeek.length ? `${thisWeek.length - previousWeek.length >= 0 ? "+" : ""}${thisWeek.length - previousWeek.length} vs previous week` : "No previous-week comparison yet"}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Average score</p>
              <p className="mt-2 text-3xl font-bold">{thisWeek.length ? `${Math.round(thisWeekAverage)}%` : "—"}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {weeklyScoreChange === null ? "Complete tests to see your trend" : <>
                  {weeklyScoreChange >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> : <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                  {`${weeklyScoreChange >= 0 ? "+" : ""}${weeklyScoreChange.toFixed(1)} pts vs previous week`}
                </>}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Questions to revisit</p>
              <p className="mt-2 text-3xl font-bold">{thisWeekMissed}</p>
              <p className="mt-1 text-xs text-muted-foreground">Wrong and skipped in this week’s tests</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Active days</p>
              <p className="mt-2 text-3xl font-bold">{activeDays}<span className="ml-1 text-base font-medium text-muted-foreground">/ 7</span></p>
              <p className="mt-1 text-xs text-muted-foreground">Days with at least one completed test</p>
            </Card>
          </div>

          {!thisWeek.length && (
            <p className="mt-4 text-sm text-muted-foreground">No completed tests this week yet. Your next result will appear here.</p>
          )}
        </section>

        <section aria-labelledby="recommendations-title" className="border-t border-border py-8">
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            <h2 id="recommendations-title" className="text-2xl font-bold">Your next steps</h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {recommendations.map((recommendation, index) => {
              const Icon = recommendation.icon;
              return (
                <div key={recommendation.title} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700">{index + 1}</span>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 shrink-0 text-emerald-700" />{recommendation.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{recommendation.detail}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="shrink-0" onClick={() => navigate(recommendation.to)}>{recommendation.action}</Button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TncStudyPlan;