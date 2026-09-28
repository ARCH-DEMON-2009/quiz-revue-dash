import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SEEN_KEY = "tnc_study_features_welcome_v1";
const SESSION_KEY = "tnc_study_features_welcome_session";

const StudyFeaturesWelcome = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // The in-memory dialog still works when browser storage is disabled.
    }
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Skip suppressing other session prompts when storage is unavailable.
    }
    setOpen(true);
  }, []);

  const dismiss = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && dismiss()}>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto p-3 sm:p-5">
        <DialogHeader className="px-1 pt-1 text-left">
          <DialogTitle className="text-xl font-bold sm:text-2xl">A smarter way to study starts here</DialogTitle>
          <DialogDescription>See what’s new in your TNC study tools.</DialogDescription>
        </DialogHeader>
        <img
          src="/tnc-study-features.svg"
          alt="Three new TNC study features: retry missed questions from results, build a daily study plan with your exam date, and review your weekly progress. Open My Study Plan from the TNC Tests page."
          className="h-auto w-full rounded-md border border-border"
          fetchPriority="high"
        />
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" className="gap-2" onClick={dismiss}>
            <X className="h-4 w-4" /> Maybe later
          </Button>
          <Button asChild className="gap-2">
            <Link to="/tnc-study" onClick={dismiss}>
              Open my study plan <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SiteHelpLink = () => (
  <a
    href="https://t.me/Tncnursingbot"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Need help? Open the TNC Nursing Telegram help bot in a new tab"
    title="Need help? Chat with the TNC Nursing help bot"
    className="fixed bottom-20 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-emerald-800/20 bg-emerald-800 px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:bottom-5"
  >
    <span aria-hidden="true" className="text-base">?</span>
    Need help?
  </a>
);

export default StudyFeaturesWelcome;