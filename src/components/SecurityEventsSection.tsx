import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  user_name: string | null;
  ip_address: string | null;
  path: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const LABELS: Record<string, string> = {
  high_request_volume: "High request volume",
  high_attempt_volume: "Rapid repeated attempts",
  repeated_fetch: "Repeated fetches",
};

const severityVariant = (s: string): "destructive" | "default" | "secondary" =>
  s === "high" ? "destructive" : s === "medium" ? "default" : "secondary";

export const SecurityEventsSection = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("security_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setEvents((data as unknown as SecurityEvent[]) || []);
    } catch (e) {
      console.error("Error fetching security events:", e);
      toast.error("Failed to fetch security events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const clearAll = async () => {
    if (!confirm("Delete all security event logs?")) return;
    try {
      const { error } = await supabase
        .from("security_events" as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      setEvents([]);
      toast.success("Security logs cleared");
    } catch (e) {
      console.error(e);
      toast.error("Failed to clear logs");
    }
  };

  const highCount = events.filter((e) => e.severity === "high").length;

  return (
    <Card className="mt-8">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Security Events (Scraping Alerts)
            {highCount > 0 && <Badge variant="destructive">{highCount} high</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {events.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No suspicious activity detected</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium text-xs">
                      {LABELS[ev.event_type] || ev.event_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityVariant(ev.severity)} className="text-xs capitalize">
                        {ev.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">
                      {ev.user_name || ev.user_id || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{ev.ip_address || "—"}</TableCell>
                    <TableCell className="text-xs">{ev.path || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {ev.details ? JSON.stringify(ev.details) : "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(ev.created_at), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
