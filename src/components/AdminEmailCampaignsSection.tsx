import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Megaphone, BellRing, Send } from "lucide-react";
import { toast } from "sonner";

const errMsg = async (error: any, data: any) => {
  if (data?.error) return String(data.error);
  if (!error) return null;
  try { const b = await error.context?.json?.(); return b?.error ?? error.message; } catch { return error.message; }
};

export const AdminEmailCampaignsSection = () => {
  const [total, setTotal] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, sent: 0, failed: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const stop = useRef(false);

  useEffect(() => {
    supabase.functions.invoke("send-broadcast-email", { body: { mode: "count" } })
      .then(({ data }) => setTotal(data?.total ?? 0));
  }, []);

  const runReminders = async () => {
    setBusy("rem");
    const { data, error } = await supabase.functions.invoke("send-premium-expiry-notification", { body: {} });
    const m = await errMsg(error, data?.success === false ? data : null);
    setBusy(null);
    if (m) return toast.error(m);
    toast.success(`Reminders: ${data.sent} sent, ${data.skipped ?? 0} already reminded, ${data.failed} failed`);
  };

  const sendTest = async () => {
    setBusy("test");
    const { data, error } = await supabase.functions.invoke("send-broadcast-email", { body: { mode: "test" } });
    const m = await errMsg(error, data);
    setBusy(null);
    m ? toast.error(m) : toast.success("Test email sent to your admin address");
  };

  const sendAll = async () => {
    if (!confirm(`Send the "Test Sagar is still alive" email to all ${total ?? ""} users? This cannot be undone.`)) return;
    stop.current = false;
    setRunning(true);
    let offset = 0, sent = 0, failed = 0;
    while (!stop.current) {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", { body: { mode: "send", offset } });
      const m = await errMsg(error, data);
      if (m) { toast.error(`Stopped: ${m}`); break; }
      sent += data.sent; failed += data.failed; offset = data.nextOffset;
      setProgress({ done: offset, sent, failed });
      if (data.done) { toast.success(`Broadcast finished: ${sent} sent, ${failed} failed`); break; }
    }
    setRunning(false);
  };

  const pct = total ? Math.min(100, (progress.done / total) * 100) : 0;

  return (
    <Card className="mb-4">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Megaphone className="h-5 w-5" /> Email Campaigns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-3 sm:p-4 pt-0">
        <div className="space-y-2 rounded-lg border p-3">
          <p className="font-medium text-sm flex items-center gap-2"><BellRing className="h-4 w-4" /> Plan expiring soon</p>
          <p className="text-xs text-muted-foreground">Emails every premium user whose plan ends within 3 days. Each user gets one reminder per plan.</p>
          <Button size="sm" onClick={runReminders} disabled={busy === "rem"}>{busy === "rem" ? "Sending…" : "Send expiry reminders now"}</Button>
        </div>
        <div className="space-y-2 rounded-lg border p-3">
          <p className="font-medium text-sm flex items-center gap-2"><Send className="h-4 w-4" /> "Test Sagar is still alive" to all users</p>
          <p className="text-xs text-muted-foreground">Recipients: {total ?? "…"} users. Includes your logo, website link, TNC series and institution exam buttons.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={sendTest} disabled={busy === "test" || running}>Send test to me</Button>
            {running
              ? <Button size="sm" variant="destructive" onClick={() => { stop.current = true; }}>Stop</Button>
              : <Button size="sm" onClick={sendAll} disabled={!total}>Send to all users</Button>}
          </div>
          {(running || progress.done > 0) && (
            <div className="space-y-1">
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">{progress.done}/{total} processed · {progress.sent} sent · {progress.failed} failed</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
