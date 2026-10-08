import { Link } from "react-router-dom";
import { Gift, Crown } from "lucide-react";
import { useTncTrial } from "@/hooks/useTncTrial";

export function TncTrialBanner() {
  const { trial } = useTncTrial();
  if (trial.status === "active" && trial.expiresAt) {
    const ms = new Date(trial.expiresAt).getTime() - Date.now();
    const h = Math.max(0, Math.floor(ms / 3600000));
    const left = h >= 24 ? `${Math.ceil(h / 24)} day${Math.ceil(h / 24) > 1 ? "s" : ""}` : `${h} hour${h === 1 ? "" : "s"}`;
    return (
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <Gift className="h-4 w-4 text-accent" />
          <span className="font-semibold">Free trial active</span>
          <span className="text-muted-foreground">All TNC tests unlocked, no verification needed — {left} left.</span>
        </div>
      </div>
    );
  }
  if (trial.status === "expired" || trial.status === "denied") {
    return (
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            {trial.status === "expired" ? "Your 3-day free trial has ended." : "Free trial already used on this device or network."} Verify for free when you open a test, or{" "}
            <Link to="/pricing" className="font-semibold text-primary underline">buy Premium</Link>.
          </span>
        </div>
      </div>
    );
  }
  return null;
}
