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
      Add a premium upgrade/checkout flow when I try to select a locked premium avatar, including a clear button to upgrade and return back to the avatar picker after success.
in all leaderboard also add premium frame outerside of avatar and for admin the frame has a special type of frame .
make all these chnages and update code to github
    </div>
  );
};

export default RoutesIndex;
