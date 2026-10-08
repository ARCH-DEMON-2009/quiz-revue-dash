import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, RefreshCw, Download, Sparkles, Undo2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
interface Refund {
  id: string;
  premium_user_id: string;
  amount: number;
  reason: string | null;
  refunded_at: string;
}

type Range = "week" | "month" | "all" | "custom";
const RANGES: { value: Range; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

const db = supabase as any;
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const paidAmount = (p: Payment) => Number(p.discounted_amount ?? p.original_amount ?? 0);
const dateOf = (p: Payment) => new Date(p.created_at ?? p.start_date ?? 0);
const planLabel = (p: Payment) => {
  if (p.plan_duration_type && p.plan_duration_value) return `${p.plan_duration_value} ${p.plan_duration_type}`;
  if (p.plan_months) return `${p.plan_months} month${p.plan_months > 1 ? "s" : ""}`;
  return "Unknown";
};

const periodBounds = (r: Range, from: string, to: string): [number, number] => {
  const now = new Date();
  if (r === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return [d.getTime(), Infinity];
  }
  if (r === "month") return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), Infinity];
  if (r === "custom") {
    const s = from ? new Date(from + "T00:00:00").getTime() : 0;
    const e = to ? new Date(to + "T23:59:59.999").getTime() : Infinity;
    return [s, e];
  }
  return [0, Infinity];
};

const renderMarkdown = (md: string) =>
  md.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    const clean = t.replace(/\*\*(.+?)\*\*/g, "$1");
    if (/^#+\s/.test(t)) return <p key={i} className="font-semibold mt-2">{clean.replace(/^#+\s/, "")}</p>;
    if (/^[-*•]\s/.test(t)) return <li key={i} className="ml-4 list-disc">{clean.replace(/^[-*•]\s/, "")}</li>;
    return <p key={i}>{clean}</p>;
  });

