import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, RefreshCw, Download } from "lucide-react";

interface Payment {
  id: string;
  name: string;
  email: string;
  payment_id: string;
  created_at: string | null;
  start_date: string | null;
  original_amount: number | null;
  discounted_amount: number | null;
  promo_code_used: string | null;
  plan_duration_type: string | null;
  plan_duration_value: number | null;
  plan_months: number | null;
  status: string | null;
}

type Range = "week" | "month" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const paidAmount = (p: Payment) => Number(p.discounted_amount ?? p.original_amount ?? 0);
const dateOf = (p: Payment) => new Date(p.created_at ?? p.start_date ?? 0);

const rangeStart = (r: Range) => {
  const now = new Date();
  if (r === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d;
  }
  if (r === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(0);
};

const planLabel = (p: Payment) => {
  if (p.plan_duration_type && p.plan_duration_value) return `${p.plan_duration_value} ${p.plan_duration_type}`;
  if (p.plan_months) return `${p.plan_months} month${p.plan_months > 1 ? "s" : ""}`;
  return "—";
};

export const AdminRevenueSection = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const all: Payment[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("premium_users")
        .select("id,name,email,payment_id,created_at,start_date,original_amount,discounted_amount,promo_code_used,plan_duration_type,plan_duration_value,plan_months,status")
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) { console.error("revenue load", error); break; }
      all.push(...((data as Payment[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    setPayments(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const start = rangeStart(range).getTime();
    return payments.filter((p) => dateOf(p).getTime() >= start);
  }, [payments, range]);

  const stats = useMemo(() => {
    const paid = filtered.filter((p) => paidAmount(p) > 0);
    const revenue = paid.reduce((s, p) => s + paidAmount(p), 0);
    const discounts = filtered.reduce(
      (s, p) => s + Math.max(0, Number(p.original_amount ?? 0) - paidAmount(p)), 0);
    return {
      revenue,
      paidCount: paid.length,
      freeCount: filtered.length - paid.length,
      avg: paid.length ? revenue / paid.length : 0,
      discounts,
    };
  }, [filtered]);

  const breakdown = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    filtered.forEach((p) => {
      const d = dateOf(p);
      const key = range === "all"
        ? d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const cur = map.get(key) ?? { revenue: 0, count: 0 };
      cur.revenue += paidAmount(p);
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries());
  }, [filtered, range]);

  const maxRev = Math.max(1, ...breakdown.map(([, v]) => v.revenue));

  const exportCsv = () => {
    const header = ["Date", "Name", "Email", "Plan", "Original", "Paid", "Promo", "Payment ID", "Status"];
    const rows = filtered.map((p) => [
      dateOf(p).toISOString(), p.name, p.email, planLabel(p),
      p.original_amount ?? "", paidAmount(p), p.promo_code_used ?? "", p.payment_id, p.status ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border bg-card/50 p-3 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg sm:text-xl font-semibold truncate">{value}</p>
    </div>
  );

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <IndianRupee className="h-5 w-5" /> Payments & Revenue
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button key={r.value} size="sm" variant={range === r.value ? "default" : "outline"} onClick={() => setRange(r.value)}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4 pt-0">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          {stat("Revenue", inr(stats.revenue))}
          {stat("Paid orders", String(stats.paidCount))}
          {stat("Free activations", String(stats.freeCount))}
          {stat("Avg order", inr(stats.avg))}
          {stat("Discounts given", inr(stats.discounts))}
        </div>

        {breakdown.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{range === "all" ? "Monthly report" : "Daily report"}</p>
            <div className="space-y-1.5">
              {breakdown.map(([label, v]) => (
                <div key={label} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
                  <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(v.revenue / maxRev) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right font-medium">{inr(v.revenue)}</span>
                  <span className="w-10 shrink-0 text-right text-muted-foreground">{v.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Payment ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {loading ? "Loading payments…" : "No payments in this period."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{dateOf(p).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="font-medium truncate max-w-[200px]">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.email}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{planLabel(p)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {paidAmount(p) > 0 ? inr(paidAmount(p)) : <Badge variant="secondary">Free</Badge>}
                    </TableCell>
                    <TableCell>{p.promo_code_used ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[160px] truncate">{p.payment_id}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
