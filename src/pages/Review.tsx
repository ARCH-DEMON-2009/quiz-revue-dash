import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Circle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  options: any;
  correct: string;
  subject: string;
  image?: string;
  type?: string;
}

interface UserAnswer {
  questionId: string;
  selected: string | null;
  isCorrect: boolean;
}

const Review = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [testId, setTestId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");

  useEffect(() => {
    fetchReviewData();
  }, [resultId]);

  const fetchReviewData = async () => {
    try {
      const { data: resultData, error: resultError } = await supabase
        .from("test_results")
        .select("test_id, user_answers")
        .eq("id", resultId)
        .single();

      if (resultError) throw resultError;

      setTestId(resultData.test_id);
      setUserAnswers((resultData.user_answers as any) || []);

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("test_id", resultData.test_id);

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error) {
      toast.error("Failed to load review data");
      console.error(error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  const getAnswerForQuestion = (questionId: string) => {
    return userAnswers.find(a => a.questionId === questionId);
  };

  const getFilteredQuestions = () => {
    return questions.filter(q => {
      const answer = getAnswerForQuestion(q.id);
      if (filter === "all") return true;
      if (filter === "correct") return answer?.isCorrect;
      if (filter === "wrong") return answer && !answer.isCorrect && answer.selected;
      if (filter === "skipped") return !answer || !answer.selected;
      return true;
    });
  };

  const filteredQuestions = getFilteredQuestions();

  const getStatusIcon = (answer: UserAnswer | undefined) => {
    if (!answer || !answer.selected) {
      return <Circle className="h-5 w-5 text-warning" />;
    }
    return answer.isCorrect ? (
      <CheckCircle2 className="h-5 w-5 text-success" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    );
  };

  const getStatusText = (answer: UserAnswer | undefined) => {
    if (!answer || !answer.selected) return "Skipped";
    return answer.isCorrect ? "Correct" : "Wrong";
  };

  const getStatusColor = (answer: UserAnswer | undefined) => {
    if (!answer || !answer.selected) return "warning";
    return answer.isCorrect ? "success" : "destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(`/results/${resultId}`)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Answer Review</h1>
          
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({questions.length})</TabsTrigger>
              <TabsTrigger value="correct">
                Correct ({userAnswers.filter(a => a.isCorrect).length})
              </TabsTrigger>
              <TabsTrigger value="wrong">
                Wrong ({userAnswers.filter(a => !a.isCorrect && a.selected).length})
              </TabsTrigger>
              <TabsTrigger value="skipped">
                Skipped ({questions.length - userAnswers.filter(a => a.selected).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-6">
        {filteredQuestions.map((question, idx) => {
            const answer = getAnswerForQuestion(question.id);
            
            // Parse options - handle various formats from database
            const parseOptions = (opts: any): Record<string, string> => {
              if (!opts) return {};
              
              // If it's already a proper object with A, B, C, D keys
              if (typeof opts === 'object' && !Array.isArray(opts)) {
                // Check if it has valid option keys
                const keys = Object.keys(opts);
                if (keys.some(k => ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'].includes(k))) {
                  return opts;
                }
              }
              
              // If it's a string, try to parse it
              if (typeof opts === 'string') {
                try {
                  const parsed = JSON.parse(opts);
                  if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                  }
                } catch {
                  // Not valid JSON
                }
              }
              
              // If it's an array, convert to object
              if (Array.isArray(opts)) {
                const result: Record<string, string> = {};
                const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
                opts.forEach((val, i) => {
                  if (i < optionKeys.length && typeof val === 'string') {
                    result[optionKeys[i]] = val;
                  }
                });
                return result;
              }
              
              return {};
            };
            
            const options = parseOptions(question.options);
            const hasOptions = Object.keys(options).length > 0;
            const isTextQuestion = !hasOptions || question.type === 'text';
            
            // Map numeric answers (1, 2, 3, 4) to option keys (A, B, C, D)
            const optionKeys = Object.keys(options).sort();
            const numericToKeyMap: Record<string, string> = {};
            optionKeys.forEach((key, index) => {
              numericToKeyMap[String(index + 1)] = key;
            });
            
            // Normalize answer to option key
            const normalizeToKey = (ans: string | null | undefined): string | null => {
              if (!ans) return null;
              const upperAns = ans.toUpperCase();
              // If it's already a valid key (A, B, C, D)
              if (optionKeys.map(k => k.toUpperCase()).includes(upperAns)) {
                return upperAns;
              }
              // If it's a numeric answer (1, 2, 3, 4), map to key
              if (numericToKeyMap[ans]) {
                return numericToKeyMap[ans].toUpperCase();
              }
              return ans;
            };
            
            const userAnswerKey = normalizeToKey(answer?.selected);
            const correctAnswerKey = normalizeToKey(question.correct);

            return (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(answer)}
                      <Badge variant={getStatusColor(answer) as any}>
                        {getStatusText(answer)}
                      </Badge>
                      <Badge variant="secondary">{question.subject}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">Q{idx + 1}</span>
                  </div>

                  {question.image && (
                    <div className="mb-4">
                      <img 
                        src={question.image} 
                        alt="Question" 
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}
                  <p className="text-lg mb-4">{question.question_text}</p>

                  {/* MCQ Options */}
                  {hasOptions && !isTextQuestion && (
                    <div className="space-y-2">
                      {Object.entries(options).map(([key, value]) => {
                        const keyUpper = key.toUpperCase();
                        const isUserAnswer = userAnswerKey === keyUpper;
                        const isCorrectAnswer = correctAnswerKey === keyUpper;

                        return (
                          <div
                            key={key}
                            className={`p-4 rounded-lg border-2 ${
                              isCorrectAnswer
                                ? "border-success bg-success/10"
                                : isUserAnswer
                                ? "border-destructive bg-destructive/10"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-semibold">{key}.</span>
                              <div className="flex-1">
                                <p>{value}</p>
                                {isCorrectAnswer && (
                                  <p className="text-sm text-success mt-1 font-medium">✓ Correct Answer</p>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <p className="text-sm text-destructive mt-1 font-medium">✗ Your Answer</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Answer Display */}
                  {isTextQuestion && (
                    <div className="space-y-3">
                      {answer?.selected && (
                        <div className={`p-4 rounded-lg border-2 ${
                          answer.isCorrect ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
                        }`}>
                          <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                          <p className="font-medium">{answer.selected}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show correct answer for wrong/skipped questions */}
                  {(!answer?.isCorrect || !answer?.selected) && (
                    <div className="mt-4 p-3 bg-success/5 border border-success/20 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Correct Answer:</p>
                      <p className="font-medium text-success">
                        {correctAnswerKey || question.correct}
                        {(options[correctAnswerKey || question.correct] || options[question.correct]) && ` - ${options[correctAnswerKey || question.correct] || options[question.correct]}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredQuestions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No questions found for this filter</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Review;
