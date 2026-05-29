import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Webhook, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Search, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/webhook-monitor")({
  head: () => ({ meta: [{ title: "Webhook Monitor — Admin" }] }),
  component: WebhookMonitorPage,
});

type WebhookEvent = {
  id: string;
  shop_id: string | null;
  event_type: string;
  delivery_url: string;
  status_code: number | null;
  attempt_count: number;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
  shop_name?: string;
};

type Stats = { total: number; success: number; failed: number; pending: number };

function statusBadge(ev: WebhookEvent) {
  if (ev.delivered_at) return <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="h-3 w-3 mr-1 inline" />Terkirim</Badge>;
  if (ev.failed_at)    return <Badge className="bg-red-100 text-red-700 text-xs"><XCircle className="h-3 w-3 mr-1 inline" />Gagal</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 text-xs"><Clock className="h-3 w-3 mr-1 inline" />Menunggu</Badge>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function WebhookMonitorPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed" | "pending">("all");
  const [stats, setStats] = useState<Stats>({ total: 0, success: 0, failed: 0, pending: 0 });

  const load = async () => {
    setLoading(true);
    try {
      let q = (supabase as any)
        .from("webhook_events")
        .select("id, shop_id, event_type, delivery_url, status_code, attempt_count, delivered_at, failed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterStatus === "success") q = q.not("delivered_at", "is", null);
      else if (filterStatus === "failed") q = q.not("failed_at", "is", null);
      else if (filterStatus === "pending") q = q.is("delivered_at", null).is("failed_at", null);

      const { data, error } = await q;
      if (error) { toast.error(error.message); return; }

      const rows: WebhookEvent[] = (data ?? []).map((e: any) => ({
        ...e,
        shop_name: e.shops?.name ?? null,
      }));
      setEvents(rows);

      const total   = rows.length;
      const success = rows.filter(r => r.delivered_at).length;
      const failed  = rows.filter(r => r.failed_at).length;
      const pending = rows.filter(r => !r.delivered_at && !r.failed_at).length;
      setStats({ total, success, failed, pending });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const filtered = events.filter(ev => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ev.event_type.toLowerCase().includes(q) || (ev.delivery_url ?? "").toLowerCase().includes(q) || (ev.shop_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Webhook Events Monitor
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Log pengiriman webhook keluar ke merchant (200 terakhir)</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",     value: stats.total,   color: "" },
          { label: "Terkirim",  value: stats.success, color: "text-green-600" },
          { label: "Gagal",     value: stats.failed,  color: "text-red-600" },
          { label: "Menunggu",  value: stats.pending, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {stats.failed > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{stats.failed} pengiriman webhook</strong> gagal dalam log ini. Periksa URL endpoint merchant.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari event type, URL, toko..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="success">Terkirim</SelectItem>
            <SelectItem value="failed">Gagal</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Webhook className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada webhook events tercatat.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ev => (
            <Card key={ev.id} className={`p-4 ${ev.failed_at ? "border-red-100 bg-red-50/20" : ""}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(ev)}
                    <Badge variant="outline" className="text-xs font-mono">{ev.event_type}</Badge>
                    {ev.status_code && (
                      <Badge variant="outline" className={`text-xs ${ev.status_code >= 200 && ev.status_code < 300 ? "text-green-700" : "text-red-700"}`}>
                        HTTP {ev.status_code}
                      </Badge>
                    )}
                    {ev.attempt_count > 1 && (
                      <Badge variant="outline" className="text-xs text-amber-700">{ev.attempt_count} percobaan</Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate">{ev.delivery_url}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(ev.created_at)}
                    {ev.shop_id && <span> · Toko {ev.shop_name ?? ev.shop_id.slice(0, 8)}</span>}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
