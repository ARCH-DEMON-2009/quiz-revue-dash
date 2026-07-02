import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NavigationHeader from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  Download,
  Trophy,
  RefreshCw,
} from "lucide-react";
import {
  fetchTncAttempt,
  fetchTncTest,
  type TncSharedAttempt,
  type TncExamWithQuestions,
  type TncQuestion,
} from "@/lib/tncApi";
import { cleanHtml, stripHtml } from "@/lib/sanitizeHtml";
import { downloadTncResultPdf } from "@/lib/tncPdf";
import TncQuestionImage from "@/components/TncQuestionImage";

const OPTS = ["A", "B", "C", "D"] as const;
const SITE = "https://quiz-revue-dash.lovable.app";

const Html = ({ html, className }: { html: string | null | undefined; className?: string }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: cleanHtml(html) }} />
);




function grade(pct: number) {
  if (pct >= 80) return { label: "Excellent", color: "text-green-600" };
  if (pct >= 60) return { label: "Good", color: "text-emerald-600" };
  if (pct >= 40) return { label: "Average", color: "text-amber-600" };
  return { label: "Keep Practicing", color: "text-red-600" };
}

const TncSharedResult = () => {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<TncSharedAttempt | null>(null);
  const [exam, setExam] = useState<TncExamWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const load = () => {
    if (!examId || !attemptId) return;
    setLoading(true);
    setError(false);
    Promise.all([fetchTncAttempt(attemptId), fetchTncTest(examId)])
      .then(([a, e]) => {
        setAttempt(a);
        setExam(e);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [examId, attemptId]);

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

  if (error || !attempt || !exam) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground">This shared result could not be found.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
            <Button onClick={() => navigate("/tnc-tests")}>Back to Test Series</Button>
          </div>
        </div>
      </div>
    );
  }

  const questions = exam.questions;
  const answers = attempt.answers;
  const pct = attempt.totalMarks ? (attempt.score / attempt.totalMarks) * 100 : 0;
  const g = grade(pct);
  const examName = attempt.examName ?? exam.name;
  const canonical = `${SITE}/tnc-tests/${examId}/result/${attemptId}`;

  const handleDownloadPdf = () => {
    downloadTncResultPdf({
      examName,
      score: attempt.score,
      maxMarks: attempt.totalMarks,
      correct: attempt.correctCount,
      wrong: attempt.wrongCount,
      skipped: attempt.skippedCount,
      questions,
      answers,
      userName: attempt.userName,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${stripHtml(examName)} Result — ${attempt.userName} | TNC Nursing Test`}</title>
        <meta
          name="description"
          content={`${attempt.userName} scored ${attempt.score.toFixed(2)}/${attempt.totalMarks} on ${stripHtml(examName)}.`}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${stripHtml(examName)} Result — ${attempt.userName}`} />
        <meta
          property="og:description"
          content={`Scored ${attempt.score.toFixed(2)}/${attempt.totalMarks}. View the full review.`}
        />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            <Html html={examName} />
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{attempt.userName}</p>
          <p className={`mt-2 text-4xl font-bold ${g.color}`}>{attempt.score.toFixed(2)}</p>
          <p className="text-muted-foreground">out of {attempt.totalMarks} marks</p>
          <p className={`mt-1 text-lg font-semibold ${g.color}`}>{g.label}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Correct" value={attempt.correctCount} color="text-green-600" icon={<CheckCircle2 />} />
            <Stat label="Wrong" value={attempt.wrongCount} color="text-red-600" icon={<XCircle />} />
            <Stat label="Skipped" value={attempt.skippedCount} color="text-amber-600" icon={<MinusCircle />} />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button className="gap-2" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/tnc-tests/${examId}/leaderboard`)}>
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
            <Button onClick={() => navigate(`/tnc-tests/${examId}`)}>Take This Test</Button>
          </div>
        </Card>

        <h2 className="mb-4 mt-10 text-xl font-bold text-foreground">Answer Review</h2>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAns = answers[q.rowId];
            const isCorrect = userAns === q.correctAnswer;
            const skipped = !userAns;
            const border = skipped ? "border-amber-400" : isCorrect ? "border-green-500" : "border-red-500";
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
                <Html className="block font-medium text-foreground" html={q.questionText} />
                {q.imageUrl && <TncQuestionImage url={q.imageUrl} />}
                <div className="mt-3 space-y-2 text-sm">
                  {OPTS.map((opt) => {
                    const text = q[`option${opt}` as keyof TncQuestion] as string;
                    const isAns = q.correctAnswer === opt;
                    const isUser = userAns === opt;
                    return (
                      <div
                        key={opt}
                        className={`flex items-start gap-2 rounded-md px-3 py-2 ${
                          isAns ? "bg-green-50 text-green-800" : isUser ? "bg-red-50 text-red-800" : "text-muted-foreground"
                        }`}
                      >
                        <span className="font-semibold">{opt}.</span>
                        <Html html={text} />
                        {isAns && <span className="ml-auto whitespace-nowrap text-xs font-medium">Correct</span>}
                        {isUser && !isAns && <span className="ml-auto whitespace-nowrap text-xs font-medium">Their answer</span>}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && stripHtml(q.explanation) && (
                  <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Explanation: </span>
                    <Html html={q.explanation} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

const Stat = ({
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
    <div className={`mx-auto mb-1 flex items-center justify-center ${color} [&_svg]:h-5 [&_svg]:w-5`}>{icon}</div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default TncSharedResult;
