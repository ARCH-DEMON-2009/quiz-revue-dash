import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const QuizRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const testId = searchParams.get("test_id");
    if (testId) {
      navigate(`/quiz/${testId}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to quiz...</p>
      </div>
    </div>
  );
};

export default QuizRedirect;
