import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, Clock, CheckCircle2, Bell, Filter, BellRing, X, UserCheck, Users } from "lucide-react";
import { SplitBillDialog } from "@/components/SplitBillDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/pos-app/kds")({
  component: KDSPage,
});

type Order = {
  id: string;
  order_no: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  fulfillment: string;
  created_at: string;
  customer_name: string | null;
  note: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
};

// Aging color berdasarkan menit sejak created_at
function ageStyle(minutes: number) {
  if (minutes < 5) return { ring: "ring-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", label: "Baru" };
  if (minutes < 10) return { ring: "ring-amber-500/30", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40", label: "Normal" };
  if (minutes < 15) return { ring: "ring-orange-500/40", badge: "bg-orange-500/20 text-orange-300 border-orange-500/40", label: "Lama" };
  return { ring: "ring-red-500/60 animate-pulse", badge: "bg-red-500/20 text-red-300 border-red-500/40", label: "URGENT" };
}

function fmtElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}d`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
  category_id: string | null;
  kds_station?: string | null;
};

type ServiceCall = {
  id: string;
  shop_id: string;
  table_id: string;
  table_name: string;
  called_at: string;
  type: "waiter" | "bill";
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}d lalu`;
  return `${Math.floor(diff / 60)} mnt lalu`;
}

type SplitTarget = { orderId: string; orderNo: string; total: number; items?: OrderItem[] };

