import { createFileRoute } from "@tanstack/react-router";
import { OrdersTabs } from "@/components/orders/OrdersTabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ShoppingBag, Phone, MapPin, Bell, BellOff, Printer, Bot } from "lucide-react";
import { toast } from "sonner";
import { ensureNotificationPermission, notifyOrder } from "@/lib/notify";
import { getAutoPrintEnabled } from "./pos-app.settings";

export const Route = createFileRoute("/pos-app/online-orders")({
  component: OnlineOrders,
});

type Order = {
  id: string;
  order_no: string;
  status: string;
  fulfillment: string;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
  created_at: string;
  courier_id: string | null;
  payment_status: "unpaid" | "awaiting_verification" | "paid" | "refunded";
  payment_method: string;
  payment_proof_url: string | null;
};

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  note: string | null;
};

type Courier = { id: string; name: string; phone: string; plate_number: string | null };

type ShopSettings = {
  auto_reply_enabled: boolean;
  auto_reply_message: string | null;
  open_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  whatsapp: string | null;
};

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  delivering: "bg-purple-100 text-purple-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  voided: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  preparing: "Diproses",
  ready: "Siap",
  delivering: "Diantar",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  voided: "Dibatalkan",
};

const TABS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "active", label: "Aktif", statuses: ["pending", "preparing", "ready", "delivering"] },
  { key: "done", label: "Selesai", statuses: ["completed"] },
  { key: "cancelled", label: "Dibatalkan", statuses: ["cancelled", "voided"] },
];

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function isShopOpen(openHours: ShopSettings["open_hours"]): boolean {
  if (!openHours) return true;
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const h = openHours[dayKey];
  if (!h || h.closed) return false;
  const hhmm = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  return hhmm >= h.open && hhmm <= h.close;
}

