import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarCheck, Clock, User, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Phone, ArrowLeft, ShieldCheck,
} from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/booking/cancel/$token")({
  component: BookingCancelPage,
});

type BookingDetail = {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  notes: string | null;
  cancelled_at: string | null;
  deposit_required: boolean | null;
  deposit_amount: number | null;
  voucher_code: string | null;
  voucher_discount: number | null;
  slot: {
    id: string;
    service_name: string;
    slot_date: string;
    slot_time: string;
    duration_min: number;
    price: number;
    booked_count: number;
    shop: {
      id: string;
      name: string;
      slug: string;
      phone: string | null;
    };
  };
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(t: string) {
  return t.slice(0, 5);
}

function BookingCancelPage() {
  const { token } = Route.useParams();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<"view" | "confirm" | "cancelling" | "done" | "already_cancelled" | "past">("view");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id, status, customer_name, customer_phone, party_size, notes,
          cancelled_at, deposit_required, deposit_amount,
          voucher_code, voucher_discount,
          booking_slots!inner (
            id, service_name, slot_date, slot_time, duration_min, price, booked_count,
            coffee_shops!inner ( id, name, slug, phone )
          )
        `)
        .eq("cancellation_token", token)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const raw = data as any;
      const slot = raw.booking_slots;
      const shop = slot.coffee_shops;

      const parsed: BookingDetail = {
        id: raw.id,
        status: raw.status,
        customer_name: raw.customer_name,
        customer_phone: raw.customer_phone,
        party_size: raw.party_size,
        notes: raw.notes,
        cancelled_at: raw.cancelled_at,
        deposit_required: raw.deposit_required,
        deposit_amount: raw.deposit_amount ? Number(raw.deposit_amount) : null,
        voucher_code: raw.voucher_code,
        voucher_discount: raw.voucher_discount ? Number(raw.voucher_discount) : null,
        slot: {
          id: slot.id,
          service_name: slot.service_name,
          slot_date: slot.slot_date,
          slot_time: slot.slot_time,
          duration_min: slot.duration_min,
          price: Number(slot.price),
          booked_count: Number(slot.booked_count ?? 0),
          shop: { id: shop.id, name: shop.name, slug: shop.slug, phone: shop.phone },
        },
      };

      setBooking(parsed);

      // Determine initial step
      if (raw.status === "cancelled") {
        setStep("already_cancelled");
      } else {
        const slotDateTime = new Date(`${slot.slot_date}T${slot.slot_time}`);
        if (slotDateTime <= new Date()) {
          setStep("past");
        }
      }

      setLoading(false);
    })();
  }, [token]);

  const cancel = async () => {
    if (!booking) return;
    setStep("cancelling");
    try {
      // Atomically update booking status and cancelled_at
      const { error: bkErr } = await (supabase as any)
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .neq("status", "cancelled"); // guard against double-cancel

      if (bkErr) throw bkErr;

      // Decrement booked_count on slot (never below 0)
      const newCount = Math.max(0, booking.slot.booked_count - 1);
      await (supabase as any)
        .from("booking_slots")
        .update({ booked_count: newCount })
        .eq("id", booking.slot.id);

      // Notify owner
      await (supabase as any)
        .from("owner_notifications")
        .insert({
          shop_id: booking.slot.shop.id,
          type: "booking_cancelled",
          title: `❌ Booking dibatalkan oleh ${booking.customer_name}`,
          body: `${booking.slot.service_name} · ${fmtDate(booking.slot.slot_date)} ${fmtTime(booking.slot.slot_time)} · WA: ${booking.customer_phone}`,
          severity: "warn",
          link: "/pos-app/booking",
          dedupe_key: `cancel_${booking.id}`,
        });

      setStep("done");
    } catch {
      setStep("confirm"); // revert so user can retry
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MarketplaceHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────
  if (notFound || !booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <MarketplaceHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Link Tidak Valid</h2>
            <p className="text-sm text-muted-foreground">
              Link pembatalan ini tidak ditemukan atau sudah tidak berlaku.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Ke Beranda</Link>
            </Button>
          </div>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  const { slot } = booking;
  const shopSlug = slot.shop.slug;

  // ── Shared detail card ───────────────────────────────────────────────
  const DetailCard = () => (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
        <CalendarCheck className="h-3.5 w-3.5" /> Detail Booking
      </p>
      <p><span className="text-muted-foreground">Toko:</span> <span className="font-medium">{slot.shop.name}</span></p>
      <p><span className="text-muted-foreground">Layanan:</span> <span className="font-medium">{slot.service_name}</span></p>
      <p><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{fmtDate(slot.slot_date)}</span></p>
      <p className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{fmtTime(slot.slot_time)}</span>
        <span className="text-muted-foreground">({slot.duration_min} menit)</span>
      </p>
      <p className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{booking.customer_name}</span>
        <span className="text-muted-foreground">· {booking.customer_phone}</span>
      </p>
      {slot.price > 0 && (
        <div className="pt-1 border-t border-border space-y-1">
          {booking.voucher_code && booking.voucher_discount ? (
            <>
              <p><span className="text-muted-foreground">Harga asal:</span> <span className="line-through text-muted-foreground">{formatIDR(slot.price)}</span></p>
              <p><span className="text-muted-foreground">Voucher:</span> <span className="font-mono text-emerald-600">{booking.voucher_code}</span> <span className="text-emerald-600">(-{formatIDR(booking.voucher_discount)})</span></p>
              <p><span className="text-muted-foreground">Harga akhir:</span> <span className="font-bold">{formatIDR(slot.price - booking.voucher_discount)}</span></p>
            </>
          ) : (
            <p><span className="text-muted-foreground">Harga:</span> <span className="font-medium">{formatIDR(slot.price)}</span></p>
          )}
          {booking.deposit_required && booking.deposit_amount && (
            <p><span className="text-muted-foreground">DP dibayar:</span> <span className="font-medium text-amber-700">{formatIDR(booking.deposit_amount)}</span></p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">

          {/* ── Already cancelled ─────────────────────────────────────── */}
          {step === "already_cancelled" && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted dark:bg-muted/40">
                  <XCircle className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Sudah Dibatalkan</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Booking ini sudah dibatalkan sebelumnya
                  {booking.cancelled_at
                    ? ` pada ${new Date(booking.cancelled_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : ""
                  }.
                </p>
              </div>
              <DetailCard />
              <Button asChild variant="outline" className="gap-2">
                <Link to="/toko/$slug" params={{ slug: shopSlug }}>
                  <ArrowLeft className="h-4 w-4" /> Ke Toko {slot.shop.name}
                </Link>
              </Button>
            </div>
          )}

          {/* ── Past slot ────────────────────────────────────────────── */}
          {step === "past" && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-10 w-10 text-amber-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Tidak Bisa Dibatalkan</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Jadwal booking ini sudah lewat. Pembatalan hanya bisa dilakukan sebelum waktu layanan.
                </p>
              </div>
              <DetailCard />
              {slot.shop.phone && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <a
                    href={`https://wa.me/${slot.shop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${slot.shop.name}, saya ingin menghubungi terkait booking ${slot.service_name} tanggal ${fmtDate(slot.slot_date)}. Nama: ${booking.customer_name}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4" /> Hubungi Toko via WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* ── View (main) ──────────────────────────────────────────── */}
          {step === "view" && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Link aman khusus booking kamu
                </p>
                <h1 className="text-2xl font-bold">Batalkan Booking</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Periksa detail booking di bawah sebelum melanjutkan.
                </p>
              </div>

              <DetailCard />

              {booking.deposit_required && booking.deposit_amount && (
                <Card className="p-4 border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Perhatian — DP Telah Dibayar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kamu sudah membayar DP sebesar <strong>{formatIDR(booking.deposit_amount)}</strong>.
                    Kebijakan refund tergantung kebijakan toko. Hubungi toko untuk konfirmasi refund.
                  </p>
                  {slot.shop.phone && (
                    <a
                      href={`https://wa.me/${slot.shop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${slot.shop.name}, saya ingin tanya soal refund DP ${formatIDR(booking.deposit_amount)} untuk booking ${slot.service_name} tanggal ${fmtDate(slot.slot_date)}. Nama: ${booking.customer_name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-700 hover:underline"
                    >
                      <Phone className="h-3 w-3" /> Tanya toko via WA
                    </a>
                  )}
                </Card>
              )}

              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1 gap-2">
                  <Link to="/toko/$slug" params={{ slug: shopSlug }}>
                    <ArrowLeft className="h-4 w-4" /> Kembali
                  </Link>
                </Button>
                <Button
                  className="flex-1 gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => setStep("confirm")}
                >
                  <XCircle className="h-4 w-4" /> Batalkan Booking
                </Button>
              </div>
            </div>
          )}

          {/* ── Confirm dialog ───────────────────────────────────────── */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div className="rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-5 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
                    <XCircle className="h-8 w-8 text-rose-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-rose-800 dark:text-rose-300">Yakin ingin membatalkan?</h2>
                <p className="text-sm text-rose-700/80 dark:text-rose-400">
                  Tindakan ini tidak bisa dibatalkan. Slot akan dilepas dan pemilik toko akan mendapat notifikasi.
                </p>
                <p className="text-sm font-semibold">
                  {slot.service_name} · {fmtDate(slot.slot_date)} · {fmtTime(slot.slot_time)}
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("view")}>
                  Tidak, Kembali
                </Button>
                <Button
                  className="flex-1 gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={cancel}
                >
                  Ya, Batalkan Sekarang
                </Button>
              </div>
            </div>
          )}

          {/* ── Cancelling (loading) ─────────────────────────────────── */}
          {step === "cancelling" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
              <p className="text-sm text-muted-foreground">Memproses pembatalan…</p>
            </div>
          )}

          {/* ── Done ────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Booking Dibatalkan</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Booking kamu sudah berhasil dibatalkan. Pemilik toko telah mendapat notifikasi.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-left space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">Toko:</span> <span className="font-medium">{slot.shop.name}</span></p>
                <p><span className="text-muted-foreground">Layanan:</span> <span className="font-medium">{slot.service_name}</span></p>
                <p><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{fmtDate(slot.slot_date)} · {fmtTime(slot.slot_time)}</span></p>
                <p><span className="text-muted-foreground">Atas nama:</span> <span className="font-medium">{booking.customer_name}</span></p>
              </div>

              {booking.deposit_required && booking.deposit_amount && (
                <Card className="p-4 border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10 text-left">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Pertanyaan soal Refund DP?
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Hubungi toko langsung untuk menanyakan pengembalian DP {formatIDR(booking.deposit_amount)}.
                  </p>
                  {slot.shop.phone && (
                    <Button asChild variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                      <a
                        href={`https://wa.me/${slot.shop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${slot.shop.name}, booking saya untuk ${slot.service_name} tanggal ${fmtDate(slot.slot_date)} sudah saya batalkan. Ingin konfirmasi refund DP ${formatIDR(booking.deposit_amount)}. Nama: ${booking.customer_name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Phone className="h-3.5 w-3.5" /> Tanya Refund via WA
                      </a>
                    </Button>
                  )}
                </Card>
              )}

              <div className="flex gap-3 justify-center flex-wrap">
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/toko/$slug" params={{ slug: shopSlug }}>
                    <ArrowLeft className="h-4 w-4" /> Ke Toko {slot.shop.name}
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/toko/$slug/booking" params={{ slug: shopSlug }}>
                    Booking Lagi
                  </Link>
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
