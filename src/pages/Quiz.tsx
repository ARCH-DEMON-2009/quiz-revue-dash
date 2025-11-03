import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  options: any;
  correct: string;
  subject: string;
  marks: number;
  negative_marks: number;
}

interface Answer {
  questionId: string;
  selected: string | null;
  isCorrect: boolean;
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

  const fetchQuizData = async () => {
    try {
      const [questionsRes, testRes] = await Promise.all([
        supabase.from("questions").select("*").eq("test_id", testId),
        supabase.from("tests").select("name, duration_minutes").eq("id", testId).single()
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (testRes.error) throw testRes.error;

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

  const handleAnswer = (option: string) => {
    const question = questions[currentIndex];
    setAnswers(new Map(answers.set(question.id, {
      questionId: question.id,
      selected: option,
      isCorrect: option === question.correct
    })));
  };

  const handleSubmit = async () => {
    try {
      const correct = Array.from(answers.values()).filter(a => a.isCorrect).length;
      const incorrect = Array.from(answers.values()).filter(a => !a.isCorrect && a.selected).length;
      const skipped = questions.length - answers.size;
      
      const marksObtained = Array.from(answers.values()).reduce((total, ans) => {
        const q = questions.find(q => q.id === ans.questionId);
        if (!q) return total;
        if (ans.isCorrect) return total + (q.marks || 4);
        if (ans.selected) return total - (q.negative_marks || 1);
        return total;
      }, 0);

      const maxMarks = questions.reduce((total, q) => total + (q.marks || 4), 0);
      const percentage = (marksObtained / maxMarks) * 100;

      const subjectStats: any = {};
      questions.forEach(q => {
        if (!subjectStats[q.subject]) {
          subjectStats[q.subject] = { correct: 0, total: 0 };
        }
        subjectStats[q.subject].total++;
        const ans = answers.get(q.id);
        if (ans?.isCorrect) subjectStats[q.subject].correct++;
      });

      const userAnswers = Array.from(answers.entries()).map(([qId, ans]) => ({
        questionId: qId,
        selected: ans.selected,
        isCorrect: ans.isCorrect
      }));

      const { data, error } = await supabase
        .from("test_results")
        .insert({
          test_id: testId,
          test_name: testName,
          correct,
          incorrect,
          skipped,
          total: questions.length,
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          percentage: percentage,
          user_answers: userAnswers,
          subject_stats: subjectStats,
          time_taken: ((questions[0] ? 180 : 0) * 60) - timeLeft
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Test submitted successfully!");
      navigate(`/results/${data.id}`);
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
  const options = currentQuestion.options as Record<string, string>;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">{testName}</h1>
            <div className="flex items-center gap-2 text-lg font-mono">
              <Clock className="h-5 w-5" />
              <span className={timeLeft < 300 ? "text-destructive" : ""}>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={(currentIndex + 1) / questions.length * 100} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{answers.size} answered</span>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <Badge variant="secondary">{currentQuestion.subject}</Badge>
              <span className="text-sm text-muted-foreground">+{currentQuestion.marks} / -{currentQuestion.negative_marks}</span>
            </div>
            <p className="text-lg mb-6">{currentQuestion.question_text}</p>
            
            <div className="space-y-3">
              {Object.entries(options).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    currentAnswer?.selected === key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <span className="font-semibold mr-2">{key}.</span>
                  {value}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              if (currentAnswer) {
                const newAnswers = new Map(answers);
                newAnswers.delete(currentQuestion.id);
                setAnswers(newAnswers);
              }
            }}>
              <Flag className="h-4 w-4 mr-2" />
              Clear
            </Button>
            
            {currentIndex === questions.length - 1 ? (
              <Button onClick={handleSubmit}>Submit Test</Button>
            ) : (
              <Button
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-10 h-10 rounded-lg border-2 font-semibold transition-all ${
                idx === currentIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : answers.has(questions[idx].id)
                  ? "border-success bg-success/10 text-success"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Quiz;
