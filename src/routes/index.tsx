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
      Enable the Google provider in Supabase so my Google sign-in works without the "Unsupported provider: provider is not enabled" error.
      i enabled google but still failed Enable Sign in with Google
      Enables Sign in with Google on the web using OAuth or One Tap, or in Android apps or Chrome extensions.
      Client IDs GOOGLE_OAUTH_CLIENT_ID Comma-separated list of client IDs for Web, OAuth, Android apps, One Tap, and Chrome extensions.
      Client Secret (for OAuth) GOOGLE_OAUTH_CLIENT_SECRET Client Secret to use with the OAuth flow on the web.
      Skip nonce checks Allows ID tokens with any nonce to be accepted, which is less secure. Useful in situations where you don't have access to the nonce used to issue the ID token, such as with iOS.
      Allow users without an email Allows the user to successfully authenticate when the provider does not return an email address.
      Callback URL (for OAuth) https://odwpjkwkjbronjoccsst.supabase.co/auth/v1/callback Register this callback URL when using Sign-in with Google on the web using OAuth. Learn more
      Docs Cancel Save
    </div>
  );
};

export default RoutesIndex;
