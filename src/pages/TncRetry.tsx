import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Loader2, RotateCcw, X } from "lucide-react";
import NavigationHeader from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import TncQuestionImage from "@/components/TncQuestionImage";
import TncExplanation from "@/components/TncExplanation";
import { supabase } from "@/integrations/supabase/client";
import { cleanHtml, stripHtml } from "@/lib/sanitizeHtml";
import { fetchTncAttempt, fetchTncReview, fetchTncTest, type TncQuestion } from "@/lib/tncApi";
import { withTimeout } from "@/lib/withTimeout";

const OPTIONS = ["A", "B", "C", "D"] as const;

const Html = ({ html, className }: { html: string | null | undefined; className?: string }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: cleanHtml(html) }} />
);

const TncRetry = () => {
  const { examId = "", attemptId = "" } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<TncQuestion[]>([]);
  const [examName, setExamName] = useState("TNC Practice");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [outcomes, setOutcomes] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data: { user } } = await withTimeout(
          supabase.auth.getUser(),
          10_000,
          "Sign-in check timed out",
        );
        if (!user) {
          navigate(`/auth?redirect=${encodeURIComponent(`/tnc-tests/${examId}/retry/${attemptId}`)}`, { replace: true });
          return;
        }

        const { data: ownedAttempt, error: ownershipError } = await withTimeout(
          supabase
            .from("quiz_attempts")
            .select("id")
            .eq("id", Number(attemptId))
            .maybeSingle(),
          15_000,
          "Attempt access check timed out",
        );
        if (ownershipError) throw ownershipError;
        if (!ownedAttempt) throw new Error("This retry session is only available to the attempt owner.");

        const [attempt, review] = await Promise.all([
          fetchTncAttempt(attemptId),
          fetchTncReview(attemptId),
        ]);
        let snapshot = attempt.questionSnapshot;
        if (!snapshot.length) {
          snapshot = (await fetchTncTest(attempt.examId)).questions;
        }
        const reviewById = new Map(review.review.map((item) => [item.rowId, item]));
        const missed = snapshot.flatMap((question) => {
          const answerKey = reviewById.get(question.rowId);
          if (!answerKey) return [];
          const questionWithKey = {
            ...question,
            correctAnswer: answerKey.correctAnswer,
            explanation: answerKey.explanation,
            videoUrl: answerKey.videoUrl ?? question.videoUrl,
          };
          return attempt.answers[question.rowId] === answerKey.correctAnswer ? [] : [questionWithKey];
        });

        if (!active) return;
        setExamName(attempt.examName ?? "TNC Practice");
        setQuestions(missed);
      } catch (loadError) {
        console.error("Could not load TNC retry questions", loadError);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [attemptId, examId, navigate]);

  const question = questions[current];
  const correctCount = outcomes.filter(Boolean).length;

  const finishQuestion = () => {
    if (!question || !selected) return;
    setOutcomes((currentOutcomes) => [...currentOutcomes, selected === question.correctAnswer]);
    setChecked(true);
  };

  const nextQuestion = () => {
    if (current === questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrent((index) => index + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Retry Missed Questions | Test Sagar</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Button variant="ghost" className="mb-5 gap-2" onClick={() => navigate(`/tnc-tests/${examId}/result/${attemptId}`)}>
          <ArrowLeft className="h-4 w-4" /> Back to result
        </Button>

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : error ? (
          <Card className="space-y-4 p-8 text-center">
            <p className="font-semibold">We couldn’t load this practice session.</p>
            <p className="text-sm text-muted-foreground">Open the result again and try once more.</p>
            <Button onClick={() => navigate(`/tnc-tests/${examId}/result/${attemptId}`)}>Back to result</Button>
          </Card>
        ) : !questions.length ? (
          <Card className="space-y-4 p-8 text-center">
            <CircleCheck className="mx-auto h-9 w-9 text-emerald-600" />
            <h1 className="text-2xl font-bold">Nothing to retry</h1>
            <p className="text-muted-foreground">You answered every question correctly in this attempt.</p>
            <Button onClick={() => navigate(`/tnc-tests/${examId}/result/${attemptId}`)}>View result</Button>
          </Card>
        ) : finished ? (
          <Card className="space-y-5 p-8 text-center">
            <CircleCheck className="mx-auto h-10 w-10 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold">Practice complete</h1>
              <p className="mt-2 text-muted-foreground">
                You got {correctCount} of {questions.length} right on this retry.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => {
                setCurrent(0);
                setSelected(null);
                setChecked(false);
                setOutcomes([]);
                setFinished(false);
              }}>
                <RotateCcw className="h-4 w-4" /> Retry again
              </Button>
              <Button onClick={() => navigate("/tnc-study")}>My study plan</Button>
            </div>
            <p className="text-xs text-muted-foreground">Practice mode only; this does not change your leaderboard score.</p>
          </Card>
        ) : question ? (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-700">Missed question practice</p>
                <h1 className="mt-1 text-2xl font-bold">{stripHtml(examName)}</h1>
              </div>
              <span className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</span>
            </div>
            <Progress value={((current + 1) / questions.length) * 100} className="mb-5 h-2" />
            <Card className="p-5 sm:p-7">
              <Html className="block text-lg font-semibold leading-relaxed text-foreground" html={question.questionText} />
              {question.imageUrl && <TncQuestionImage url={question.imageUrl} />}
              <div role="radiogroup" aria-label="Answer choices" className="mt-6 space-y-2.5">
                {OPTIONS.map((option) => {
                  const optionText = question[`option${option}` as keyof TncQuestion] as string;
                  const isCorrect = checked && option === question.correctAnswer;
                  const isWrongChoice = checked && option === selected && option !== question.correctAnswer;
                  const isSelected = selected === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={checked}
                      onClick={() => setSelected(option)}
                      className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
                        isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" :
                        isWrongChoice ? "border-red-400 bg-red-50 text-red-900" :
                        isSelected ? "border-primary bg-primary/5" :
                        "border-border hover:bg-muted/60"
                      }`}
                    >
                      <span className="font-bold">{option}.</span>
                      <Html className="min-w-0 flex-1" html={optionText} />
                      {isCorrect && <Check className="h-4 w-4 shrink-0" />}
                      {isWrongChoice && <X className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {checked && (
                <div className={`mt-5 rounded-md p-4 text-sm ${selected === question.correctAnswer ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
                  <p className="font-semibold">{selected === question.correctAnswer ? "Correct" : `The correct answer is ${question.correctAnswer}`}</p>
                  {question.explanation && (
                    <TncExplanation html={question.explanation} videoUrl={question.videoUrl} bare className="mt-2" />
                  )}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                {!checked ? (
                  <Button className="gap-2" disabled={!selected} onClick={finishQuestion}>Check answer <Check className="h-4 w-4" /></Button>
                ) : (
                  <Button className="gap-2" onClick={nextQuestion}>
                    {current === questions.length - 1 ? "Finish practice" : "Next question"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading question
          </div>
        )}
      </main>
    </div>
  );
};

export default TncRetry;