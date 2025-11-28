import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BlockedUserDialog } from "./BlockedUserDialog";

export const BlockedUserGuard = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkBlockedStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkBlockedStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]);

  const checkBlockedStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsBlocked(false);
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_blocked")
      .eq("user_id", user.id)
      .single();

    if (profile?.is_blocked) {
      setIsBlocked(true);
      await supabase.auth.signOut();
    } else {
      setIsBlocked(false);
    }
  };

  return <BlockedUserDialog open={isBlocked} />;
};
