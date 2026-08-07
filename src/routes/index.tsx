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
      Add toggleable anti-extraction protections on the quiz page (e.g., selection, context menu, copy) with a clear admin setting and audit logging.
    </div>
  );
};

export default RoutesIndex;
