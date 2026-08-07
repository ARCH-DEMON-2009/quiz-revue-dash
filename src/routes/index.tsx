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
      Admin users now have an ultra-premium visual identity with a specialized animated frame (Spinning Rainbow with Glow), 
      a distinctive "Supreme Admin" Star badge, and unique font styling (Gradient black-weight text with drop shadow).
      
      Fixed avatar display across the platform - users can now see each other's custom avatars on all leaderboards 
      (Main, TNC, and Global TNC) instead of falling back to initials when an avatar is set.
      
      Updated Profile and TNC pages to ensure consistent premium and admin visual indicators.
      Implemented high-contrast name colors for admins to ensure they stand out as the "best of them" in all lists.
    </div>
  );
};

export default RoutesIndex;
