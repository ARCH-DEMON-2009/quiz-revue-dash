import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const TELEGRAM_POPUP_KEY = "telegram_popup_last_shown";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Read Telegram channel link from environment (Vite)
const TELEGRAM_CHANNEL_LINK = import.meta.env.VITE_TELEGRAM_CHANNEL_LINK || "";

const TelegramPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastShown = localStorage.getItem(TELEGRAM_POPUP_KEY);
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown) > ONE_DAY_MS) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(TELEGRAM_POPUP_KEY, now.toString());
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleJoin = () => {
    if (TELEGRAM_CHANNEL_LINK) {
      window.open(TELEGRAM_CHANNEL_LINK, "_blank");
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[#0088cc]" />
            Join Our Telegram Channel
          </DialogTitle>
          <DialogDescription>
            Stay updated with latest tests, study materials, and tips for your exam preparation!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleJoin} 
            className="bg-[#0088cc] hover:bg-[#0077b5] text-white"
            disabled={!TELEGRAM_CHANNEL_LINK}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {TELEGRAM_CHANNEL_LINK ? "Join Telegram Channel" : "Link Coming Soon"}
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TelegramPopup;
