import { useEffect, useState } from "react";
import { Bot, ExternalLink, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const POPUP_SEEN_KEY = "tnc_bot_popup_seen";
const POPUP_DONT_SHOW_KEY = "tnc_bot_popup_dont_show";
const MINI_APP_URL = "https://tnc-vedio.onrender.com/";
const TELEGRAM_BOT_URL = "https://t.me/Tnccontentbot";

export const TncBotPopup = () => {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dontShow = localStorage.getItem(POPUP_DONT_SHOW_KEY) === "true";
    if (dontShow) return;

    // Show popup after 2 seconds
    const timer = setTimeout(() => {
      setShow(true);
      // Track analytics: Popup shown
      try {
        (window as any).posthog?.capture('tnc_bot_popup_shown');
      } catch (e) { /* ignore */ }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    if (dontShowAgain) {
      localStorage.setItem(POPUP_DONT_SHOW_KEY, "true");
    }
    localStorage.setItem(POPUP_SEEN_KEY, "true");
  };

  const handleStartBot = () => {
    // Track analytics: Start Bot clicked
    try {
      (window as any).posthog?.capture('tnc_bot_popup_start_bot_clicked');
    } catch (e) { /* ignore */ }
    window.open(TELEGRAM_BOT_URL, "_blank");
    handleClose();
  };

  const handleOpenMiniApp = () => {
    // Track analytics: Mini App clicked
    try {
      (window as any).posthog?.capture('tnc_bot_popup_mini_app_clicked');
    } catch (e) { /* ignore */ }
    window.open(MINI_APP_URL, "_blank");
    handleClose();
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="sm:max-w-[425px] border-primary/20 bg-background/95 backdrop-blur-xl"
        aria-labelledby="tnc-bot-title"
        aria-describedby="tnc-bot-description"
      >
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle id="tnc-bot-title" className="text-center text-xl font-bold text-gradient">
            Free Nursing Courses!
          </DialogTitle>
          <DialogDescription id="tnc-bot-description" className="text-center text-base pt-2">
            Study TNC Nursing Courses and lectures for free on <span className="font-bold text-primary">@Tnccontentbot</span> or visit the direct site.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 text-center text-sm text-muted-foreground">
          Start the bot or open the mini app directly to access premium content at no cost.
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full gap-2 btn-glow h-11" 
            onClick={handleOpenMiniApp}
            aria-label="Open Telegram Mini App directly"
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" /> Open Mini App
          </Button>
          
          <Button 
            variant="outline"
            className="w-full gap-2 h-11 border-primary/20 hover:bg-primary/5" 
            onClick={handleStartBot}
            aria-label="Start Telegram Bot"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Start Bot Now
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-2">
          <Checkbox 
            id="dont-show-again" 
            checked={dontShowAgain} 
            onCheckedChange={(checked) => setDontShowAgain(!!checked)}
          />
          <Label 
            htmlFor="dont-show-again"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Don't show this again
          </Label>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
