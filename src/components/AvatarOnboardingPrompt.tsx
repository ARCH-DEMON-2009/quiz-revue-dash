import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Image, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AvatarOnboardingPrompt = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dismissedKey = userId ? `avatar-onboarding-dismissed-${userId}` : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (!session?.user) setOpen(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !dismissedKey) return;
    let active = true;
    try {
      if (localStorage.getItem(dismissedKey)) return;
    } catch {
      // Continue with the prompt when browser storage is unavailable.
    }

    const checkAvatar = async () => {
      const [{ data: { user } }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("user_profiles").select("avatar_url").eq("user_id", userId).maybeSingle(),
      ]);
      if (active && user?.id === userId && !profile?.avatar_url && !user.user_metadata?.avatar_url) {
        setOpen(true);
      }
    };

    void checkAvatar().catch((error) => console.error("Could not check profile avatar:", error));
    return () => {
      active = false;
    };
  }, [dismissedKey, userId]);

  const dismiss = () => {
    try {
      if (dismissedKey) localStorage.setItem(dismissedKey, "1");
    } catch {
      // Dismiss for the current view even when browser storage is unavailable.
    }
    setOpen(false);
  };

  const chooseAvatar = () => {
    dismiss();
    navigate("/profile?chooseAvatar=1");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Image className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Add a profile picture</DialogTitle>
          <DialogDescription>
            Choose an avatar to appear beside your name on the leaderboard. On your profile, select “Change Avatar” and confirm your choice.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <Trophy className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          Your avatar will be visible to other leaderboard viewers.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>Later</Button>
          <Button onClick={chooseAvatar}>Choose Avatar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarOnboardingPrompt;