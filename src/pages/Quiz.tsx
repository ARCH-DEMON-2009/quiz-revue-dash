import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AccessGuard, useAccessStatus } from "@/components/AccessGuard";


interface Question {
  id: string;
  question_text: string;
  image: string | null;
  options: any;
  subject: string;
  marks: number;
  negative_marks: number;
  type: string;
}

interface Answer {
  questionId: string;
  selected: string | null;
  markedForReview?: boolean;
}

interface SubjectGroup {
  subject: string;
  questions: Question[];
  startIndex: number;
}

const Quiz = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testName, setTestName] = useState("");
  const [textAnswer, setTextAnswer] = useState("");

  useEffect(() => {
    fetchQuizData();
  }, [testId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion) {
      const currentAnswer = answers.get(currentQuestion.id);
      setTextAnswer(currentAnswer?.selected || "");
    }
  }, [currentIndex, questions]);

  const fetchQuizData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to take the test");
        navigate("/auth");
        return;
      }

      const [questionsRes, testRes] = await Promise.all([
        supabase.from("questions").select("id, question_text, image, options, subject, marks, negative_marks, type").eq("test_id", testId),
        supabase.from("tests").select("name, duration_minutes").eq("id", testId).maybeSingle()
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (testRes.error) throw testRes.error;
      
      if (!testRes.data) {
        toast.error("Test not found");
        navigate("/");
        return;
      }

      setQuestions(questionsRes.data || []);
      setTestName(testRes.data.name);
      setTimeLeft((testRes.data.duration_minutes || 180) * 60);
    } catch (error) {
      toast.error("Failed to load quiz");
      console.error(error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };


  const subjectGroups: SubjectGroup[] = questions.reduce((acc, question, index) => {
    const existingGroup = acc.find(g => g.subject === question.subject);
    if (existingGroup) {
      existingGroup.questions.push(question);
    } else {
      acc.push({
        subject: question.subject,
        questions: [question],
        startIndex: index
      });
    }
    return acc;
  }, [] as SubjectGroup[]);

  const handleAnswer = (option: string) => {
    const question = questions[currentIndex];
    const existing = answers.get(question.id);
    setAnswers(new Map(answers.set(question.id, {
      questionId: question.id,
      selected: option,
      markedForReview: existing?.markedForReview || false
    })));
  };

  const handleTextAnswer = (value: string) => {
    setTextAnswer(value);
    const question = questions[currentIndex];
    const existing = answers.get(question.id);
    setAnswers(new Map(answers.set(question.id, {
      questionId: question.id,
      selected: value,
      markedForReview: existing?.markedForReview || false
    })));
  };

  const handleMarkForReview = () => {
    const question = questions[currentIndex];
    const existing = answers.get(question.id);
    setAnswers(new Map(answers.set(question.id, {
      questionId: question.id,
      selected: existing?.selected || null,
      markedForReview: true
    })));
    toast.success("Marked for review");
  };

  const handleClear = () => {
    const question = questions[currentIndex];
    const newAnswers = new Map(answers);
    newAnswers.delete(question.id);
    setAnswers(newAnswers);
    setTextAnswer("");
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSaveAndNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to submit test");
        navigate("/auth");
        return;
      }

      // Prepare user answers for server-side validation
      const userAnswersArray = Array.from(answers.entries()).map(([qId, ans]) => ({
        questionId: qId,
        selected: ans.selected
      }));

      const timeTaken = ((questions[0] ? 180 : 0) * 60) - timeLeft;

      // Submit to Edge Function for secure validation
      const { data, error } = await supabase.functions.invoke('validate-quiz-answers', {
        body: {
          testId,
          userAnswers: userAnswersArray,
          timeTaken,
          testName
        }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to validate answers');
      }
      
      toast.success("Test submitted successfully!");
      navigate(`/results/${data.resultId}`);
    } catch (error) {
      toast.error("Failed to submit test");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No questions available for this test</p>
            <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion.id);
  
  // Parse options - handle both string, object, and array formats
  const parseOptions = (opts: any): Record<string, string> => {
    if (!opts) return {};
    
    // If it's a string, try to parse it
    if (typeof opts === 'string') {
      try {
        const parsed = JSON.parse(opts);
        return parseOptions(parsed); // Recursively parse
      } catch {
        return {};
      }
    }
    
    // If it's an array, convert to object with A, B, C, D keys
    if (Array.isArray(opts)) {
      const result: Record<string, string> = {};
      const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
      opts.forEach((val, i) => {
        if (i < optionKeys.length) {
          result[optionKeys[i]] = String(val);
        }
      });
      return result;
    }
    
    // If it's an object, return as is
    if (typeof opts === 'object') {
      return opts;
    }
    
    return {};
  };
  
  const options = parseOptions(currentQuestion.options);
  const isTextQuestion = Object.keys(options).length === 0 || currentQuestion.type === 'text';

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (qId: string) => {
    const ans = answers.get(qId);
    if (ans?.markedForReview) return 'marked';
    if (ans?.selected) return 'answered';
    return 'unanswered';
  };

  const answeredCount = Array.from(answers.values()).filter(a => a.selected && !a.markedForReview).length;
  const markedCount = Array.from(answers.values()).filter(a => a.markedForReview).length;

  return (
    <AccessGuard>
    {/* Interstitial Ad for free users */}
    <InterstitialAd 
      open={showInterstitial} 
      onClose={handleCloseInterstitial}
      countdownSeconds={5}
    />
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold truncate">{testName}</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-lg font-mono">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className={timeLeft < 300 ? "text-destructive" : ""}>{formatTime(timeLeft)}</span>
              </div>
              <Button onClick={handleSubmit} size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground text-xs sm:text-sm px-2 sm:px-4">
                <span className="hidden sm:inline">Submit Test</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Question Navigation Sidebar - Hidden on mobile, shown on lg+ */}
        <div className="w-64 xl:w-80 bg-card border-r hidden lg:block">
          <div className="p-3 xl:p-4 border-b bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 xl:h-5 xl:w-5" />
              <h2 className="font-bold text-sm xl:text-base">Question Navigation</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs xl:text-sm mt-3">
              <div className="text-center">
                <div className="text-lg xl:text-2xl font-bold text-success">{answeredCount}</div>
                <div className="text-muted-foreground text-xs">Answered</div>
              </div>
              <div className="text-center">
                <div className="text-lg xl:text-2xl font-bold">{questions.length - answers.size}</div>
                <div className="text-muted-foreground text-xs">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-lg xl:text-2xl font-bold text-warning">{markedCount}</div>
                <div className="text-muted-foreground text-xs">Marked</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              {Math.round((answers.size / questions.length) * 100)}% Complete
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)] xl:h-[calc(100vh-220px)]">
            <div className="p-3 xl:p-4 space-y-4 xl:space-y-6">
              {subjectGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <h3 className="text-xs xl:text-sm font-semibold mb-2 xl:mb-3 flex items-center gap-2">
                    {group.subject}
                    <span className="text-xs text-muted-foreground">({group.questions.length})</span>
                  </h3>
                  <div className="grid grid-cols-5 gap-1.5 xl:gap-2">
                    {group.questions.map((q, idx) => {
                      const globalIdx = questions.findIndex(question => question.id === q.id);
                      const status = getQuestionStatus(q.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIndex(globalIdx)}
                          className={`w-8 h-8 xl:w-10 xl:h-10 rounded-lg border-2 font-semibold text-xs xl:text-sm transition-all ${
                            globalIdx === currentIndex
                              ? "border-primary bg-primary text-primary-foreground shadow-md"
                              : status === 'answered'
                              ? "border-success bg-success/10 text-success hover:bg-success/20"
                              : status === 'marked'
                              ? "border-warning bg-warning/10 text-warning hover:bg-warning/20"
                              : "border-border hover:border-primary/50 hover:bg-muted"
                          }`}
                        >
                          {globalIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-success bg-success/10" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-warning bg-warning/10" />
                <span>Marked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-border" />
                <span>Skipped</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden fixed bottom-4 left-4 z-20 rounded-full shadow-lg">
              <FileText className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Question Navigation</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)]">
              <div className="p-4 space-y-6">
                {subjectGroups.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <h3 className="text-sm font-semibold mb-3">{group.subject} ({group.questions.length})</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {group.questions.map((q, idx) => {
                        const globalIdx = questions.findIndex(question => question.id === q.id);
                        const status = getQuestionStatus(q.id);
                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentIndex(globalIdx)}
                            className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm ${
                              globalIdx === currentIndex
                                ? "border-primary bg-primary text-primary-foreground"
                                : status === 'answered'
                                ? "border-success bg-success/10"
                                : status === 'marked'
                                ? "border-warning bg-warning/10"
                                : "border-border"
                            }`}
                          >
                            {globalIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main Question Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-4xl">
            <Card className="mb-4 sm:mb-6">
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">Q{currentIndex + 1}/{questions.length}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs sm:text-sm shrink-0">{currentQuestion.subject}</Badge>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {currentQuestion.image && (
                    <div className="mb-4">
                      <img 
                        src={currentQuestion.image} 
                        alt="Question" 
                        className="max-w-full h-auto rounded-lg border shadow-sm"
                      />
                    </div>
                  )}
                  {currentQuestion.question_text && (
                    <p className="text-lg leading-relaxed">{currentQuestion.question_text}</p>
                  )}
                </div>
                
                {isTextQuestion ? (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Your Answer:</label>
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={textAnswer}
                      onChange={(e) => handleTextAnswer(e.target.value)}
                      className="text-lg py-6"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(options).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => handleAnswer(key)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          currentAnswer?.selected === key
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-muted"
                        }`}
                      >
                        <span className="font-semibold mr-3">{key}.</span>
                        {value}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-sm text-muted-foreground">
                  <span>Marks: +{currentQuestion.marks}</span>
                  <span className="mx-2">|</span>
                  <span>Negative: -{currentQuestion.negative_marks}</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip}>
                  Skip
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="default" className="bg-warning hover:bg-warning/90 text-warning-foreground" onClick={handleMarkForReview}>
                  Mark for Review
                </Button>
                <Button onClick={handleSaveAndNext}>
                  Save & Next
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    </AccessGuard>
  );
};

export default Quiz;
