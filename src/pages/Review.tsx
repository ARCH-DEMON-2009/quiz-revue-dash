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
            
            // Create mapping from numeric indices to option keys
            const optionKeys = Object.keys(options).sort();
            
            // Normalize answer to option key
            // Handles: "A", "B", "0", "1", etc.
            const normalizeToKey = (ans: string | null | undefined): string | null => {
              if (!ans) return null;
              const trimmedAns = ans.trim();
              const upperAns = trimmedAns.toUpperCase();
              
              // If it's already a valid key (A, B, C, D)
              if (optionKeys.map(k => k.toUpperCase()).includes(upperAns)) {
                return upperAns;
              }
              
              // If it's a numeric answer, map to key
              const numericVal = parseInt(trimmedAns, 10);
              if (!isNaN(numericVal)) {
                // Handle 0-based index (0->A, 1->B, 2->C, 3->D)
                if (numericVal >= 0 && numericVal < optionKeys.length) {
                  return optionKeys[numericVal].toUpperCase();
                }
                // Handle 1-based index (1->A, 2->B, 3->C, 4->D)
                if (numericVal >= 1 && numericVal <= optionKeys.length) {
                  return optionKeys[numericVal - 1].toUpperCase();
                }
              }
              
              return trimmedAns;
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

                  {/* MCQ Options - Show all options with highlighting */}
                  {hasOptions && !isTextQuestion && (
                    <div className="space-y-2 mt-4">
                      {Object.entries(options).map(([key, value]) => {
                        const keyUpper = key.toUpperCase();
                        const isUserAnswer = userAnswerKey === keyUpper;
                        const isCorrectAnswer = correctAnswerKey === keyUpper;

                        return (
                          <div
                            key={key}
                            className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                              isCorrectAnswer && isUserAnswer
                                ? "border-success bg-success/15"
                                : isCorrectAnswer
                                ? "border-success bg-success/10"
                                : isUserAnswer
                                ? "border-destructive bg-destructive/10"
                                : "border-border bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`font-bold text-lg ${
                                isCorrectAnswer ? "text-success" : isUserAnswer ? "text-destructive" : "text-muted-foreground"
                              }`}>{keyUpper}.</span>
                              <div className="flex-1">
                                <p className="text-base">{value}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {isCorrectAnswer && isUserAnswer && (
                                    <span className="text-xs font-medium text-success bg-success/20 px-2 py-0.5 rounded">✓ Correct! You selected this</span>
                                  )}
                                  {isCorrectAnswer && !isUserAnswer && (
                                    <span className="text-xs font-medium text-success bg-success/20 px-2 py-0.5 rounded">✓ Correct Answer</span>
                                  )}
                                  {isUserAnswer && !isCorrectAnswer && (
                                    <span className="text-xs font-medium text-destructive bg-destructive/20 px-2 py-0.5 rounded">✗ Your Answer (Wrong)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary box for quick reference */}
                  <div className="mt-4 p-3 bg-muted/50 border rounded-lg">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Correct Answer: </span>
                        <span className="font-semibold text-success">
                          {correctAnswerKey || question.correct}
                          {options[correctAnswerKey] && ` (${options[correctAnswerKey]})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Your Answer: </span>
                        {answer?.selected ? (
                          <span className={`font-semibold ${answer.isCorrect ? "text-success" : "text-destructive"}`}>
                            {userAnswerKey || answer.selected}
                            {options[userAnswerKey || ''] && ` (${options[userAnswerKey || '']})`}
                          </span>
                        ) : (
                          <span className="font-semibold text-warning">Skipped</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Text Answer Display */}
                  {isTextQuestion && (
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Correct Answer:</p>
                        <p className="font-medium text-success">{question.correct}</p>
                      </div>
                      {answer?.selected && (
                        <div className={`p-3 rounded-lg border-2 ${
                          answer.isCorrect ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
                        }`}>
                          <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                          <p className={`font-medium ${answer.isCorrect ? "text-success" : "text-destructive"}`}>{answer.selected}</p>
                        </div>
                      )}
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
