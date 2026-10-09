import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift, RefreshCw, Search, ShieldAlert, MonitorSmartphone, Wifi } from "lucide-react";
import { toast } from "sonner";

interface TrialRow {
  userId: string;
  name: string;
  email: string;
  status: "active" | "expired" | "denied";
  startedAt: string;
  expiresAt: string;
  reason: string | null;
  sharedDeviceCount: number;
  sharedNetworkCount: number;
  deviceTag: string | null;
  networkTag: string | null;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const statusBadge = (s: TrialRow["status"]) => {
  if (s === "active") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Active</Badge>;
  if (s === "denied") return <Badge variant="destructive">Denied</Badge>;
  return <Badge variant="secondary">Expired</Badge>;
};

export function AdminTrialMonitorSection() {
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "denied" | "flagged">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tnc-trial", { body: { mode: "admin" } });
      if (error) throw error;
      setRows((data?.trials ?? []) as TrialRow[]);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load trial records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter === "flagged" && r.sharedDeviceCount < 2 && r.sharedNetworkCount < 2 && r.status !== "denied") return false;
    if (filter !== "all" && filter !== "flagged" && r.status !== filter) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
    return true;
  });

  const counts = {
    active: rows.filter((r) => r.status === "active").length,
    expired: rows.filter((r) => r.status === "expired").length,
    denied: rows.filter((r) => r.status === "denied").length,
    flagged: rows.filter((r) => r.sharedDeviceCount > 1 || r.sharedNetworkCount > 1 || r.status === "denied").length,
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-accent" /> TNC Free-Trial Monitor
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "expired", "denied", "flagged"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f}{f !== "all" ? ` (${counts[f as keyof typeof counts]})` : ` (${rows.length})`}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground">
          Repeat-trial indicators are privacy-safe: only short random tags and how many accounts share them — never raw IP or device data.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Repeat indicators</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No trials match.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmt(r.startedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmt(r.expiresAt)}</TableCell>
                  <TableCell className="text-xs">
                    {r.reason === "device_already_used" && <span className="text-destructive">Device already had a trial</span>}
                    {r.reason === "network_already_used" && <span className="text-destructive">Network + browser already had a trial</span>}
                    {!r.reason && <span className="text-emerald-600">Eligible — new account</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {r.sharedDeviceCount > 1 && (
                        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600" title={`${r.sharedDeviceCount} accounts share device tag ${r.deviceTag}`}>
                          <MonitorSmartphone className="h-3 w-3" /> {r.sharedDeviceCount}× device
                        </Badge>
                      )}
                      {r.sharedNetworkCount > 1 && (
                        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600" title={`${r.sharedNetworkCount} accounts share network tag ${r.networkTag}`}>
                          <Wifi className="h-3 w-3" /> {r.sharedNetworkCount}× network
                        </Badge>
                      )}
                      {r.sharedDeviceCount <= 1 && r.sharedNetworkCount <= 1 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldAlert className="h-3 w-3 opacity-40" /> none</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
