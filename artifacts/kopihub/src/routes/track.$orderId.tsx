/**
 * Halaman Tracking Pesanan Publik — /track/:orderId
 *
 * Bisa dibuka tanpa login. Merchant bisa bagikan link ini ke pembeli.
 * Realtime: Supabase Realtime channel per order_id (anon key).
 * F5 enhancement: live indicator, animated timeline, live last-update time.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import {
  Store, Check, Loader2, Phone, MapPin,
  PackageX, Bike, Clock, Package, PackageCheck, ShieldCheck,
  Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/track/$orderId")({
  component: TrackPage,
});

type Tracking = {
  id: string;
  order_no: string;
  status: string;
  fulfillment: string;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  courier_name: string | null;
  courier_phone: string | null;
  courier_plate: string | null;
  delivery_proof_url: string | null;
  delivered_at: string | null;
  shop: { name: string; logo_url: string | null; slug: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending:     "Menunggu Konfirmasi",
  confirmed:   "Dikonfirmasi",
  preparing:   "Sedang Disiapkan",
  ready:       "Siap",
  in_delivery: "Sedang Diantar",
  delivering:  "Sedang Diantar",
  delivered:   "Terkirim",
  completed:   "Selesai",
  cancelled:   "Dibatalkan",
  voided:      "Dibatalkan",
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

const STEPS_DELIVERY = [
  { key: "pending",     label: "Menunggu Konfirmasi", icon: Clock,        desc: "Pesanan menunggu konfirmasi toko" },
  { key: "confirmed",   label: "Dikonfirmasi",         icon: Check,        desc: "Toko telah menerima pesanan" },
  { key: "preparing",   label: "Sedang Disiapkan",     icon: Package,      desc: "Toko sedang menyiapkan pesananmu" },
  { key: "ready",       label: "Siap Diantar",         icon: PackageCheck, desc: "Pesanan siap, menunggu kurir" },
  { key: "in_delivery", label: "Sedang Diantar",       icon: Bike,         desc: "Kurir sedang mengantarkan pesananmu" },
  { key: "completed",   label: "Selesai",              icon: ShieldCheck,  desc: "Pesanan telah diterima — terima kasih!" },
];

const STEPS_PICKUP = [
  { key: "pending",   label: "Menunggu Konfirmasi", icon: Clock,        desc: "Pesanan menunggu konfirmasi toko" },
  { key: "confirmed", label: "Dikonfirmasi",         icon: Check,        desc: "Toko telah menerima pesanan" },
  { key: "preparing", label: "Sedang Disiapkan",     icon: Package,      desc: "Toko sedang menyiapkan pesananmu" },
  { key: "ready",     label: "Siap Diambil",         icon: PackageCheck, desc: "Silakan datang untuk mengambil pesananmu" },
  { key: "completed", label: "Selesai",              icon: ShieldCheck,  desc: "Pesanan selesai — terima kasih!" },
];

function getStepIdx(steps: typeof STEPS_DELIVERY, status: string) {
  return steps.findIndex(
    (s) => s.key === status ||
      (status === "delivering" && s.key === "in_delivery") ||
      (status === "delivered"  && s.key === "completed"),
  );
}

function TrackPage() {
  const { orderId } = Route.useParams();
  const [data, setData] = useState<Tracking | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [live, setLive]         = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: row } = await supabase
      .from("orders")
      .select(`
        id, order_no, status, fulfillment, total, delivery_fee,
        delivery_address, customer_name, created_at, updated_at,
        tracking_number, tracking_url, courier_name,
        delivery_proof_url,
        shop:shops(name, logo_url, slug)
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (!row) {
      setNotFound(true);
    } else {
      setData(row as unknown as Tracking);
      setLastUpdate(new Date().toLocaleTimeString("id-ID"));
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  // F5 — Supabase Realtime per order_id (anon key)
  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`track-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          setData((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<Tracking>) } : prev,
          );
          setLastUpdate(new Date().toLocaleTimeString("id-ID"));
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(ch); };
  }, [orderId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <PackageX className="h-14 w-14 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">Pesanan tidak ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">Link mungkin sudah kadaluarsa atau ID salah.</p>
        </div>
        <Link to="/" className="text-sm text-primary underline">Kembali ke beranda</Link>
      </div>
    );
  }

  const isCancelled = ["cancelled", "voided"].includes(data.status);
  const isCompleted = ["completed", "delivered"].includes(data.status);
  const isDelivery  = data.fulfillment === "delivery";
  const steps       = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
  const currentIdx  = getStepIdx(steps, data.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            {data.shop?.logo_url ? (
              <img src={data.shop.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-border" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-4 w-4" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{data.shop?.name ?? "Toko"}</p>
              <p className="text-xs text-muted-foreground">Lacak pesanan</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {live ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <Wifi className="h-3 w-3" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
        {/* ── Ringkasan pesanan ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Nomor Pesanan</p>
              <p className="text-xl font-bold mt-0.5">#{data.order_no}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold mt-0.5">{formatIDR(Number(data.total))}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[data.status] ?? "bg-muted text-muted-foreground"}`}>
              {STATUS_LABEL[data.status] ?? data.status}
            </span>
            {Number(data.delivery_fee) > 0 && (
              <p className="text-xs text-muted-foreground">
                Ongkir {formatIDR(Number(data.delivery_fee))}
              </p>
            )}
          </div>
        </div>

        {/* ── Alamat pengantaran ─────────────────────────────────────────────── */}
        {data.delivery_address && (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Diantar ke</p>
              <p className="leading-snug">{data.delivery_address}</p>
              {data.customer_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{data.customer_name}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Dibatalkan ────────────────────────────────────────────────────── */}
        {isCancelled && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <PackageX className="h-8 w-8 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-red-800">Pesanan Dibatalkan</p>
              <p className="text-xs text-red-600 mt-0.5">Hubungi toko jika ada pertanyaan.</p>
            </div>
          </div>
        )}

        {/* ── Timeline status — animated ────────────────────────────────────── */}
        {!isCancelled && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Status Pesanan</h2>
            <ol className="relative space-y-0">
              {steps.map((step, i) => {
                const done   = currentIdx >= 0 && i <= currentIdx;
                const active = i === currentIdx;
                const Icon   = step.icon;
                const isLast = i === steps.length - 1;

                return (
                  <li key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        done
                          ? active
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted bg-background text-muted-foreground"
                      }`}>
                        {/* F5 — animated ping for active step to show live updates */}
                        {active && !isLast && (
                          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                        )}
                        {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[24px] rounded-full transition-colors duration-500 ${done && i < currentIdx ? "bg-emerald-400" : "bg-muted"}`} />
                      )}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <p className={`text-sm leading-none mt-2 ${active ? "font-bold text-foreground" : done ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      {active && (
                        <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {isCompleted && (
              <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-medium text-center">
                🎉 Pesanan selesai! Terima kasih sudah berbelanja.
              </div>
            )}
          </div>
        )}

        {/* ── Info kurir ────────────────────────────────────────────────────── */}
        {isDelivery && data.courier_name && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium">Informasi Kurir</h2>
            <p className="font-semibold">{data.courier_name}</p>
            {data.courier_plate && (
              <p className="text-xs text-muted-foreground mt-0.5">Plat: {data.courier_plate}</p>
            )}
            {data.tracking_number && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Resi: {data.tracking_number}</p>
            )}
            {data.courier_phone && (
              <a href={`tel:${data.courier_phone}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary">
                <Phone className="h-3.5 w-3.5" /> {data.courier_phone}
              </a>
            )}
            {data.tracking_url && (
              <a href={data.tracking_url} target="_blank" rel="noopener noreferrer"
                className="mt-2 ml-4 inline-flex items-center gap-1 text-xs text-primary underline">
                Lacak di situs kurir →
              </a>
            )}
          </div>
        )}

        {/* ── Bukti pengantaran ──────────────────────────────────────────────── */}
        {data.delivery_proof_url && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium">Bukti Pengantaran</h2>
            <a href={data.delivery_proof_url} target="_blank" rel="noreferrer">
              <img src={data.delivery_proof_url} alt="Bukti pengantaran"
                className="w-full max-h-72 rounded-lg border border-border object-cover" />
            </a>
            {data.delivered_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Diantar {new Date(data.delivered_at).toLocaleString("id-ID")}
              </p>
            )}
          </div>
        )}

        {/* ── Footer / last update ──────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-1">
          <p>Pesanan dibuat {new Date(data.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          {lastUpdate && <p>Terakhir diperbarui pukul {lastUpdate}</p>}
          {live && (
            <p className="flex items-center justify-center gap-1 text-emerald-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Pembaruan otomatis aktif
            </p>
          )}
        </div>

        {/* ── CTA login ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-muted/40 p-5 text-center">
          <p className="text-sm font-medium">Punya akun UMKMgo?</p>
          <p className="text-xs text-muted-foreground mt-1">Masuk untuk riwayat lengkap, ulasan, dan chat dengan toko.</p>
          <Link to="/login"
            className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Masuk / Daftar
          </Link>
        </div>
      </main>
    </div>
  );
}