function OnlineOrders() {
  const { shop, loading: loadingShop } = useCurrentShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [tab, setTab] = useState<string>("active");
  const [loading, setLoading] = useState(true);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!shop) return;
    let cancelled = false;

    const load = async () => {
      const [{ data: ord }, { data: cs }, { data: settings }] = await Promise.all([
        supabase
          .from("orders")
          .select("id,order_no,status,fulfillment,total,delivery_fee,delivery_address,customer_name,customer_phone,note,created_at,courier_id,payment_status,payment_method,payment_proof_url")
          .eq("shop_id", shop.id)
          .eq("channel", "online")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("couriers")
          .select("id,name,phone,plate_number")
          .eq("shop_id", shop.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("shops")
          .select("auto_reply_enabled, auto_reply_message, open_hours, whatsapp")
          .eq("id", shop.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setOrders((ord ?? []) as Order[]);
      setCouriers((cs ?? []) as Courier[]);
      setShopSettings((settings as ShopSettings | null) ?? null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`online-orders-${shop.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shop.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Order & { channel: string };
            if (row.channel !== "online") return;
            setOrders((prev) => (prev.some((o) => o.id === row.id) ? prev : [row, ...prev]));

            // Auto-reply check
            if (shopSettings?.auto_reply_enabled && !isShopOpen(shopSettings.open_hours)) {
              toast.info(
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                  <div>
                    <p className="font-semibold text-sm">Auto-reply terkirim #{row.order_no}</p>
                    <p className="text-xs text-muted-foreground">Pesanan masuk di luar jam buka.</p>
                  </div>
                </div>,
                { duration: 5000 }
              );
            } else {
              toast.info(`Pesanan baru #${row.order_no}`, { icon: <Bell className="h-4 w-4" /> });
            }

            notifyOrder("Pesanan baru masuk", `Order #${row.order_no} menunggu konfirmasi`);

            // Auto-print struk (F5-4) — notify user; actual ESC/POS print
            // happens when user clicks Cetak on the order card (requires items data).
            if (getAutoPrintEnabled()) {
              toast.info(
                `Pesanan baru #${row.order_no} — buka untuk cetak struk`,
                { icon: <Printer className="h-4 w-4" />, duration: 8000 }
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Order & { channel: string };
            if (row.channel !== "online") return;
            setOrders((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...row } : o)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [shop, shopSettings?.auto_reply_enabled]);

  const filtered = useMemo(() => {
    const sts = TABS.find((t) => t.key === tab)?.statuses ?? [];
    return orders.filter((o) => sts.includes(o.status));
  }, [orders, tab]);

  const loadItems = async (orderId: string) => {
    if (items[orderId]) return;
    const { data } = await supabase
      .from("order_items")
      .select("id,name,quantity,unit_price,subtotal,note")
      .eq("order_id", orderId);
    setItems((prev) => ({ ...prev, [orderId]: (data ?? []) as OrderItem[] }));
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: status as never })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Status diperbarui");
  };

  const assignCourier = async (id: string, courier_id: string | null) => {
    const { error } = await supabase.from("orders").update({ courier_id }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(courier_id ? "Kurir ditugaskan" : "Penugasan dibatalkan");
  };

  const verifyPayment = async (id: string, paid: boolean) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: paid ? "paid" : "unpaid", paid_at: paid ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(paid ? "Pembayaran diverifikasi" : "Pembayaran ditolak");
  };

  if (loadingShop || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const counts = TABS.map((t) => ({
    key: t.key,
    n: orders.filter((o) => t.statuses.includes(o.status)).length,
  }));

  const shopClosed = !isShopOpen(shopSettings?.open_hours ?? null);
  const autoReplyActive = shopSettings?.auto_reply_enabled && shopClosed;

  return (
    <>
      <OrdersTabs />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <ShoppingBag className="h-5 w-5" />
          <h2 className="text-base font-semibold text-muted-foreground">Order Web Toko</h2>

          {/* Auto-reply indicator */}
          {autoReplyActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Bot className="h-3 w-3" />
              Auto-reply aktif (toko tutup)
            </span>
          )}

          <Button
            size="sm"
            variant={notifPerm === "granted" ? "secondary" : "outline"}
            className="ml-auto gap-1.5"
            onClick={async () => {
              const p = await ensureNotificationPermission();
              setNotifPerm(p);
              if (p === "granted") {
                notifyOrder("Notifikasi aktif", "Anda akan mendapat notifikasi pesanan baru");
                toast.success("Notifikasi aktif");
              } else if (p === "denied") {
                toast.error("Izin notifikasi ditolak. Aktifkan dari setelan browser.");
              }
            }}
          >
            {notifPerm === "granted" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {notifPerm === "granted" ? "Notif aktif" : "Aktifkan notif"}
          </Button>
        </div>

        {/* Auto-reply message preview */}
        {autoReplyActive && shopSettings?.auto_reply_message && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
            <Bot className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-0.5">Pesan auto-reply yang dikirim ke customer:</p>
              <p className="text-sm text-blue-900 italic">"{shopSettings.auto_reply_message}"</p>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-1 border-b border-border">
          {TABS.map((t) => {
            const c = counts.find((x) => x.key === t.key)?.n ?? 0;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{c}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Tidak ada pesanan.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                items={items[o.id]}
                couriers={couriers}
                autoReplyMessage={autoReplyActive ? (shopSettings?.auto_reply_message ?? null) : null}
                onExpand={() => loadItems(o.id)}
                onUpdateStatus={(s) => updateStatus(o.id, s)}
                onAssign={(cid) => assignCourier(o.id, cid)}
                onVerifyPayment={(paid) => verifyPayment(o.id, paid)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function OrderCard({
  order,
  items,
  couriers,
  autoReplyMessage,
  onExpand,
  onUpdateStatus,
  onAssign,
  onVerifyPayment,
}: {
  order: Order;
  items: OrderItem[] | undefined;
  couriers: Courier[];
  autoReplyMessage: string | null;
  onExpand: () => void;
  onUpdateStatus: (s: string) => void;
  onAssign: (cid: string | null) => void;
  onVerifyPayment: (paid: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDelivery = order.fulfillment === "delivery";

  const nextActions: { status: string; label: string; variant?: "default" | "outline" }[] =
    order.status === "pending"
      ? [{ status: "preparing", label: "Terima" }, { status: "cancelled", label: "Tolak", variant: "outline" }]
      : order.status === "preparing"
      ? [{ status: "ready", label: isDelivery ? "Siap diantar" : "Siap diambil" }]
      : order.status === "ready"
      ? isDelivery
        ? [{ status: "delivering", label: "Mulai antar" }]
        : [{ status: "completed", label: "Selesaikan" }]
      : order.status === "delivering"
      ? [{ status: "completed", label: "Tandai terkirim" }]
      : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">#{order.order_no}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[order.status]}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{order.fulfillment}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.created_at).toLocaleString("id-ID")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatIDR(Number(order.total))}</p>
          {Number(order.delivery_fee) > 0 && (
            <p className="text-xs text-muted-foreground">Ongkir {formatIDR(Number(order.delivery_fee))}</p>
          )}
        </div>
      </div>

      <div className="mt-2 grid gap-1 text-sm">
        {order.customer_name && <p>👤 {order.customer_name}</p>}
        {order.customer_phone && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
          </p>
        )}
        {order.delivery_address && (
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {order.delivery_address}
          </p>
        )}
        {order.note && <p className="text-muted-foreground">📝 {order.note}</p>}
      </div>

      {/* Auto-reply indicator on the order */}
      {autoReplyMessage && order.status === "pending" && (
        <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 flex items-start gap-2">
          <Bot className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Auto-reply dikirim:</span> "{autoReplyMessage}"
          </p>
        </div>
      )}

      {(order.payment_method !== "cash" || order.payment_proof_url || order.payment_status !== "unpaid") && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold uppercase">{order.payment_method}</span>
              <span className="ml-2">
                {order.payment_status === "paid" && <span className="text-emerald-600">✓ Lunas</span>}
                {order.payment_status === "awaiting_verification" && <span className="text-amber-600">⏳ Perlu verifikasi</span>}
                {order.payment_status === "unpaid" && <span className="text-muted-foreground">Belum bayar</span>}
              </span>
            </div>
            {order.payment_proof_url && (
              <button
                onClick={async () => {
                  const path = order.payment_proof_url!;
                  if (path.startsWith("http")) { window.open(path, "_blank", "noopener"); return; }
                  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 10);
                  if (error || !data) { toast.error("Gagal membuka bukti"); return; }
                  window.open(data.signedUrl, "_blank", "noopener");
                }}
                className="text-primary hover:underline"
              >
                Lihat bukti
              </button>
            )}
          </div>
          {order.payment_status === "awaiting_verification" && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => onVerifyPayment(true)}>Verifikasi lunas</Button>
              <Button size="sm" variant="outline" onClick={() => onVerifyPayment(false)}>Tolak</Button>
            </div>
          )}
        </div>
      )}

      {open && items && (
        <div className="mt-3 rounded-lg bg-muted/40 p-2 text-sm">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between py-0.5">
              <span>
                {it.quantity}× {it.name}
                {it.note && <span className="text-xs text-muted-foreground"> — {it.note}</span>}
              </span>
              <span>{formatIDR(Number(it.subtotal))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setOpen((v) => !v); if (!open) onExpand(); }}>
          {open ? "Sembunyikan" : "Lihat item"}
        </Button>

        {isDelivery && ["preparing", "ready", "delivering"].includes(order.status) && (
          <Select value={order.courier_id ?? "none"} onValueChange={(v) => onAssign(v === "none" ? null : v)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Pilih kurir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Belum ditugaskan</SelectItem>
              {couriers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.plate_number ? `(${c.plate_number})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex gap-2">
          {nextActions.map((a) => (
            <Button key={a.status} size="sm" variant={a.variant ?? "default"} onClick={() => onUpdateStatus(a.status)}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
