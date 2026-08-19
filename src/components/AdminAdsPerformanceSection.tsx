import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, RefreshCw, AlertCircle } from "lucide-react";

interface AdRow {
  campaignId: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
}

const RANGES = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

export const AdminAdsPerformanceSection = () => {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, cost: 0, conversions: 0 });
  const [range, setRange] = useState("LAST_30_DAYS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (selected = range) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-ads-report", {
        body: { range: selected },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setRows(data.rows ?? []);
      setTotals(data.totals ?? { impressions: 0, clicks: 0, cost: 0, conversions: 0 });
    } catch (e: any) {
      let message = e?.message ?? "Failed to load ad data";
      try {
        const ctx = e?.context;
        if (ctx && typeof ctx.text === "function") {
          const body = await ctx.text();
          if (body) message = body;
        }
      } catch { /* ignore */ }
      console.error("google-ads-report failed:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(range); /* eslint-disable-next-line */ }, [range]);

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Google Ads Performance
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="break-all text-muted-foreground">{error}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stat("Impressions", totals.impressions.toLocaleString())}
              {stat("Clicks", totals.clicks.toLocaleString())}
              {stat("Spend", totals.cost.toFixed(2))}
              {stat("Conversions", totals.conversions.toFixed(1))}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Avg CPC</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        {loading ? "Loading ad data…" : "No ad activity for this period yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.campaignId}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                        <TableCell className="text-right">{r.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{r.clicks.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(r.ctr * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{r.averageCpc.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{r.cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{r.conversions.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
