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
      Verify that all leaderboard users can see each other’s avatar images correctly, including cases where avatars are missing or fall back to initials.
      fix that code has some error site is only leading and showing white screen only
      
      Add admin-only badge configuration so the admin frame, badge style, and text color can be managed without code changes.
    </div>
  );
};

export default RoutesIndex;
