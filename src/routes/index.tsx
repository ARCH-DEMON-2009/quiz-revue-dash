import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * This file exists to satisfy a specific routing requirement or to handle 
 * direct navigation to /src/routes/index.tsx.
 */
const RoutesIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home if someone lands here directly
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div className="hidden">
      still this error {"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}

      Test Google sign-in end to end and confirm the exact error is resolved without any unsupported provider message.

      Display my Google profile picture as my avatar on the profile page after sign-in with Google.

      Implement a logout button and a session-check redirect so users always land on the correct quiz/review pages based on authentication status.
    </div>
  );
};

export default RoutesIndex;
