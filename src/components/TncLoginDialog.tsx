import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { loginTncCrm, resetAndLoginTncCrm, sendTncCrmOtp } from "@/lib/tncApi";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onConnected: () => void }

export default function TncLoginDialog({ open, onOpenChange, onConnected }: Props) {
  const [mob, setMob] = useState("");
  const [pass, setPass] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const done = () => {
    toast.success("TNC connected — tests are unlocked for everyone.");
    setPass(""); setOtp(""); setStep("login");
    onOpenChange(false);
    onConnected();
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e?.message ?? "Something went wrong"); }
    finally { setBusy(false); }
  };

  const submitLogin = () => run(async () => {
    const r = await loginTncCrm(mob, pass);
    if (r.connected) return done();
    if (r.otpRequired) {
      setStep("otp"); setSeconds(60);
      toast.info("This TNC account is logged in on another device. Enter the OTP to reset it.");
    }
  });

  const submitOtp = () => run(async () => {
    await resetAndLoginTncCrm(mob, pass, otp);
    done();
  });

  const resend = () => run(async () => { await sendTncCrmOtp(mob); setSeconds(60); toast.success("OTP sent again."); });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Connect TNC account</DialogTitle>
          <DialogDescription>
            {step === "login"
              ? "Sign in with your TNC Nursing mobile number and password. One login unlocks TNC tests for all students until it expires."
              : `Enter the OTP sent to ${mob}. We'll reset the other device and sign you in.`}
          </DialogDescription>
        </DialogHeader>
        {step === "login" ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submitLogin(); }}>
            <div className="space-y-1">
              <Label htmlFor="tnc-mob">Mobile number</Label>
              <Input id="tnc-mob" inputMode="numeric" maxLength={10} value={mob} onChange={(e) => setMob(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tnc-pass">TNC password</Label>
              <Input id="tnc-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy || mob.length !== 10 || !pass}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log in
            </Button>
            <p className="text-xs text-muted-foreground">Your password is sent securely to TNC and never saved.</p>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submitOtp(); }}>
            <div className="space-y-1">
              <Label htmlFor="tnc-otp">OTP</Label>
              <Input id="tnc-otp" inputMode="numeric" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" />
            </div>
            <Button type="submit" className="w-full" disabled={busy || otp.length < 4}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify, reset device & log in
            </Button>
            <div className="flex justify-between text-sm">
              <button type="button" className="text-muted-foreground underline" onClick={() => setStep("login")}>Back</button>
              <button type="button" className="text-primary underline disabled:opacity-50" disabled={busy || seconds > 0} onClick={resend}>
                {seconds > 0 ? `Resend in ${seconds}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
