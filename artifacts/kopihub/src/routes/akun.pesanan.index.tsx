import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Truck, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/pesanan/")({
  component: OrdersListPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", preparing: "Disiapkan",
  ready: "Siap", in_delivery: "Diantar", delivering: "Diantar",
  delivered: "Terkirim", completed: "Selesai",
  cancelled: "Dibatalkan", voided: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-700 border-amber-200",
  confirmed:   "bg-blue-100 text-blue-700 border-blue-200",
  preparing:   "bg-blue-100 text-blue-700 border-blue-200",
  ready:       "bg-violet-100 text-violet-700 border-violet-200",
  in_delivery: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivering:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled:   "bg-red-100 text-red-700 border-red-200",
  voided:      "bg-red-100 text-red-700 border-red-200",
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "ready", "in_delivery", "delivering"]);
const DONE_STATUSES   = new Set(["completed", "delivered"]);
const CANCEL_STATUSES = new Set(["cancelled", "voided"]);

type FilterTab = "semua" | "berlangsung" | "selesai" | "dibatalkan";

const TABS: { key: FilterTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "semua",       label: "Semua",       icon: Package },
  { key: "berlangsung", label: "Berlangsung",  icon: Clock },
  { key: "selesai",     label: "Selesai",      icon: CheckCircle2 },
  { key: "dibatalkan",  label: "Dibatalkan",   icon: XCircle },
];

function matchTab(status: string, tab: FilterTab) {
  if (tab === "semua")       return true;
  if (tab === "berlangsung") return ACTIVE_STATUSES.has(status);
  if (tab === "selesai")     return DONE_STATUSES.has(status);
  if (tab === "dibatalkan")  return CANCEL_STATUSES.has(status);
  return true;
}

function OrdersListPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("semua");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("id, order_no, status, total, created_at, updated_at, fulfillment, shop:coffee_shops(name, slug, logo_url)")
      .eq("customer_user_id", user.id)
      .like("order_no", "MKT-%")
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("buyer-orders-list")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "orders",
        filter: `customer_user_id=eq.${user.id}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filtered = orders.filter(o => matchTab(o.status, tab));
  const activeCount = orders.filter(o => ACTIVE_STATUSES.has(o.status)).length;

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pesanan Saya</h2>
        {activeCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            {activeCount} sedang berjalan
          </span>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              {t.key === "berlangsung" && activeCount > 0 && ` (${activeCount})`}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border py-12 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            {tab === "semua" ? "Belum ada pesanan" : `Tidak ada pesanan ${TABS.find(t => t.key === tab)?.label.toLowerCase()}`}
          </p>
          {tab === "semua" && (
            <Link to="/" className="text-xs font-medium text-primary hover:underline">Mulai belanja →</Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(o => {
            const isActive = ACTIVE_STATUSES.has(o.status);
            const colorCls = STATUS_COLOR[o.status] ?? "bg-muted text-muted-foreground border-border";
            return (
              <Link key={o.id} to="/akun/pesanan/$orderId" params={{ orderId: o.id }}>
                <div className={`group relative flex items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-md ${
                  isActive ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                }`}>
                  {isActive && (
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  {o.shop?.logo_url
                    ? <img src={o.shop.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
                    : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><ShoppingBag className="h-5 w-5 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="font-semibold text-sm truncate">{o.shop?.name ?? "Toko"}</p>
                      {o.fulfillment === "delivery" && <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {o.order_no} · {new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorCls}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      <span className="text-sm font-semibold">{formatIDR(o.total)}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground text-lg leading-none">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
