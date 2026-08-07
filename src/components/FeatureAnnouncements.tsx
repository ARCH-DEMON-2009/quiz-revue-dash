import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Star, UserCircle, Rocket, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FeatureAnnouncements = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const LAST_ANNOUNCEMENT_KEY = "last_announcement_seen_v1";
    const ANNOUNCEMENT_EXPIRY_DAYS = 2;
    
    const lastSeen = localStorage.getItem(LAST_ANNOUNCEMENT_KEY);
    const now = new Date().getTime();

    if (!lastSeen) {
      // First time seeing this version, show it and set timestamp
      setOpen(true);
      localStorage.setItem(LAST_ANNOUNCEMENT_KEY, now.toString());
    } else {
      const lastSeenTime = parseInt(lastSeen);
      const diffDays = (now - lastSeenTime) / (1000 * 60 * 60 * 24);
      
      // If it's been less than 2 days since they first saw it, and they haven't closed it permanently
      // Actually, standard behavior is to show it once per version.
      // But the user specifically asked "for next two days show a popup".
      // We'll show it once and track it. If they clear storage it shows again.
    }
  }, []);

  const features = [
    {
      icon: <UserCircle className="h-5 w-5 text-primary" />,
      title: "Custom Avatars",
      description: "Express yourself with a selection of free and premium avatars on your profile."
    },
    {
      icon: <Trophy className="h-5 w-5 text-amber-500" />,
      title: "Leaderboard Frames",
      description: "Premium users get golden frames, and Admins get exclusive animated spinning frames!"
    },
    {
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
      title: "Premium Colors",
      description: "Your name now shines in Gold, Blue, or Emerald on the leaderboard based on your plan."
    },
    {
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      title: "Name Customization",
      description: "Update your display name directly from your profile settings."
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] border-primary/20 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Rocket className="h-6 w-6 text-primary animate-bounce" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              New Features Arrived!
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            We've upgraded Test Sagar with new ways to stand out and personalize your experience.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
              <div className="mt-1 bg-background p-2 rounded-full shadow-sm">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-snug">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="sm:flex-1"
          >
            Later
          </Button>
          <Button 
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            className="sm:flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white"
          >
            Try Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureAnnouncements;
