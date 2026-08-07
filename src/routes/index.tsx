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
      Add a Router-safe fallback so the FeatureAnnouncements modal can never trigger a blank screen even if it mounts outside BrowserRouter and make popup fully responsive for all devices.

      Verify the avatar frames and premium name colors render correctly on both TncLeaderboard and TncGlobalLeaderboard across different user roles.

      Update the profile and review pages so the same avatar frames and tiered/premium name colors match the TNC leaderboard behavior.

      Implement automated tests to confirm avatar, frame, and name-color rendering works for premium, admin, and free users on the leaderboards.

      Add consistent skeleton and fixed-aspect-ratio placeholders for leaderboard avatars so there are no layout shifts while user metadata loads.
      in rpicing plans also show users that what what features it includes and what color of name give by that plan different plan have different color.
      and for admin do not give me noral crown badge make him a premium more best and attractive special badge for him so admin can see sttractive in leaderboard
      ad a option demand a custom avatar contact admin https://t.me/TestSagarHelpRobot
    </div>
  );
};

export default RoutesIndex;
