import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, RefreshCw, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  email_type: string;
  status: string;
  error: string | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  premium_purchase: "Purchase",
  admin_grant: "Admin grant",
  bypass_warning: "Bypass warning",
};
const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" =>
  s === "delivered" ? "default" : s === "failed" || s === "bounced" || s === "complained" ? "destructive" : s === "sent" ? "secondary" : "outline";

export const AdminEmailLogSection = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("email_logs")
      .select("id,recipient,subject,email_type,status,error,attempts,created_at,last_attempt_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) console.error("email logs", error);
    setLogs((data as EmailLog[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const retry = async (log: EmailLog) => {
    setRetrying(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-premium-email", { body: { type: "retry", log_id: log.id } });
      let msg = data?.error;
      if (error) {
        try { const b = await (error as any).context?.json?.(); msg = b?.error ?? error.message; } catch { msg = error.message; }
      }
      if (msg) toast.error(`Still failing: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
      else toast.success(`Email re-sent to ${log.recipient}`);
    } finally {
      setRetrying(null);
      load();
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) =>
      (status === "all" || l.status === status) &&
      (!q || l.recipient.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q)));
  }, [logs, status, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    logs.forEach((l) => { c[l.status] = (c[l.status] ?? 0) + 1; });
    return c;
  }, [logs]);

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Mail className="h-5 w-5" /> Email Delivery Log
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-4 pt-0">
        <div className="flex flex-wrap gap-2 text-xs">
          {["delivered", "sent", "delayed", "bounced", "failed", "complained"].map((s) => (
            <Badge key={s} variant={statusVariant(s)} className="capitalize">{s}: {counts[s] ?? 0}</Badge>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["delivered", "sent", "delayed", "bounced", "failed", "complained", "queued"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="sm:col-span-2" placeholder="Search email or subject" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {loading ? "Loading…" : "No emails yet."}
                </TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{l.recipient}</TableCell>
                  <TableCell className="whitespace-nowrap">{TYPE_LABEL[l.email_type] ?? l.email_type}</TableCell>
                  <TableCell><Badge variant={statusVariant(l.status)} className="capitalize">{l.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                    <span className="line-clamp-2 break-words">{l.error ?? (l.attempts > 1 ? `${l.attempts} attempts` : "—")}</span>
                  </TableCell>
                  <TableCell>
                    {["failed", "bounced", "queued", "delayed"].includes(l.status) && (
                      <Button size="sm" variant="ghost" onClick={() => retry(l)} disabled={retrying === l.id}>
                        <RotateCw className={`h-4 w-4 mr-1 ${retrying === l.id ? "animate-spin" : ""}`} /> Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
