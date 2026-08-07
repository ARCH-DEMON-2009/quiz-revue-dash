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
      add avatar feature working user can add avatar and his avatar show on site,leader board and anywhere. also fix that make all things fully responsieve include leader board because in leader board in mobile name is cutted and not recoginiable and reset the stats every week of this leader board https://test.shashanksv.com/leaderboard
    </div>
  );
};

export default RoutesIndex;