export const AdminRevenueSection = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [refundFor, setRefundFor] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [savingRefund, setSavingRefund] = useState(false);

  const load = async () => {
    setLoading(true);
    const all: Payment[] = [];
    for (let f = 0; ; f += 1000) {
      const { data, error } = await supabase
        .from("premium_users")
        .select("id,name,email,payment_id,created_at,start_date,original_amount,discounted_amount,promo_code_used,plan_duration_type,plan_duration_value,plan_months,status")
        .order("created_at", { ascending: false })
        .range(f, f + 999);
      if (error) { console.error("revenue load", error); break; }
      all.push(...((data as Payment[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    const { data: rf, error: rfErr } = await db.from("payment_refunds").select("id,premium_user_id,amount,reason,refunded_at").order("refunded_at", { ascending: false });
    if (rfErr) console.error("refunds load", rfErr);
    setPayments(all);
    setRefunds((rf as Refund[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const refundByPayment = useMemo(() => {
    const m = new Map<string, number>();
    refunds.forEach((r) => m.set(r.premium_user_id, (m.get(r.premium_user_id) ?? 0) + Number(r.amount)));
    return m;
  }, [refunds]);

  const refundState = (p: Payment) => {
    const r = refundByPayment.get(p.id) ?? 0;
    if (r <= 0) return "none";
    return r >= paidAmount(p) ? "full" : "partial";
  };

  const planOptions = useMemo(() => Array.from(new Set(payments.map(planLabel))).sort(), [payments]);
  const dbStatuses = useMemo(() => Array.from(new Set(payments.map((p) => p.status).filter(Boolean) as string[])).sort(), [payments]);

  const [startMs, endMs] = periodBounds(range, from, to);
  const inPeriod = useMemo(
    () => payments.filter((p) => { const t = dateOf(p).getTime(); return t >= startMs && t <= endMs; }),
    [payments, startMs, endMs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod.filter((p) => {
      if (planFilter !== "all" && planLabel(p) !== planFilter) return false;
      if (statusFilter === "paid" && paidAmount(p) <= 0) return false;
      if (statusFilter === "free" && paidAmount(p) > 0) return false;
      if (statusFilter === "refunded" && refundState(p) === "none") return false;
      if (statusFilter === "not_refunded" && refundState(p) !== "none") return false;
      if (statusFilter.startsWith("db:") && p.status !== statusFilter.slice(3)) return false;
      if (q && ![p.name, p.email, p.payment_id, p.promo_code_used ?? ""].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inPeriod, planFilter, statusFilter, search, refundByPayment]);

  const computeStats = (list: Payment[]) => {
    const paid = list.filter((p) => paidAmount(p) > 0);
    const gross = paid.reduce((s, p) => s + paidAmount(p), 0);
    const refunded = list.reduce((s, p) => s + Math.min(refundByPayment.get(p.id) ?? 0, paidAmount(p)), 0);
    const discounts = list.reduce((s, p) => s + Math.max(0, Number(p.original_amount ?? 0) - paidAmount(p)), 0);
    return {
      gross, refunded, net: gross - refunded, discounts,
      paidCount: paid.length,
      freeCount: list.length - paid.length,
      refundCount: list.filter((p) => (refundByPayment.get(p.id) ?? 0) > 0).length,
      avg: paid.length ? gross / paid.length : 0,
    };
  };
  const stats = useMemo(() => computeStats(filtered), [filtered, refundByPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  const breakdown = useMemo(() => {
    const monthly = range === "all" || (range === "custom" && endMs - startMs > 62 * 86400000);
    const map = new Map<string, { net: number; count: number }>();
    [...filtered].reverse().forEach((p) => {
      const d = dateOf(p);
      const key = monthly
        ? d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const cur = map.get(key) ?? { net: 0, count: 0 };
      cur.net += paidAmount(p) - Math.min(refundByPayment.get(p.id) ?? 0, paidAmount(p));
      cur.count += 1;
      map.set(key, cur);
    });
    return { monthly, rows: Array.from(map.entries()) };
  }, [filtered, range, startMs, endMs, refundByPayment]);
  const maxRev = Math.max(1, ...breakdown.rows.map(([, v]) => v.net));

  const exportCsv = () => {
    const header = ["Date", "Name", "Email", "Plan", "Original", "Paid", "Refunded", "Net", "Promo", "Payment ID", "Status"];
    const rows = filtered.map((p) => {
      const r = Math.min(refundByPayment.get(p.id) ?? 0, paidAmount(p));
      return [dateOf(p).toISOString(), p.name, p.email, planLabel(p), p.original_amount ?? "", paidAmount(p), r, paidAmount(p) - r, p.promo_code_used ?? "", p.payment_id, p.status ?? ""];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAi = async () => {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const span = (endMs === Infinity ? Date.now() : endMs) - startMs;
      const prevList = startMs > 0
        ? payments.filter((p) => { const t = dateOf(p).getTime(); return t >= startMs - span && t < startMs; })
        : [];
      const daily = new Map<string, { gross: number; refunded: number; orders: number; promoOrders: number }>();
      filtered.forEach((p) => {
        const k = dateOf(p).toISOString().slice(0, 10);
        const c = daily.get(k) ?? { gross: 0, refunded: 0, orders: 0, promoOrders: 0 };
        c.gross += paidAmount(p);
        c.refunded += Math.min(refundByPayment.get(p.id) ?? 0, paidAmount(p));
        c.orders += 1;
        if (p.promo_code_used) c.promoOrders += 1;
        daily.set(k, c);
      });
      const planMix: Record<string, { orders: number; gross: number }> = {};
      filtered.forEach((p) => {
        const k = planLabel(p);
        planMix[k] ??= { orders: 0, gross: 0 };
        planMix[k].orders += 1; planMix[k].gross += paidAmount(p);
      });
      const summary = {
        period: RANGES.find((r) => r.value === range)?.label,
        from: new Date(startMs).toISOString().slice(0, 10),
        to: endMs === Infinity ? new Date().toISOString().slice(0, 10) : new Date(endMs).toISOString().slice(0, 10),
        filters: { status: statusFilter, plan: planFilter },
        current: stats,
        previousPeriod: startMs > 0 ? computeStats(prevList) : null,
        planMix,
        daily: Array.from(daily.entries()).sort().slice(-120).map(([date, v]) => ({ date, ...v })),
      };
      const { data, error } = await supabase.functions.invoke("revenue-insights", { body: { summary } });
      if (error) {
        let msg = error.message;
        try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setAiText(data.analysis);
    } catch (e: any) {
      setAiError(e?.message ?? "AI analysis failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const openRefund = (p: Payment) => {
    const remaining = paidAmount(p) - (refundByPayment.get(p.id) ?? 0);
    setRefundFor(p); setRefundAmount(String(Math.max(0, remaining))); setRefundReason("");
  };

  const saveRefund = async () => {
    if (!refundFor) return;
    const amt = Number(refundAmount);
    const remaining = paidAmount(refundFor) - (refundByPayment.get(refundFor.id) ?? 0);
    if (!Number.isFinite(amt) || amt <= 0 || amt > remaining + 0.001) {
      toast({ title: "Invalid amount", description: `Enter between ₹1 and ${inr(remaining)}.`, variant: "destructive" });
      return;
    }
    setSavingRefund(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("payment_refunds").insert({
      premium_user_id: refundFor.id, amount: amt, reason: refundReason.trim().slice(0, 500) || null, created_by: u?.user?.id ?? null,
    });
    setSavingRefund(false);
    if (error) { toast({ title: "Could not save refund", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Refund recorded", description: `${inr(amt)} for ${refundFor.name}` });
    setRefundFor(null);
    load();
  };

  const deleteRefund = async (id: string) => {
    const { error } = await db.from("payment_refunds").delete().eq("id", id);
    if (error) { toast({ title: "Could not remove refund", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const stat = (label: string, value: string, tone = "") => (
    <div className="rounded-lg border bg-card/50 p-3 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg sm:text-xl font-semibold truncate ${tone}`}>{value}</p>
    </div>
  );

  const paymentRefunds = refundFor ? refunds.filter((r) => r.premium_user_id === refundFor.id) : [];

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {range === "custom" && (
            <>
              <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="not_refunded">Not refunded</SelectItem>
                {dbStatuses.map((s) => <SelectItem key={s} value={`db:${s}`}>Subscription: {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Plan</Label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {planOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2 md:col-span-1">
            <Label className="text-xs">Search</Label>
            <Input placeholder="Name, email, payment ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {stat("Gross revenue", inr(stats.gross))}
          {stat("Refunded", `-${inr(stats.refunded)}`, "text-destructive")}
          {stat("Net revenue", inr(stats.net), "text-primary")}
          {stat("Paid orders", String(stats.paidCount))}
          {stat("Refunds", String(stats.refundCount))}
          {stat("Free activations", String(stats.freeCount))}
          {stat("Avg order", inr(stats.avg))}
          {stat("Discounts given", inr(stats.discounts))}
        </div>

        <div className="rounded-lg border bg-card/50 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI revenue insights</p>
            <Button size="sm" onClick={runAi} disabled={aiLoading || !filtered.length}>
              {aiLoading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {aiLoading ? "Analysing…" : "Explain this period"}
            </Button>
          </div>
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}
          {aiText ? <div className="text-sm space-y-1">{renderMarkdown(aiText)}</div>
            : !aiError && <p className="text-xs text-muted-foreground">Uses the selected period and filters, compared with the previous period.</p>}
        </div>

        {breakdown.rows.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{breakdown.monthly ? "Monthly net revenue" : "Daily net revenue"}</p>
            <div className="space-y-1.5">
              {breakdown.rows.map(([label, v]) => (
                <div key={label} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
                  <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.max(0, v.net / maxRev) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right font-medium">{inr(v.net)}</span>
                  <span className="w-10 shrink-0 text-right text-muted-foreground">{v.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Refunded</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    {loading ? "Loading payments…" : "No payments match these filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const r = refundByPayment.get(p.id) ?? 0;
                  const state = refundState(p);
                  return (
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
                      <TableCell className="text-right whitespace-nowrap">
                        {state === "none" ? "—" : (
                          <span className="text-destructive">-{inr(r)} <Badge variant="outline" className="ml-1">{state === "full" ? "Full" : "Partial"}</Badge></span>
                        )}
                      </TableCell>
                      <TableCell>{p.promo_code_used ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[160px] truncate">{p.payment_id}</TableCell>
                      <TableCell>
                        {paidAmount(p) > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => openRefund(p)}>
                            <Undo2 className="h-4 w-4 mr-1" /> Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!refundFor} onOpenChange={(o) => !o && setRefundFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record refund</DialogTitle></DialogHeader>
          {refundFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {refundFor.name} · paid {inr(paidAmount(refundFor))} · already refunded {inr(refundByPayment.get(refundFor.id) ?? 0)}
              </p>
              <div className="space-y-1"><Label>Refund amount (₹)</Label><Input type="number" min={1} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} /></div>
              <div className="space-y-1"><Label>Reason (optional)</Label><Input value={refundReason} maxLength={500} onChange={(e) => setRefundReason(e.target.value)} /></div>
              {paymentRefunds.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Previous refunds</p>
                  {paymentRefunds.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs border rounded p-2">
                      <span>{new Date(r.refunded_at).toLocaleDateString("en-IN")} · {inr(Number(r.amount))}{r.reason ? ` · ${r.reason}` : ""}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteRefund(r.id)} aria-label="Remove refund">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">This only records the refund here. Send the money back through Razorpay or your bank separately.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundFor(null)}>Cancel</Button>
            <Button onClick={saveRefund} disabled={savingRefund}>{savingRefund ? "Saving…" : "Save refund"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
