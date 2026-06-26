import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavigationHeader from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Clock,
  Trophy,
  Minus,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTncTest,
  saveTncAttempt,
  type TncExamWithQuestions,
  type TncQuestion,
} from "@/lib/tncApi";

type Phase = "instructions" | "quiz" | "results";

const OPTS = ["A", "B", "C", "D"] as const;

function calcScore(
  questions: TncQuestion[],
  answers: Record<string, string>,
  maxMarks: number,
  negativeMarks: number,
) {
  const marksPerQ = questions.length ? maxMarks / questions.length : 0;
  let correct = 0,
    wrong = 0,
    skipped = 0;
  for (const q of questions) {
    const ans = answers[q.rowId];
    if (!ans) skipped++;
    else if (ans === q.correctAnswer) correct++;
    else wrong++;
  }
  const score = Math.max(0, correct * marksPerQ - wrong * negativeMarks);
  return { score, correct, wrong, skipped };
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function grade(pct: number) {
  if (pct >= 80) return { label: "Excellent", color: "text-green-600" };
  if (pct >= 60) return { label: "Good", color: "text-emerald-600" };
  if (pct >= 40) return { label: "Average", color: "text-amber-600" };
  return { label: "Keep Practicing", color: "text-red-600" };
}

const QImage = ({ url }: { url: string }) => {
  const [err, setErr] = useState(false);
  if (err) return null;
  return (
    <img
      src={url}
      alt="Question illustration"
      onError={() => setErr(true)}
      className="my-3 max-h-72 rounded-lg border object-contain"
    />
  );
};

const TncQuiz = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<TncExamWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("instructions");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSecRef = useRef(0);

  useEffect(() => {
    if (!examId) return;
    let active = true;
    setLoading(true);
    fetchTncTest(examId)
      .then((res) => {
        if (!active) return;
        setExam(res);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Failed to load this test.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [examId]);

  // Timer
  useEffect(() => {
    if (phase !== "quiz") return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const questions = exam?.questions ?? [];
  const answeredCount = Object.keys(answers).length;
  const isLow = timeLeft < 120;

  const results = useMemo(() => {
    if (!exam) return null;
    return calcScore(questions, answers, exam.maxMarks, exam.negativeMarks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startQuiz = () => {
    if (!exam) return;
    const totalSec = parseInt(exam.durationMinutes) * 60 || 90 * 60;
    totalSecRef.current = totalSec;
    setTimeLeft(totalSec);
    setPhase("quiz");
  };

  const handleSubmit = async () => {
    if (!exam || phase === "results") return;
    setConfirmOpen(false);
    setPhase("results");
    const { score, correct, wrong, skipped } = calcScore(
      questions,
      answers,
      exam.maxMarks,
      exam.negativeMarks,
    );
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await saveTncAttempt({
        examId: exam.examId,
        examName: exam.name,
        userId: user?.id ?? "guest",
        userName: (user?.user_metadata?.full_name as string) ?? user?.email ?? "Guest",
        answers,
        score: Number(score.toFixed(2)),
        totalMarks: exam.maxMarks,
        correctCount: correct,
        wrongCount: wrong,
        skippedCount: skipped,
        timeTakenSeconds: totalSecRef.current - timeLeft,
      });
    } catch (e) {
      console.error("save attempt failed", e);
    } finally {
      setSaving(false);
    }
  };

  const attemptSubmit = () => {
    if (answeredCount < questions.length) setConfirmOpen(true);
    else handleSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto max-w-3xl space-y-4 px-4 py-10">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-muted-foreground">Test not found.</p>
          <Button className="mt-4" onClick={() => navigate("/tnc-tests")}>
            Back to Test Series
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Phase 1: Instructions ----------
  if (phase === "instructions") {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="container mx-auto max-w-3xl px-4 py-10">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/tnc-tests")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-foreground">{exam.name}</h1>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat icon={<FileText />} label="Questions" value={`${questions.length}`} />
              <Stat icon={<Clock />} label="Duration" value={`${parseInt(exam.durationMinutes)} min`} />
              <Stat icon={<Trophy />} label="Max Marks" value={`${exam.maxMarks}`} />
              <Stat icon={<Minus />} label="Negative" value={`-${exam.negativeMarks}`} />
            </div>
            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Instructions</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>The timer starts as soon as you begin and auto-submits at zero.</li>
                <li>Each wrong answer carries a negative mark of -{exam.negativeMarks}.</li>
                <li>You can navigate between questions freely before submitting.</li>
                <li>Unanswered questions are not penalised.</li>
              </ul>
            </div>
            <Button
              size="lg"
              className="mt-6 w-full"
              disabled={questions.length === 0}
              onClick={startQuiz}
            >
              {questions.length === 0 ? "No questions available" : "Start Quiz"}
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  // ---------- Phase 2: Quiz ----------
  if (phase === "quiz") {
    const q = questions[current];
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="container mx-auto max-w-5xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Q{current + 1} of {questions.length}
            </span>
            <div
              className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${
                isLow ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
              }`}
            >
              ⏱ {fmt(timeLeft)}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
            <Card className="p-6">
              <p className="text-lg font-medium text-foreground">{q.questionText}</p>
              {q.imageUrl && <QImage url={q.imageUrl} />}
              <div className="mt-5 space-y-3">
                {OPTS.map((opt) => {
                  const selected = answers[q.rowId] === opt;
                  const text = q[`option${opt}` as keyof TncQuestion] as string;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [q.rowId]: opt }))}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {opt}
                      </span>
                      <span className="pt-0.5 text-foreground">{text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="outline"
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => c - 1)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Prev
                </Button>
                {current < questions.length - 1 ? (
                  <Button onClick={() => setCurrent((c) => c + 1)} className="gap-2">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={attemptSubmit} className="gap-2">
                    Submit
                  </Button>
                )}
              </div>
            </Card>

            <Card className="h-fit p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Questions ({answeredCount}/{questions.length})
              </p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((qq, i) => {
                  const isAnswered = !!answers[qq.rowId];
                  const isCurrent = i === current;
                  return (
                    <button
                      key={qq.rowId}
                      onClick={() => setCurrent(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                        isCurrent
                          ? "border-2 border-primary bg-background text-primary"
                          : isAnswered
                          ? "bg-teal-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <Button className="mt-4 w-full" onClick={attemptSubmit}>
                Submit Test
              </Button>
            </Card>
          </div>
        </main>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit test?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered {answeredCount} of {questions.length} questions.{" "}
                {questions.length - answeredCount} are still unanswered. Are you sure you want to
                submit?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Going</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ---------- Phase 3: Results ----------
  const r = results ?? calcScore(questions, answers, exam.maxMarks, exam.negativeMarks);
  const pct = exam.maxMarks ? (r.score / exam.maxMarks) * 100 : 0;
  const g = grade(pct);

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{exam.name}</p>
          <p className={`mt-2 text-4xl font-bold ${g.color}`}>{r.score.toFixed(2)}</p>
          <p className="text-muted-foreground">out of {exam.maxMarks} marks</p>
          <p className={`mt-1 text-lg font-semibold ${g.color}`}>{g.label}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <ResultStat label="Correct" value={r.correct} color="text-green-600" icon={<CheckCircle2 />} />
            <ResultStat label="Wrong" value={r.wrong} color="text-red-600" icon={<XCircle />} />
            <ResultStat label="Skipped" value={r.skipped} color="text-amber-600" icon={<MinusCircle />} />
          </div>
          {saving && <p className="mt-3 text-xs text-muted-foreground">Saving your result…</p>}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/tnc-tests")}>
              Back to Test Series
            </Button>
          </div>
        </Card>

        <h2 className="mb-4 mt-10 text-xl font-bold text-foreground">Answer Review</h2>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAns = answers[q.rowId];
            const isCorrect = userAns === q.correctAnswer;
            const skipped = !userAns;
            const border = skipped
              ? "border-amber-400"
              : isCorrect
              ? "border-green-500"
              : "border-red-500";
            return (
              <Card key={q.rowId} className={`border-l-4 p-5 ${border}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Q{i + 1}</span>
                  {skipped ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">Skipped</Badge>
                  ) : isCorrect ? (
                    <Badge className="bg-green-600 hover:bg-green-600">Correct</Badge>
                  ) : (
                    <Badge variant="destructive">Wrong</Badge>
                  )}
                </div>
                <p className="font-medium text-foreground">{q.questionText}</p>
                {q.imageUrl && <QImage url={q.imageUrl} />}
                <div className="mt-3 space-y-2 text-sm">
                  {OPTS.map((opt) => {
                    const text = q[`option${opt}` as keyof TncQuestion] as string;
                    const isAns = q.correctAnswer === opt;
                    const isUser = userAns === opt;
                    return (
                      <div
                        key={opt}
                        className={`flex items-start gap-2 rounded-md px-3 py-2 ${
                          isAns
                            ? "bg-green-50 text-green-800"
                            : isUser
                            ? "bg-red-50 text-red-800"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="font-semibold">{opt}.</span>
                        <span>{text}</span>
                        {isAns && <span className="ml-auto text-xs font-medium">Correct</span>}
                        {isUser && !isAns && <span className="ml-auto text-xs font-medium">Your answer</span>}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div
                    className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: q.explanation }}
                  />
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-4 text-center">
    <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">
      {icon}
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const ResultStat = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-card p-4">
    <div className={`mx-auto mb-1 flex items-center justify-center ${color} [&_svg]:h-5 [&_svg]:w-5`}>
      {icon}
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default TncQuiz;