function KDSPage() {
  const { shop, outlet, loading: loadingShop } = useCurrentShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeStation, setActiveStation] = useState<string>("all");
  const [splitTarget, setSplitTarget] = useState<SplitTarget | null>(null);

  // Service calls state — single persistent channel ref
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const serviceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Tick setiap 15 detik agar timer aging hidup
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Derive stations reaktif dari items aktif (otomatis bersih saat order selesai)
  const stations = useMemo(() => {
    const set = new Set<string>();
    Object.values(items).forEach((arr) => arr.forEach((it) => set.add(it.kds_station || "general")));
    return Array.from(set);
  }, [items]);

  // Subscribe to service calls broadcast (single channel)
  useEffect(() => {
    if (!shop?.id) return;

    const ch = supabase
      .channel(`service-calls-${shop.id}`)
      .on("broadcast", { event: "service_call" }, ({ payload }) => {
        const call = payload as ServiceCall;
        setServiceCalls((prev) => {
          const existing = prev.findIndex((c) => c.table_id === call.table_id);
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = call;
            return next;
          }
          return [call, ...prev];
        });
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {});
        toast.info(`🔔 ${call.table_name} memanggil pelayan!`, {
          duration: 8000,
          description: "Lihat panel panggilan di atas",
        });
      })
      .on("broadcast", { event: "dismiss_call" }, ({ payload }) => {
        setServiceCalls((prev) => prev.filter((c) => c.id !== (payload as { id: string }).id));
      })
      .subscribe();

    serviceChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      serviceChannelRef.current = null;
    };
  }, [shop?.id]);

  function broadcastDismiss(id: string) {
    serviceChannelRef.current
      ?.send({ type: "broadcast", event: "dismiss_call", payload: { id } })
      .catch(() => {});
  }

  function dismissCall(call: ServiceCall) {
    setServiceCalls((prev) => prev.filter((c) => c.id !== call.id));
    broadcastDismiss(call.id);
  }

  function dismissAllCalls() {
    serviceCalls.forEach((c) => broadcastDismiss(c.id));
    setServiceCalls([]);
  }

  useEffect(() => {
    if (!outlet) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, status, fulfillment, created_at, customer_name, note")
        .eq("outlet_id", outlet.id)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Gagal mengambil data pesanan");
      } else {
        setOrders(data as Order[]);
        if (data.length > 0) {
          const orderIds = data.map((o) => o.id);
          const { data: itemData } = await supabase
            .from("order_items")
            .select(`
              id, 
              order_id, 
              name, 
              quantity, 
              note,
              menu_items (
                category_id,
                categories (
                  kds_station
                )
              )
            `)
            .in("order_id", orderIds);
          
          if (itemData) {
            const processedItems = itemData.map((item: any) => ({
              id: item.id,
              order_id: item.order_id,
              name: item.name,
              quantity: item.quantity,
              note: item.note,
              category_id: item.menu_items?.category_id ?? null,
              kds_station: item.menu_items?.categories?.kds_station || "general"
            }));

            const grouped = processedItems.reduce((acc: any, item: any) => {
              if (!acc[item.order_id]) acc[item.order_id] = [];
              acc[item.order_id].push(item);
              return acc;
            }, {});
            setItems(grouped);

          }
        }
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel(`kds-${outlet.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `outlet_id=eq.${outlet.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            if (["pending", "preparing", "ready"].includes(newOrder.status)) {
              setOrders((prev) => [...prev, newOrder]);
              supabase
                .from("order_items")
                .select(`
                  id, 
                  order_id, 
                  name, 
                  quantity, 
                  note,
                  menu_items (
                    category_id,
                    categories (
                      kds_station
                    )
                  )
                `)
                .eq("order_id", newOrder.id)
                .then(({ data }) => {
                  if (data) {
                    const processed = data.map((item: any) => ({
                      id: item.id,
                      order_id: item.order_id,
                      name: item.name,
                      quantity: item.quantity,
                      note: item.note,
                      category_id: item.menu_items?.category_id ?? null,
                      kds_station: item.menu_items?.categories?.kds_station || "general"
                    }));
                    setItems((prev) => ({ ...prev, [newOrder.id]: processed }));
                  }
                });
              
              const audio = new Audio("/notification.mp3");
              audio.play().catch(() => {});
              toast.info(`Pesanan baru #${newOrder.order_no}`);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            if (["pending", "preparing", "ready"].includes(updated.status)) {
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === updated.id);
                return exists ? prev.map((o) => (o.id === updated.id ? updated : o)) : [...prev, updated];
              });
            } else {
              setOrders((prev) => prev.filter((o) => o.id !== updated.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [outlet]);

  const filteredOrders = useMemo(() => {
    if (activeStation === "all") return orders;
    return orders.filter(order => {
      const orderItems = items[order.id] || [];
      return orderItems.some(item => item.kds_station === activeStation);
    });
  }, [orders, items, activeStation]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: status as any })
      .eq("id", id);
    
    if (error) {
      toast.error("Gagal memperbarui status");
    } else {
      toast.success(`Pesanan ${status === "preparing" ? "mulai diproses" : "siap"}`);
    }
  };

  if (loadingShop || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white overflow-hidden">
      {/* ── Service Calls Panel ───────────────────────────────────────── */}
      {serviceCalls.length > 0 && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-400 animate-bounce" />
              <span className="text-sm font-bold text-amber-300">
                Panggilan Pelayan ({serviceCalls.length})
              </span>
            </div>
            <button
              onClick={dismissAllCalls}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Tutup Semua
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {serviceCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5"
              >
                <UserCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-amber-200">{call.table_name}</span>
                <span className="text-[10px] text-amber-400/70">{timeAgo(call.called_at)}</span>
                <button
                  onClick={() => dismissCall(call)}
                  className="ml-1 text-amber-400/60 hover:text-amber-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 px-6 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kitchen Display System</h1>
            <p className="text-xs text-slate-400">{outlet?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={activeStation} onValueChange={setActiveStation}>
              <SelectTrigger className="w-[180px] h-8 bg-transparent border-none text-white focus:ring-0">
                <SelectValue placeholder="Semua Stasiun" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="all">Semua Stasiun</SelectItem>
                {stations.map(station => (
                  <SelectItem key={station} value={station}>
                    {station.charAt(0).toUpperCase() + station.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">{format(new Date(), "EEEE, d MMMM", { locale: id })}</div>
            <div className="text-xs text-slate-400">Real-time Sync Active</div>
          </div>
          {/* Bell badge shows count of pending calls */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`bg-slate-800 border-slate-700 hover:bg-slate-700 ${serviceCalls.length > 0 ? "border-amber-500/60" : ""}`}
            >
              <Bell className={`h-4 w-4 ${serviceCalls.length > 0 ? "text-amber-400" : ""}`} />
            </Button>
            {serviceCalls.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {serviceCalls.length}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 overflow-x-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <ChefHat className="mb-4 h-16 w-16 opacity-10" />
            <p className="text-lg font-medium">Belum ada pesanan masuk</p>
            <p className="text-sm">Pesanan untuk stasiun ini akan muncul di sini</p>
          </div>
        ) : (
          <div className="flex gap-6 h-full items-start">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`flex w-80 shrink-0 flex-col rounded-xl border-2 bg-slate-900 shadow-2xl transition-all ${
                  order.status === "preparing" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-800"
                }`}
              >
                {/* Card Header */}
                <div className={`p-4 rounded-t-lg ${order.status === "preparing" ? "bg-blue-600" : "bg-slate-800"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black">#{order.order_no}</span>
                    <div className="flex items-center gap-1 text-xs font-medium opacity-80">
                      <Clock className="h-3 w-3" />
                      {format(new Date(order.created_at), "HH:mm")}
                    </div>
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider opacity-90">
                    {order.customer_name || "Pelanggan"} • {order.fulfillment}
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
                  {items[order.id]
                    ?.filter(item => activeStation === "all" || item.kds_station === activeStation)
                    .map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-800 text-sm font-bold">
                        {item.quantity}x
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold leading-tight">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">{item.kds_station}</div>
                        {item.note && (
                          <div className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 border border-amber-500/20">
                            Catatan: {item.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.note && (
                    <div className="mt-4 border-t border-slate-800 pt-3">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Order Note</div>
                      <div className="text-xs text-slate-300 italic">{order.note}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                  {order.status === "pending" ? (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12"
                      onClick={() => updateStatus(order.id, "preparing")}
                    >
                      MULAI PROSES
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                      onClick={() => updateStatus(order.id, "ready")}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      SIAP SAJI
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={async () => {
                      let orderItems = items[order.id];
                      if (!orderItems) {
                        const { data } = await supabase
                          .from("order_items")
                          .select("id,name,quantity,subtotal,note")
                          .eq("order_id", order.id);
                        orderItems = (data ?? []) as any;
                        setItems((prev) => ({ ...prev, [order.id]: orderItems }));
                      }
                      const { data: orderData } = await supabase
                        .from("orders")
                        .select("total")
                        .eq("id", order.id)
                        .maybeSingle();
                      setSplitTarget({
                        orderId: order.id,
                        orderNo: order.order_no,
                        total: Number(orderData?.total ?? 0),
                        items: orderItems as any,
                      });
                    }}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Split Bill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {splitTarget && (
        <SplitBillDialog
          open={!!splitTarget}
          onClose={() => setSplitTarget(null)}
          total={splitTarget.total}
          orderNo={splitTarget.orderNo}
          items={splitTarget.items as any}
        />
      )}
    </div>
  );
}
