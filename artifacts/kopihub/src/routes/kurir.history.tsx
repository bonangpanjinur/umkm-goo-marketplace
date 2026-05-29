import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Filter, X } from "lucide-react";

export const Route = createFileRoute("/kurir/history")({ component: CourierHistory });

type Row = {
  id: string;
  order_no: string;
  status: string;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  delivered_at: string | null;
  created_at: string;
  shop_name?: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "delivering", label: "Sedang diantar" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const STATUS_STYLE: Record<string, string> = {
  completed:  "bg-emerald-100 text-emerald-700",
  delivering: "bg-purple-100 text-purple-700",
  cancelled:  "bg-red-100 text-red-700",
};

function CourierHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterShop, setFilterShop] = useState("");

  const hasFilter = filterStatus || filterFrom || filterTo || filterShop;

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const { data: cs } = await supabase
      .from("couriers")
      .select("id,shop:shops(name)")
      .eq("user_id", user.id);
    const ids = (cs ?? []).map((c) => c.id);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }

    let q = (supabase as any)
      .from("orders")
      .select("id,order_no,status,total,delivery_fee,delivery_address,delivered_at,created_at,shop:shops(name)")
      .in("courier_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterStatus) q = q.eq("status", filterStatus);
    if (filterFrom) q = q.gte("created_at", filterFrom + "T00:00:00");
    if (filterTo) q = q.lte("created_at", filterTo + "T23:59:59");

    const { data } = await q;
    let items: Row[] = (data ?? []).map((d: any) => ({
      ...d,
      shop_name: d.shop?.name ?? null,
    }));

    if (filterShop) {
      const q = filterShop.toLowerCase();
      items = items.filter((r) => r.shop_name?.toLowerCase().includes(q));
    }

    setRows(items);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user, filterStatus, filterFrom, filterTo, filterShop]);

  const clearFilters = () => {
    setFilterStatus(""); setFilterFrom(""); setFilterTo(""); setFilterShop("");
  };

  const totalDeliveries = rows.filter((r) => r.status === "completed").length;
  const totalFee = rows.filter((r) => r.status === "completed")
    .reduce((s, r) => s + Number(r.delivery_fee || 0), 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Riwayat Pengantaran</h1>
        <div className="flex items-center gap-2">
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          )}
          <Button
            variant={showFilter ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
            {hasFilter && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {[filterStatus, filterFrom, filterTo, filterShop].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {showFilter && (
        <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama toko</label>
              <Input
                value={filterShop}
                onChange={(e) => setFilterShop(e.target.value)}
                placeholder="Cari toko..."
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Dari tanggal</label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Sampai tanggal</label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Antaran selesai</p>
            <p className="text-xl font-bold">{totalDeliveries}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Total ongkir</p>
            <p className="text-base font-bold">{formatIDR(totalFee)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {hasFilter ? "Tidak ada hasil dengan filter ini." : "Belum ada riwayat pengantaran."}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">#{r.order_no}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[r.status] ?? "bg-muted text-muted-foreground"}`}>
                  {r.status === "completed" ? "Selesai" : r.status === "delivering" ? "Diantar" : r.status}
                </span>
              </div>
              {r.shop_name && (
                <p className="mt-0.5 text-xs text-muted-foreground">🏪 {r.shop_name}</p>
              )}
              {r.delivery_address && (
                <p className="text-xs text-muted-foreground line-clamp-1">📍 {r.delivery_address}</p>
              )}
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {new Date(r.delivered_at ?? r.created_at).toLocaleString("id-ID", {
                    dateStyle: "short", timeStyle: "short",
                  })}
                </span>
                <span className="font-medium">Ongkir {formatIDR(Number(r.delivery_fee || 0))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
