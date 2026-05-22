import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Star, MessageSquare, Phone, CheckCircle2, Clock, RefreshCw, Loader2, Send, Bell, TrendingUp, ArrowRight, RotateCcw, BellOff, UserX, HandHelping, Zap, Settings2, ShieldOff, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/booking-reviews")({
  head: () => ({ meta: [{ title: "Ulasan Booking — Merchant" }] }),
  component: BookingReviewsPage,
});

type CompletedBooking = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  review_request_sent_at: string | null;
  slot: {
    service_name: string;
    slot_date: string;
    slot_time: string;
  } | null;
  review: { rating: number; body: string | null; created_at: string } | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(t: string) { return t.slice(0, 5); }

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
      ))}
      <span className="ml-1 text-xs font-medium">{rating}/5</span>
    </div>
  );
}

function buildWaMessage(booking: CompletedBooking, shopName: string) {
  const service = booking.slot?.service_name ?? "layanan";
  const date = booking.slot ? `${fmtDate(booking.slot.slot_date)} pukul ${fmtTime(booking.slot.slot_time)}` : "";
  return encodeURIComponent(
    `Halo ${booking.customer_name ?? "Kak"} 👋\n\n` +
    `Terima kasih sudah booking *${service}* di *${shopName}*${date ? ` pada ${date}` : ""}!\n\n` +
    `Kami sangat senang bisa melayani kamu. Kalau berkenan, boleh bagikan pengalaman kamu dengan memberikan ulasan ya?\n\n` +
    `Ulasan kamu sangat berarti dan membantu kami terus berkembang 🙏\n\n` +
    `Terima kasih banyak!`
  );
}

const MAX_RESENDS = 3;

type ReviewRequestStat = {
  sent_at: string;
  clicked_at: string | null;
  resend_count: number;
  is_unresponsive: boolean;
};

