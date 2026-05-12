import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Loader2, Download, TrendingUp, ShoppingBag, Coins, Package, MessageSquare,
  Share2, RefreshCw, Calendar, Star, Clock,
} from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/laporan-harian")({
  head: () => ({ meta: [{ title: "Laporan Harian" }] }),
  component: LaporanHarianPage,
});

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

type ItemRow = {
  order_id: string;
  name: string;
  quantity: number;
  subtotal: number;
};

type IngRow = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
};

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function hourLabel(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function LaporanHarianPage() {
  const { shop } = useCurrentShop();
  const [date, setDate] = useState(todayJakarta());
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [lowStock, setLowStock] = useState<IngRow[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);

    const start = `${date}T00:00:00`;
    const end   = `${date}T23:59:59`;

    const [{ data: ordData }, { data: ingData }] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("shop_id", shop.id)
        .gte("created_at", start)
        .lte("created_at", end)
        .in("status", ["completed", "preparing", "ready", "delivering"])
        .order("created_at"),
      supabase
        .from("ingredients")
        .select("id, name, unit, current_stock, min_stock")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("current_stock")
        .limit(100),
    ]);

    const ords = (ordData ?? []) as OrderRow[];
    setOrders(ords);

    const ingAll = (ingData ?? []) as IngRow[];
    setLowStock(ingAll.filter(i => Number(i.current_stock) <= Number(i.min_stock) || Number(i.current_stock) <= 0));

    if (ords.length > 0) {
      const ids = ords.map(o => o.id);
      const { data: itemData } = await supabase
        .from("order_items")
        .select("order_id, name, quantity, subtotal")
        .in("order_id", ids);
      setItems((itemData ?? []) as ItemRow[]);
    } else {
      setItems([]);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [shop?.id, date]);

  const completedOrders = orders.filter(o => o.status === "completed");
  const omset = completedOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalPesanan = orders.length;

  // Top menu
  const menuMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const it of items) {
    if (!menuMap[it.name]) menuMap[it.name] = { name: it.name, qty: 0, revenue: 0 };
    menuMap[it.name].qty += it.quantity;
    menuMap[it.name].revenue += Number(it.subtotal);
  }
  const topMenu = Object.values(menuMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Hourly chart
  const hourlyMap: Record<number, number> = {};
  for (const o of completedOrders) {
    const h = new Date(o.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + Number(o.total);
  }
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    omset: hourlyMap[h] ?? 0,
  })).filter(d => d.omset > 0 || (hourlyMap[d.hour.slice(0,2) as any] != null));

  const peakHour = Object.entries(hourlyMap).sort((a, b) => b[1] - a[1])[0];

  // WhatsApp report text
  const buildWAText = () => {
    const lines = [
      `📊 *Laporan Harian — ${fmtDate(date + "T00:00:00")}*`,
      `🏪 ${shop?.name ?? "Toko"}`,
      "",
      `💰 Omset: *${formatIDR(omset)}*`,
      `🛍️ Total Pesanan: *${totalPesanan}* (${completedOrders.length} selesai)`,
      peakHour ? `⏰ Jam Tersibuk: *${peakHour[0].toString().padStart(2,"0")}:00* (${formatIDR(Number(peakHour[1]))})` : null,
      "",
      topMenu.length > 0 ? `🏆 *Top Menu:*` : null,
      ...topMenu.map((m, i) => `${i + 1}. ${m.name} — ${m.qty}x (${formatIDR(m.revenue)})`),
      "",
      lowStock.length > 0 ? `⚠️ *Stok Kritis (${lowStock.length} bahan):*` : null,
      ...lowStock.slice(0, 5).map(s => `• ${s.name}: ${s.current_stock} ${s.unit}${s.current_stock <= 0 ? " ❌ HABIS" : ""}`),
      "",
      `_Dikirim otomatis oleh KopiHub_`,
    ].filter(Boolean);

    return encodeURIComponent(lines.join("\n"));
  };

  const shareWA = () => {
    const num = shop ? (shop as any).whatsapp ?? "" : "";
    const text = buildWAText();
    const url = num
      ? `https://wa.me/${num.replace(/\D/g, "")}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener");
  };

  if (!shop) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Laporan Harian</h1>
          <p className="text-sm text-muted-foreground">Ringkasan performa toko dalam satu hari.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              max={todayJakarta()}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={shareWA} className="bg-green-600 hover:bg-green-700 text-white">
            <Share2 className="h-4 w-4 mr-1.5" />
            Bagikan via WhatsApp
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div ref={reportRef} className="space-y-5">
          {/* Tanggal header */}
          <div className="rounded-xl bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{fmtDate(date + "T00:00:00")}</p>
              <p className="text-sm opacity-80">{shop.name}</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Coins} label="Total Omset" value={formatIDR(omset)} color="emerald" />
            <StatCard icon={ShoppingBag} label="Total Pesanan" value={String(totalPesanan)} sub={`${completedOrders.length} selesai`} color="blue" />
            <StatCard icon={Star} label="Menu Terlaris" value={topMenu[0]?.name ?? "—"} sub={topMenu[0] ? `${topMenu[0].qty}x terjual` : ""} color="amber" />
            <StatCard
              icon={Clock}
              label="Jam Tersibuk"
              value={peakHour ? `${peakHour[0].toString().padStart(2,"0")}:00` : "—"}
              sub={peakHour ? formatIDR(Number(peakHour[1])) : ""}
              color="purple"
            />
          </div>

          {/* Hourly chart */}
          {Object.keys(hourlyMap).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Omset per Jam
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => formatIDR(v)} labelFormatter={(l) => `Jam ${l}`} />
                  <Bar dataKey="omset" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Menu */}
          {topMenu.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3">🏆 Top Menu Hari Ini</p>
              <div className="space-y-2">
                {topMenu.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{m.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{m.qty}x</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (m.qty / (topMenu[0]?.qty || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold shrink-0">{formatIDR(m.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock */}
          {lowStock.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Stok Kritis ({lowStock.length} bahan)
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {lowStock.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-white border border-red-100 px-3 py-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className={`text-xs font-semibold ${s.current_stock <= 0 ? "text-red-600" : "text-amber-600"}`}>
                      {s.current_stock <= 0 ? "HABIS" : `${s.current_stock} ${s.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {orders.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada pesanan pada tanggal ini.</p>
            </div>
          )}

          {/* WhatsApp CTA */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Kirim laporan via WhatsApp</p>
                <p className="text-xs text-green-700">Bagikan ringkasan ini ke nomor WhatsApp kamu.</p>
              </div>
            </div>
            <Button onClick={shareWA} className="bg-green-600 hover:bg-green-700 text-white shrink-0">
              <Share2 className="h-4 w-4 mr-1.5" />
              Bagikan Sekarang
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: "emerald" | "blue" | "amber" | "purple";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue:    "bg-blue-50 text-blue-600 border-blue-100",
    amber:   "bg-amber-50 text-amber-600 border-amber-100",
    purple:  "bg-purple-50 text-purple-600 border-purple-100",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border mb-3 ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5 truncate" title={value}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
