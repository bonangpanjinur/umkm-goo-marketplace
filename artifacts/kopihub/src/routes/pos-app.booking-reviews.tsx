import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import {
  Star, MessageSquare, Phone, CheckCircle2, Clock, RefreshCw, Loader2, Send, Bell,
  TrendingUp, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/booking-reviews")({
  head: () => ({ meta: [{ title: "Ulasan Booking — Merchant" }] }),
  component: BookingReviewsPage,
});

/*
-- Jalankan di Supabase SQL Editor (jika belum ada dari akun/bookings):
create table if not exists public.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_phone text not null,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique(booking_id)
);
alter table public.booking_reviews enable row level security;
create policy "customer_insert_review" on public.booking_reviews
  for insert with check (true);
create policy "public_read_review" on public.booking_reviews
  for select using (true);
*/

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

type ReviewRequestStat = { sent_at: string; clicked_at: string | null };

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
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "reviewed" | "pending">("pending");
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const [reviewRequestsMap, setReviewRequestsMap] = useState<Record<string, ReviewRequestStat>>({});

  const load = useCallback(async () => {
    if (!shop?.id) return;
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
            .select("booking_id, sent_at, clicked_at")
            .in("booking_id", ids),
        ]);

        if (reviewRes.error) {
          if (reviewRes.error.code === "42P01") { setTableExists(false); }
          else throw reviewRes.error;
        } else {
          setTableExists(true);
          for (const r of (reviewRes.data ?? []) as any[]) {
            reviewsMap[r.booking_id] = { rating: r.rating, body: r.body, created_at: r.created_at };
          }
        }

        if (!reqRes.error) {
          for (const r of (reqRes.data ?? []) as any[]) {
            reqMap[r.booking_id] = { sent_at: r.sent_at, clicked_at: r.clicked_at };
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

  if (shopLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const reviewed = bookings.filter(b => b.review);
  const pendingReview = bookings.filter(b => !b.review);
  const avgRating = reviewed.length > 0
    ? (reviewed.reduce((s, b) => s + (b.review!.rating), 0) / reviewed.length).toFixed(1)
    : null;

  const shown = filter === "all" ? bookings : filter === "reviewed" ? reviewed : pendingReview;

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

      {tableExists === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
          <p className="font-medium">Tabel ulasan belum dibuat</p>
          <p>Jalankan SQL DDL di komentar file <code>pos-app.booking-reviews.tsx</code> di Supabase SQL Editor untuk mengaktifkan fitur ulasan booking.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
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
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {([
          { key: "pending",  label: `Belum Diulas (${pendingReview.length})` },
          { key: "reviewed", label: `Sudah Diulas (${reviewed.length})` },
          { key: "all",      label: `Semua (${bookings.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filter === tab.key ? "bg-background shadow-sm" : "hover:bg-background/60"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {filter === "pending" ? "Semua booking yang selesai sudah diulas!" : "Belum ada data."}
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

                    {/* Auto-notif status badge */}
                    {b.review_request_sent_at && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          <Bell className="h-3 w-3" />
                          Auto-notif terkirim {new Date(b.review_request_sent_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    )}

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