function pct(num: number, den: number) {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

function FunnelBar({ label, value, max, color, pctVal }: { label: string; value: number; max: number; color: string; pctVal?: number }) {
  const w = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value.toLocaleString("id-ID")}{pctVal !== undefined ? <span className="ml-1 text-muted-foreground">({pctVal}%)</span> : null}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function BookingReviewsPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [bookings, setBookings] = useState<CompletedBooking[]>([]);
  const [loading, setLoading] = useState(true);
const [filter, setFilter] = useState<"all" | "reviewed" | "pending" | "unresponsive">("pending");
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const [reviewRequestsMap, setReviewRequestsMap] = useState<Record<string, ReviewRequestStat>>({});
  const [resending, setResending] = useState<string | null>(null);

  // ── Auto-Blacklist Reset state ─────────────────────────────────────────────
  const [cooldownDays, setCooldownDays] = useState<number>(30);
  const [autoResetEnabled, setAutoResetEnabled] = useState<boolean>(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState<boolean>(false);
  const [showResetSettings, setShowResetSettings] = useState<boolean>(false);
  const autoResetRanRef = useRef<boolean>(false);

  const resendNotif = useCallback(async (bookingId: string, customerPhone: string) => {
    const cur = reviewRequestsMap[bookingId];
    const curCount = cur?.resend_count ?? 0;

    // Hard-block — should never reach here via UI, but guard defensively
    if (curCount >= MAX_RESENDS || cur?.is_unresponsive) {
      toast.error("Batas pengiriman ulang tercapai. Booking ini ditandai tidak responsif.");
      return;
    }

    setResending(bookingId);
    try {
      const now = new Date().toISOString();
      const newCount = curCount + 1;
      const willMarkUnresponsive = newCount >= MAX_RESENDS;

      const [reqRes, bookRes] = await Promise.all([
        (supabase as any)
          .from("booking_review_requests")
          .upsert(
            {
              booking_id:       bookingId,
              customer_phone:   customerPhone,
              sent_at:          now,
              clicked_at:       null,
              resend_count:     newCount,
              is_unresponsive:  willMarkUnresponsive,
            },
            { onConflict: "booking_id" }
          ),
        (supabase as any)
          .from("bookings")
          .update({ review_request_sent_at: now })
          .eq("id", bookingId),
      ]);
      if (reqRes.error) throw reqRes.error;
      if (bookRes.error) throw bookRes.error;

      setReviewRequestsMap(prev => ({
        ...prev,
        [bookingId]: { sent_at: now, clicked_at: null, resend_count: newCount, is_unresponsive: willMarkUnresponsive },
      }));
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, review_request_sent_at: now } : b
      ));

      if (willMarkUnresponsive) {
        toast.warning(
          `Notifikasi ke-${newCount} terkirim — batas tercapai. Booking ini otomatis ditandai tidak responsif dan tidak akan dikirim ulang lagi.`,
          { duration: 8000 }
        );
      } else {
        toast.success(
          `Notifikasi ulang terkirim (${newCount}/${MAX_RESENDS}). Pembeli akan melihatnya saat membuka riwayat booking.`
        );
      }
    } catch (e: any) {
      toast.error("Gagal kirim ulang: " + e.message);
    } finally {
      setResending(null);
    }
  }, [reviewRequestsMap]);

  // ── Reset single booking's unresponsive status ─────────────────────────────
  const resetBooking = useCallback(async (bookingId: string) => {
    setResettingId(bookingId);
    try {
      const { error } = await (supabase as any)
        .from("booking_review_requests")
        .update({ is_unresponsive: false, resend_count: 0, clicked_at: null })
        .eq("booking_id", bookingId);
      if (error) throw error;
      setReviewRequestsMap(prev => ({
        ...prev,
        [bookingId]: { ...prev[bookingId], is_unresponsive: false, resend_count: 0, clicked_at: null },
      }));
      toast.success("Status direset. Sistem dapat mengirim notif ulang ke pembeli ini jika booking baru masuk.");
    } catch (e: any) {
      toast.error("Gagal reset: " + e.message);
    } finally {
      setResettingId(null);
    }
  }, []);

  // ── Bulk-reset all unresponsive bookings past cooldown ────────────────────
  const bulkResetEligible = useCallback(async (days: number, bks: CompletedBooking[], reqMap: Record<string, ReviewRequestStat>) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const eligible = bks.filter(b => {
      const req = reqMap[b.id];
      return req?.is_unresponsive && !b.review && req.sent_at < cutoff;
    });
    if (eligible.length === 0) {
      toast.info(`Tidak ada booking tidak responsif yang sudah melewati jeda ${days} hari.`);
      return;
    }
    setResettingAll(true);
    try {
      const ids = eligible.map(b => b.id);
      const { error } = await (supabase as any)
        .from("booking_review_requests")
        .update({ is_unresponsive: false, resend_count: 0, clicked_at: null })
        .in("booking_id", ids);
      if (error) throw error;
      setReviewRequestsMap(prev => {
        const next = { ...prev };
        for (const id of ids) {
          next[id] = { ...next[id], is_unresponsive: false, resend_count: 0, clicked_at: null };
        }
        return next;
      });
      toast.success(`${eligible.length} booking direset. Sistem bisa mengirim notif baru ke pembeli ini.`);
    } catch (e: any) {
      toast.error("Gagal bulk reset: " + e.message);
    } finally {
      setResettingAll(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    autoResetRanRef.current = false;
    setLoading(true);
    try {
      const { data: completedBookings, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id, customer_name, customer_phone, created_at, review_request_sent_at,
          slot:booking_slots(service_name, slot_date, slot_time)
        `)
        .eq("booking_slots.shop_id", shop.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const ids = (completedBookings ?? []).map((b: any) => b.id);
      let reviewsMap: Record<string, { rating: number; body: string | null; created_at: string }> = {};
      let reqMap: Record<string, ReviewRequestStat> = {};

      if (ids.length > 0) {
        const [reviewRes, reqRes] = await Promise.all([
          (supabase as any)
            .from("booking_reviews")
            .select("booking_id, rating, body, created_at")
            .in("booking_id", ids),
          (supabase as any)
            .from("booking_review_requests")
            .select("booking_id, sent_at, clicked_at, resend_count, is_unresponsive")
            .in("booking_id", ids),
        ]);

        if (reviewRes.error) {
          if (reviewRes.error.code === "42P01") { setTableExists(false); }
          else throw reviewRes.error;
        } else {
for (const r of (reviewRes.data ?? []) as any[]) {
            reviewsMap[r.booking_id] = { rating: r.rating, body: r.body, created_at: r.created_at };
          }
        }

        if (!reqRes.error) {
          for (const r of (reqRes.data ?? []) as any[]) {
            reqMap[r.booking_id] = {
              sent_at:         r.sent_at,
              clicked_at:      r.clicked_at,
              resend_count:    r.resend_count ?? 0,
              is_unresponsive: r.is_unresponsive ?? false,
            };
          }
        }
      }

      setReviewRequestsMap(reqMap);
      const mapped: CompletedBooking[] = (completedBookings ?? []).map((b: any) => ({
        ...b,
        review: reviewsMap[b.id] ?? null,
      }));
      setBookings(mapped);
    } catch (e: any) {
      toast.error("Gagal memuat: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { if (shop?.id) load(); }, [shop?.id, load]);

  // ── Auto-reset effect: runs once per load when enabled ────────────────────
  useEffect(() => {
    if (!autoResetEnabled || loading || bookings.length === 0) return;
    if (autoResetRanRef.current) return;
    autoResetRanRef.current = true;
    const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
    const eligible = bookings.filter(b => {
      const req = reviewRequestsMap[b.id];
      return req?.is_unresponsive && !b.review && req.sent_at < cutoff;
    });
    if (eligible.length === 0) return;
    (async () => {
      const ids = eligible.map(b => b.id);
      const { error } = await (supabase as any)
        .from("booking_review_requests")
        .update({ is_unresponsive: false, resend_count: 0, clicked_at: null })
        .in("booking_id", ids);
      if (error) return;
      setReviewRequestsMap(prev => {
        const next = { ...prev };
        for (const id of ids) next[id] = { ...next[id], is_unresponsive: false, resend_count: 0, clicked_at: null };
        return next;
      });
      toast.success(`Auto-reset: ${eligible.length} pembeli tidak responsif direset setelah jeda ${cooldownDays} hari.`, { duration: 6000 });
    })();
  }, [autoResetEnabled, loading, bookings, reviewRequestsMap, cooldownDays]);

  if (shopLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const reviewed           = bookings.filter(b => b.review);
  const pendingReview      = bookings.filter(b => !b.review);
  const unresponsiveBookings = bookings.filter(b => reviewRequestsMap[b.id]?.is_unresponsive === true && !b.review);
  const avgRating = reviewed.length > 0
    ? (reviewed.reduce((s, b) => s + (b.review!.rating), 0) / reviewed.length).toFixed(1)
    : null;

  const shown =
    filter === "all"          ? bookings :
    filter === "reviewed"     ? reviewed :
    filter === "unresponsive" ? unresponsiveBookings :
    pendingReview;

  // ── Analytics derivations ────────────────────────────────────────────────
  const totalCompleted  = bookings.length;
  const totalSent       = bookings.filter(b => b.review_request_sent_at).length;
  const totalClicked    = bookings.filter(b => reviewRequestsMap[b.id]?.clicked_at).length;
  const totalConverted  = bookings.filter(b => b.review_request_sent_at && b.review).length;

  // Monthly breakdown — last 6 months that have data
  type MonthStat = { sent: number; clicked: number; converted: number };
  const monthStats: Record<string, MonthStat> = {};
  for (const b of bookings) {
    if (!b.review_request_sent_at) continue;
    const key = monthKey(b.review_request_sent_at);
    if (!monthStats[key]) monthStats[key] = { sent: 0, clicked: 0, converted: 0 };
    monthStats[key].sent++;
    if (reviewRequestsMap[b.id]?.clicked_at) monthStats[key].clicked++;
    if (b.review) monthStats[key].converted++;
  }
  const monthKeys = Object.keys(monthStats).sort().slice(-6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400" />
            Ulasan Booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor ulasan pelanggan · kirim pengingat WhatsApp untuk booking yang belum diberi ulasan.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Selesai</p>
          <p className="text-2xl font-bold mt-0.5">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Sudah Diulas</p>
          <p className="text-2xl font-bold mt-0.5 text-green-600">{reviewed.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Rating Rata-rata</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-2xl font-bold">{avgRating ?? "—"}</p>
            {avgRating && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
          </div>
        </div>
        <button
          onClick={() => setFilter("unresponsive")}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            unresponsiveBookings.length > 0
              ? "border-red-200 bg-red-50 hover:bg-red-100"
              : "border-border bg-card"
          }`}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <BellOff className="h-3 w-3" /> Tidak Responsif
          </p>
          <p className={`text-2xl font-bold mt-0.5 ${unresponsiveBookings.length > 0 ? "text-red-600" : ""}`}>
            {unresponsiveBookings.length}
          </p>
          {unresponsiveBookings.length > 0 && (
            <p className="text-[10px] text-red-500 mt-0.5">perlu pendekatan manual</p>
          )}
        </button>
      </div>

      {/* ── Analitik Konversi H+1 ───────────────────────────────────────── */}
      {totalSent > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Analitik Konversi Notifikasi H+1</h2>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Notif Terkirim", value: totalSent, color: "text-blue-600", sub: `dari ${totalCompleted} selesai` },
              { label: "Notif Dibuka", value: totalClicked, color: "text-violet-600", sub: `${pct(totalClicked, totalSent)}% dari terkirim` },
              { label: "Ulasan Ditulis", value: totalConverted, color: "text-green-600", sub: `${pct(totalConverted, totalSent)}% dari terkirim` },
              { label: "Konversi Akhir", value: `${pct(totalConverted, totalSent)}%`, color: pct(totalConverted, totalSent) >= 30 ? "text-green-600" : "text-amber-600", sub: "notif → ulasan" },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Conversion funnel bars */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Funnel Konversi</p>
            <div className="space-y-2.5">
              <FunnelBar label="Booking selesai" value={totalCompleted} max={totalCompleted} color="bg-slate-400" />
              <div className="flex items-center gap-2 pl-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <FunnelBar label="Notif H+1 terkirim" value={totalSent} max={totalCompleted} color="bg-blue-500" pctVal={pct(totalSent, totalCompleted)} />
                </div>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <FunnelBar label="Notif dibuka (klik Beri Ulasan)" value={totalClicked} max={totalCompleted} color="bg-violet-500" pctVal={pct(totalClicked, totalSent)} />
                </div>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <FunnelBar label="Ulasan berhasil ditulis" value={totalConverted} max={totalCompleted} color="bg-green-500" pctVal={pct(totalConverted, totalSent)} />
                </div>
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          {monthKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Breakdown Bulanan</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 text-left font-medium text-muted-foreground">Bulan</th>
                      <th className="py-1.5 text-right font-medium text-muted-foreground">Terkirim</th>
                      <th className="py-1.5 text-right font-medium text-muted-foreground">Dibuka</th>
                      <th className="py-1.5 text-right font-medium text-muted-foreground">Diulas</th>
                      <th className="py-1.5 text-right font-medium text-muted-foreground">Konversi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthKeys.map(key => {
                      const s = monthStats[key];
                      const conv = pct(s.converted, s.sent);
                      return (
                        <tr key={key} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 font-medium">{monthLabel(key)}</td>
                          <td className="py-1.5 text-right tabular-nums text-blue-600">{s.sent}</td>
                          <td className="py-1.5 text-right tabular-nums text-violet-600">{s.clicked}</td>
                          <td className="py-1.5 text-right tabular-nums text-green-600">{s.converted}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            <span className={`font-semibold ${conv >= 30 ? "text-green-600" : conv >= 15 ? "text-amber-600" : "text-red-500"}`}>
                              {conv}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit flex-wrap">
        {([
          { key: "pending",       label: "Belum Diulas",    count: pendingReview.length,        warn: false },
          { key: "reviewed",      label: "Sudah Diulas",    count: reviewed.length,             warn: false },
          { key: "unresponsive",  label: "Tidak Responsif", count: unresponsiveBookings.length, warn: unresponsiveBookings.length > 0 },
          { key: "all",           label: "Semua",           count: bookings.length,             warn: false },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
              filter === tab.key ? "bg-background shadow-sm" : "hover:bg-background/60"
            }`}
          >
            {tab.warn && tab.count > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            )}
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              tab.warn && tab.count > 0
                ? "bg-red-100 text-red-700"
                : "bg-muted text-muted-foreground"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Unresponsive context banner + Auto-Blacklist Reset settings */}
      {filter === "unresponsive" && (() => {
        const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
        const eligibleCount = unresponsiveBookings.filter(b => {
          const req = reviewRequestsMap[b.id];
          return req?.sent_at && req.sent_at < cutoff;
        }).length;
        return (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-red-800">Segmen Pembeli Tidak Responsif</p>
                  <button
                    onClick={() => setShowResetSettings(v => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-white transition-colors"
                  >
                    <Settings2 className="h-3 w-3" />
                    Auto-Reset
                  </button>
                </div>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  Booking ini sudah menerima {MAX_RESENDS}x notifikasi otomatis namun pembeli tidak memberikan ulasan.
                  Sistem telah berhenti mengirim notif — gunakan pendekatan manual atau reset blacklist.
                </p>
              </div>
            </div>

            {/* Insight chips */}
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              {[
                { icon: BellOff,     color: "text-red-600",    title: "Blacklist Notif Otomatis",    desc: "Tidak ada notifikasi lagi dari sistem." },
                { icon: HandHelping, color: "text-orange-600", title: "Pendekatan Manual via WA",     desc: "Hubungi langsung dengan pesan personal." },
                { icon: TrendingUp,  color: "text-blue-600",   title: "Pantau Rasio Tidak Responsif", desc: "Gunakan angka ini untuk evaluasi layanan." },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex items-start gap-2 rounded-lg bg-white/60 border border-red-100 p-2.5">
                  <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-semibold text-red-800">{title}</p>
                    <p className="text-red-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Auto-Blacklist Reset settings panel ── */}
            {showResetSettings && (
              <div className="rounded-lg border border-red-200 bg-white/70 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-slate-700">Auto-Blacklist Reset</p>
                </div>

                {/* Cooldown selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs text-slate-600">Jeda reset:</span>
                  </div>
                  <div className="flex gap-1">
                    {[15, 30, 60, 90].map(d => (
                      <button
                        key={d}
                        onClick={() => setCooldownDays(d)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          cooldownDays === d
                            ? "bg-red-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {d}h
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {eligibleCount > 0
                      ? <span className="text-amber-600 font-medium">{eligibleCount} booking eligible untuk reset sekarang</span>
                      : "Belum ada yang melewati jeda ini"}
                  </span>
                </div>

                {/* Auto-reset toggle */}
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-3.5 w-3.5 ${autoResetEnabled ? "text-amber-500" : "text-slate-400"}`} />
                    <div>
                      <p className="text-xs font-medium text-slate-700">Reset Otomatis saat Halaman Dimuat</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Blacklist direset otomatis setelah jeda {cooldownDays} hari saat kamu membuka halaman ini.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAutoResetEnabled(v => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      autoResetEnabled ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      autoResetEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {/* Bulk reset action */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs border-red-300 text-red-700 hover:bg-red-50"
                    disabled={resettingAll || eligibleCount === 0}
                    onClick={() => bulkResetEligible(cooldownDays, bookings, reviewRequestsMap)}
                  >
                    {resettingAll
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ShieldOff className="h-3.5 w-3.5" />
                    }
                    Reset {eligibleCount > 0 ? `${eligibleCount} Booking Eligible` : "Semua Eligible"}
                  </Button>
                  <p className="text-[10px] text-slate-500">
                    Hanya booking yang blacklistnya sudah lebih dari {cooldownDays} hari yang akan direset.
                  </p>
                </div>
              </div>
            )}

            {unresponsiveBookings.length > 0 && (
              <p className="text-[11px] text-red-500">
                {unresponsiveBookings.length} pembeli · {pct(unresponsiveBookings.length, bookings.length)}% dari total booking selesai
                {totalSent > 0 && ` · rasio notif gagal konversi: ${pct(unresponsiveBookings.length, totalSent)}%`}
                {eligibleCount > 0 && ` · ${eligibleCount} sudah melewati jeda ${cooldownDays} hari`}
              </p>
            )}
          </div>
        );
      })()}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {filter === "pending"       ? "Semua booking yang selesai sudah diulas! 🎉" :
             filter === "unresponsive"  ? "Belum ada pembeli yang ditandai tidak responsif." :
             "Belum ada data."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(b => {
            const hasReview = !!b.review;
            const waMsg = shop ? buildWaMessage(b, shop.name) : "";
            const waPhone = (b.customer_phone ?? "").replace(/\D/g, "").replace(/^0/, "62");
            const waUrl = `https://wa.me/${waPhone}?text=${waMsg}`;
            const reminderSent = sentReminders.has(b.id);

            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hasReview ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {hasReview ? <Star className="h-4 w-4 fill-green-500 text-green-600" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 justify-between flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{b.customer_name ?? "(Nama tidak ada)"}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.slot?.service_name} · {b.slot ? `${fmtDate(b.slot.slot_date)} ${fmtTime(b.slot.slot_time)}` : "—"}
                        </p>
                        {b.customer_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {b.customer_phone}
                          </p>
                        )}
                      </div>
                      <Badge variant={hasReview ? "default" : "secondary"} className="text-[10px]">
                        {hasReview ? "Sudah Diulas" : "Belum Diulas"}
                      </Badge>
                    </div>

                    {hasReview && b.review && (
                      <div className="mt-2 rounded-lg bg-muted/40 p-2.5 border border-border">
                        <StarDisplay rating={b.review.rating} />
                        {b.review.body && (
                          <p className="mt-1.5 text-sm text-foreground/70 italic">"{b.review.body}"</p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">{fmtDate(b.review.created_at)}</p>
                      </div>
                    )}

                    {/* Auto-notif status badge + kirim ulang */}
                    {b.review_request_sent_at && (() => {
                      const req = reviewRequestsMap[b.id];
                      const resendCount = req?.resend_count ?? 0;
                      const isUnresponsive = req?.is_unresponsive ?? false;
                      const wasClicked = !!req?.clicked_at;
                      const canResend = !hasReview && !wasClicked && !isUnresponsive && !!b.customer_phone;
                      return (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            isUnresponsive
                              ? "bg-red-50 border-red-200 text-red-700"
                              : wasClicked
                                ? "bg-violet-50 border-violet-200 text-violet-700"
                                : "bg-blue-50 border-blue-200 text-blue-700"
                          }`}>
                            <Bell className="h-3 w-3" />
                            {isUnresponsive
                              ? "Tidak Responsif"
                              : wasClicked
                                ? `Dibuka ${new Date(req!.clicked_at!).toLocaleDateString("id-ID")}`
                                : `Auto-notif terkirim ${new Date(b.review_request_sent_at).toLocaleDateString("id-ID")}`
                            }
                          </span>

                          {/* Resend counter pill */}
                          {resendCount > 0 && (
                            <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full border ${
                              isUnresponsive
                                ? "bg-red-50 border-red-200 text-red-600"
                                : "bg-muted border-border text-muted-foreground"
                            }`}>
                              Ulang {resendCount}/{MAX_RESENDS}
                            </span>
                          )}

                          {/* Kirim ulang button */}
                          {canResend && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 gap-1 px-2 text-[10px] border-orange-300 text-orange-700 hover:bg-orange-50"
                              disabled={resending === b.id}
                              onClick={() => resendNotif(b.id, b.customer_phone!)}
                            >
                              {resending === b.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <RotateCcw className="h-3 w-3" />
                              }
                              Kirim Ulang {resendCount > 0 ? `(${resendCount + 1}/${MAX_RESENDS})` : "Notif"}
                            </Button>
                          )}

                          {/* Tombstone + Reset button when unresponsive */}
                          {isUnresponsive && (
                            <>
                              <span className="text-[10px] text-red-600 italic">
                                Sistem berhenti mengirim notif ke pembeli ini.
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 gap-1 px-2 text-[10px] border-slate-300 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                disabled={resettingId === b.id}
                                onClick={() => resetBooking(b.id)}
                              >
                                {resettingId === b.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <ShieldOff className="h-3 w-3" />
                                }
                                Reset Blacklist
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {!hasReview && b.customer_phone && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setSentReminders(s => new Set([...s, b.id]))}
                        >
                          <Button size="sm" variant="outline" className="gap-1.5 h-8 border-green-300 text-green-700 hover:bg-green-50">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Minta Ulasan via WA
                          </Button>
                        </a>
                        {reminderSent && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Send className="h-3 w-3" /> Pengingat terkirim
                          </span>
                        )}
                      </div>
                    )}
                    {!hasReview && !b.customer_phone && (
                      <p className="mt-2 text-xs text-muted-foreground italic">Nomor HP tidak tersedia — tidak dapat kirim pengingat.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
