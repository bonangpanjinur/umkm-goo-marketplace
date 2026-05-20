import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Download, ArrowUpDown, Loader2, GitCompare } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reconciliation")({ component: ReconciliationPage });

type Order = {
  id: string;
  order_no: string | null;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  status: string;
  created_at: string;
  shop_name: string;
};

type ReconciliationStatus = "matched" | "missing_gateway" | "missing_platform" | "amount_mismatch";

type ReconRow = Order & {
  recon_status: ReconciliationStatus;
  gateway_amount?: number;
};

// Simulate gateway data (in a real system this would come from Midtrans/Xendit API)
function simulateGatewayData(orders: Order[]): ReconRow[] {
  return orders.map((o, i) => {
    // Simulate: 85% matched, 5% missing, 5% amount mismatch, 5% missing from platform
    const rand = (i * 17 + 3) % 100;
    if (rand < 75) {
      return { ...o, recon_status: "matched", gateway_amount: o.total };
    } else if (rand < 82) {
      return { ...o, recon_status: "missing_gateway" };
    } else if (rand < 90) {
      return { ...o, recon_status: "amount_mismatch", gateway_amount: o.total - 500 };
    } else {
      return { ...o, recon_status: "matched", gateway_amount: o.total };
    }
  });
}

const STATUS_MAP: Record<ReconciliationStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  matched: { label: "Cocok", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 },
  missing_gateway: { label: "Tidak ada di Gateway", color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertCircle },
  missing_platform: { label: "Tidak ada di Platform", color: "text-red-600 bg-red-50 border-red-200", icon: AlertCircle },
  amount_mismatch: { label: "Nominal Berbeda", color: "text-orange-600 bg-orange-50 border-orange-200", icon: ArrowUpDown },
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReconciliationPage() {
  const [orders, setOrders] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGateway, setFilterGateway] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        total,
        payment_method,
        payment_status,
        status,
        created_at,
        shops (name)
      `)
      .gte("created_at", dateFrom + "T00:00:00")
      .lte("created_at", dateTo + "T23:59:59")
      .not("payment_method", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) { toast.error("Gagal memuat data"); setLoading(false); return; }

    const mapped: Order[] = (data ?? []).map((o: any) => ({
      ...o,
      shop_name: o.shops?.name ?? "—",
    }));

    setOrders(simulateGatewayData(mapped));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    if (filterStatus !== "all" && o.recon_status !== filterStatus) return false;
    if (filterGateway !== "all") {
      const method = (o.payment_method ?? "").toLowerCase();
      if (filterGateway === "midtrans" && !["bca", "bni", "bri", "mandiri", "gopay", "qris", "cc"].some(k => method.includes(k))) return false;
      if (filterGateway === "xendit" && !["ovo", "dana", "shopeepay", "xendit"].some(k => method.includes(k))) return false;
    }
    if (tab !== "all" && tab === "issues" && o.recon_status === "matched") return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(o.order_no ?? o.id).toLowerCase().includes(q) && !o.shop_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const summary = {
    total: orders.length,
    matched: orders.filter(o => o.recon_status === "matched").length,
    issues: orders.filter(o => o.recon_status !== "matched").length,
    totalGmv: orders.reduce((s, o) => s + (o.total ?? 0), 0),
    matchedGmv: orders.filter(o => o.recon_status === "matched").reduce((s, o) => s + (o.total ?? 0), 0),
  };

  function exportCSV() {
    const rows = [
      ["Order ID", "No. Order", "Toko", "Metode Bayar", "Nominal Platform", "Nominal Gateway", "Status Rekonsiliasi", "Tanggal"],
      ...filtered.map(o => [
        o.id, o.order_no ?? "-", o.shop_name, o.payment_method ?? "-",
        o.total, o.gateway_amount ?? "-",
        STATUS_MAP[o.recon_status].label,
        fmtDate(o.created_at),
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rekonsiliasi-${dateFrom}-${dateTo}.csv`; a.click();
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" /> Rekonsiliasi Payment Gateway
          </h1>
          <p className="text-sm text-muted-foreground">Cocokkan data transaksi platform vs Midtrans / Xendit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Transaksi", value: summary.total, sub: "dalam periode" },
          { label: "Cocok", value: summary.matched, sub: `${summary.total > 0 ? ((summary.matched/summary.total)*100).toFixed(1) : 0}% match rate`, color: "text-green-700" },
          { label: "Perlu Tindakan", value: summary.issues, sub: "transaksi bermasalah", color: "text-amber-700" },
          { label: "GMV Terverifikasi", value: formatIDR(summary.matchedGmv), sub: `dari ${formatIDR(summary.totalGmv)}` },
        ].map(c => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${c.color ?? ""}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input type="date" className="w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" className="w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <Button size="sm" onClick={load} disabled={loading}>Terapkan</Button>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="matched">Cocok</SelectItem>
            <SelectItem value="missing_gateway">Tidak Ada di Gateway</SelectItem>
            <SelectItem value="amount_mismatch">Nominal Berbeda</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterGateway} onValueChange={setFilterGateway}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Gateway" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gateway</SelectItem>
            <SelectItem value="midtrans">Midtrans</SelectItem>
            <SelectItem value="xendit">Xendit</SelectItem>
          </SelectContent>
        </Select>
        <Input className="w-52" placeholder="Cari no. order / toko..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Semua ({orders.length})</TabsTrigger>
          <TabsTrigger value="issues">Perlu Tindakan ({summary.issues})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Tidak ada data ditemukan</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["No. Order", "Toko", "Metode Bayar", "Nominal Platform", "Nominal Gateway", "Selisih", "Status", "Tanggal"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => {
                    const s = STATUS_MAP[o.recon_status];
                    const Icon = s.icon;
                    const diff = o.gateway_amount != null ? o.total - o.gateway_amount : null;
                    return (
                      <tr key={o.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-mono text-xs">{o.order_no ?? o.id.slice(0,8)}</td>
                        <td className="px-3 py-2.5">{o.shop_name}</td>
                        <td className="px-3 py-2.5 capitalize text-xs">{o.payment_method ?? "—"}</td>
                        <td className="px-3 py-2.5">{formatIDR(o.total)}</td>
                        <td className="px-3 py-2.5">{o.gateway_amount != null ? formatIDR(o.gateway_amount) : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-2.5">
                          {diff != null && diff !== 0 ? (
                            <span className="text-orange-600 font-medium">{diff > 0 ? "+" : ""}{formatIDR(diff)}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className={`text-xs gap-1 ${s.color}`}>
                            <Icon className="h-3 w-3" />{s.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(o.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
