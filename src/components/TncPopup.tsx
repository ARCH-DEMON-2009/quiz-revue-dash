import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Target, ArrowRight } from "lucide-react";

const STORAGE_KEY = "tnc_popup_dismissed";

const TncPopup = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-primary/20 bg-card p-8 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Target className="h-7 w-7 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground">🎯 TNC Test Series</h2>
        <p className="mt-2 text-muted-foreground">
          6,800+ Free Mock Tests — NORCET · AIIMS · SGPGI · BTSC · CHO
        </p>

        <Button
          className="mt-6 w-full gap-2"
          size="lg"
          onClick={() => {
            dismiss();
            navigate("/tnc-tests");
          }}
        >
          Start Practicing <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TncPopup;
