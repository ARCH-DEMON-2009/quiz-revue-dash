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
      update all code to github and add that avatars only show list of avatars when click on edit avatar . 

Update my app so the selected avatar shows consistently on the profile page, leaderboard, and review page.
and show avatar on leaderboard also with name 

Add an avatar preview confirmation modal that shows exactly what will appear in the header, leaderboard, and review page before I save my new selection.

Implement image loading fallbacks (skeleton/placeholder with fixed aspect ratio) so my header avatar never causes layout shifts even on slow connections. and remove Enter Image URL for your avatar: user cna not add their own avator by url and also add that user can also change their name and also add that in leader board show premium users name in Golden color or any other color based on how much days plan he purchased free user name show normal
    </div>
  );
};

export default RoutesIndex;
