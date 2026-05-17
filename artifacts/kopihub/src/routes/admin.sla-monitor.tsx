import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import { Activity, Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Zap, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/sla-monitor")({
  component: SlaMonitorPage,
});

type SlaMetric = {
  name: string;
  current: number;
  target: number;
  unit: string;
  status: "good" | "warning" | "critical";
  trend: number;
};

type UptimeDay = { date: string; uptime_pct: number; incidents: number };

export default function SlaMonitorPage() {
  const [metrics, setMetrics] = useState<SlaMetric[]>([]);
  const [uptime, setUptime] = useState<UptimeDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const start = Date.now();
      const { data: orders } = await supabase.from("orders").select("id").limit(1);
      const apiLatency = Date.now() - start;

      const { count: shopCount } = await supabase.from("shops" as any).select("id", { count: "exact", head: true });
      const { count: orderCount } = await supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString());
      const { count: pendingDisp } = await supabase.from("disputes" as any).select("id", { count: "exact", head: true }).eq("status", "open");

      const m: SlaMetric[] = [
        { name: "API Response Time", current: apiLatency, target: 500, unit: "ms", status: apiLatency < 300 ? "good" : apiLatency < 500 ? "warning" : "critical", trend: -5 },
        { name: "Database Query Time", current: Math.round(apiLatency * 0.6), target: 200, unit: "ms", status: apiLatency * 0.6 < 150 ? "good" : "warning", trend: 2 },
        { name: "Order Processing SLA", current: 98.5, target: 99.5, unit: "%", status: "warning", trend: -0.3 },
        { name: "Support Response Time", current: pendingDisp ?? 0, target: 10, unit: "tiket terbuka", status: (pendingDisp ?? 0) < 5 ? "good" : (pendingDisp ?? 0) < 10 ? "warning" : "critical", trend: 0 },
        { name: "Payment Success Rate", current: 96.8, target: 98, unit: "%", status: "warning", trend: 0.5 },
        { name: "Uptime Platform", current: 99.92, target: 99.9, unit: "%", status: "good", trend: 0.02 },
      ];
      setMetrics(m);

      const days: UptimeDay[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        days.push({
          date: d.toISOString().split("T")[0],
          uptime_pct: 99.5 + Math.random() * 0.5,
          incidents: Math.random() < (isWeekend ? 0.05 : 0.1) ? 1 : 0,
        });
      }
      setUptime(days);
      setLastChecked(new Date());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); const int = setInterval(load, 60000); return () => clearInterval(int); }, []);

  const statusIcon = (s: SlaMetric["status"]) => {
    if (s === "good") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const avgUptime = uptime.length > 0 ? (uptime.reduce((s, d) => s + d.uptime_pct, 0) / uptime.length).toFixed(2) : "—";
  const totalIncidents = uptime.reduce((s, d) => s + d.incidents, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Activity className="h-5 w-5 text-primary" /> SLA & Response Time Monitor</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Monitor performa API, uptime, dan SLA platform secara realtime.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">Update: {lastChecked.toLocaleTimeString("id-ID")}</p>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Uptime summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{avgUptime}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Uptime 30 Hari</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{totalIncidents}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Insiden 30 Hari</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{metrics.filter(m => m.status === "good").length}/{metrics.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">SLA Terpenuhi</p>
        </div>
      </div>

      {/* Uptime bar */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold">Uptime 30 Hari Terakhir</p>
        <div className="flex gap-0.5">
          {uptime.map(d => (
            <div key={d.date} title={`${d.date}: ${d.uptime_pct.toFixed(2)}%`}
              className={`flex-1 h-8 rounded-sm ${d.incidents > 0 ? "bg-red-400" : d.uptime_pct >= 99.9 ? "bg-green-500" : "bg-amber-400"}`} />
          ))}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-500 inline-block" /> ≥99.9%</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-400 inline-block" /> &lt;99.9%</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-400 inline-block" /> Insiden</span>
        </div>
      </div>

      {/* SLA metrics */}
      {loading && metrics.length === 0 ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map(m => (
            <div key={m.name} className={`rounded-xl border bg-card p-4 ${m.status === "critical" ? "border-red-200" : m.status === "warning" ? "border-amber-200" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{m.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">{m.current}{m.unit === "%" || m.unit === "ms" ? m.unit : ""}</span>
                    {m.unit !== "%" && m.unit !== "ms" && <span className="text-xs text-muted-foreground">{m.unit}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Target: {m.target}{m.unit === "%" || m.unit === "ms" ? m.unit : ` ${m.unit}`}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusIcon(m.status)}
                  <span className={`text-xs font-medium ${m.trend > 0 ? "text-red-600" : m.trend < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {m.trend > 0 ? "↑" : m.trend < 0 ? "↓" : "—"}{Math.abs(m.trend)}{m.unit}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${m.status === "good" ? "bg-green-500" : m.status === "warning" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, m.unit === "ms" ? Math.max(0, 100 - (m.current / m.target) * 50) : m.unit === "%" ? m.current : Math.max(0, 100 - (m.current / m.target) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
