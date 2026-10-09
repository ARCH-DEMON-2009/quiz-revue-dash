import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Building2, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SEEN_KEY = "institution_quiz_welcome_v1";

const StudyFeaturesWelcome = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    // Keep public content and account/legal screens unobstructed.
    if (!['/institutions'].includes(pathname)) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // The in-memory dialog still works when browser storage is disabled.
    }
    setOpen(true);
  }, [pathname]);

  const dismiss = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && dismiss()}>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto p-0">
        <div className="grid md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-52 overflow-hidden bg-muted md:min-h-[390px]">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85"
              alt="Students studying together in a library"
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 text-white sm:inset-x-7 sm:bottom-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
                <Building2 className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Institution quiz library</span>
                <span className="mt-0.5 block text-xs text-white/85">One directory. Real question banks.</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9">
            <DialogHeader className="text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">New on Test Sagar</p>
              <DialogTitle className="max-w-sm text-2xl font-bold leading-tight sm:text-3xl">
                Practice with institutions you trust.
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-md text-sm leading-relaxed">
                Explore live test series and question-based quizzes from learning institutions, all in one place.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-3 text-sm text-foreground sm:grid-cols-3">
              <div className="flex items-center gap-2"><Search className="h-4 w-4 shrink-0 text-emerald-700" /><span>Find a provider</span></div>
              <div className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0 text-amber-500" /><span>Save favorites</span></div>
              <div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 shrink-0 text-emerald-700" /><span>Take a quiz</span></div>
            </div>

            <DialogFooter className="mt-8 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" className="gap-2" onClick={dismiss}>
                <X className="h-4 w-4" /> Maybe later
              </Button>
              <Button asChild className="gap-2">
                <Link to="/institutions" onClick={dismiss}>
                  Explore institutions <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const SiteHelpLink = () => {
  const { pathname } = useLocation();
  const isTakingTest =
    /^\/quiz\/[^/]+$/.test(pathname) ||
    (/^\/tnc-tests\/[^/]+$/.test(pathname) && pathname !== "/tnc-tests/leaderboard") ||
    /^\/tnc-tests\/[^/]+\/retry\/[^/]+$/.test(pathname);

  if (isTakingTest) return null;

  return (
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
};

export default StudyFeaturesWelcome;