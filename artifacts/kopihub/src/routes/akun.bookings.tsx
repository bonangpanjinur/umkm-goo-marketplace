import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle, Phone, ChevronDown, ChevronUp, CalendarDays, Star, Loader2, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/bookings")({
  head: () => ({ meta: [{ title: "Riwayat Booking — Akun" }] }),
  component: BookingsPage,
});

type Booking = {
  id: string;
  status: string;
  party_size: number;
  notes: string | null;
  created_at: string;
  slot: {
    service_name: string;
    slot_date: string;
    slot_time: string;
    price: number | null;
    shop: { name: string; slug: string } | null;
  } | null;
};

type BookingReview = {
  booking_id: string;
  rating: number;
  body: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending:   "Menunggu",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
  no_show:   "Tidak Hadir",
};

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  no_show:   "bg-gray-100 text-gray-700",
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending:   Clock,
  confirmed: CalendarCheck,
  cancelled: XCircle,
  completed: CheckCircle2,
  no_show:   AlertCircle,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function fmtTime(t: string) {
  return t.slice(0, 5);
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className="p-0.5 transition-transform hover:scale-110"
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange?.(n)}
        >
          <Star
            className={`h-6 w-6 ${(hovered || value) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(false);
  const [phone, setPhone]       = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ id: string; service_name: string; slot_date: string; slot_time: string; price: number | null; capacity: number; booked: number }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [rescheduling, setRescheduling] = useState(false);

  const [reviews, setReviews] = useState<Record<string, BookingReview>>({});
  const [reviewForm, setReviewForm] = useState<{ bookingId: string; rating: number; body: string } | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewTableExists, setReviewTableExists] = useState<boolean | null>(null);
  const [reviewRequests, setReviewRequests] = useState<Record<string, { sent_at: string; clicked_at: string | null }>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("customer_profiles" as any)
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }: any) => {
        // 42P01 = table not yet created, just show manual phone input
        if (error?.code === "42P01") return;
        if (data?.phone) {
          setPhone(data.phone);
          loadBookings(data.phone);
        }
      });
  }, [user]);

  const loadReviews = useCallback(async (bookingIds: string[]) => {
    if (bookingIds.length === 0) return;
    const { data, error } = await (supabase as any)
      .from("booking_reviews")
      .select("booking_id, rating, body, created_at")
      .in("booking_id", bookingIds);
    if (error) {
      if (error.code === "42P01") { setReviewTableExists(false); }
      return;
    }
    setReviewTableExists(true);
    const map: Record<string, BookingReview> = {};
    for (const r of (data ?? []) as BookingReview[]) map[r.booking_id] = r;
    setReviews(map);
  }, []);

  const loadReviewRequests = useCallback(async (bookingIds: string[]) => {
    if (bookingIds.length === 0) return;
    const { data, error } = await (supabase as any)
      .from("booking_review_requests")
      .select("booking_id, sent_at, clicked_at")
      .in("booking_id", bookingIds);
    if (error) return;
    const map: Record<string, { sent_at: string; clicked_at: string | null }> = {};
    for (const r of (data ?? []) as any[]) map[r.booking_id] = { sent_at: r.sent_at, clicked_at: r.clicked_at };
    setReviewRequests(map);
  }, []);

  const markReviewRequestClicked = useCallback(async (bookingId: string) => {
    await (supabase as any)
      .from("booking_review_requests")
      .update({ clicked_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .is("clicked_at", null);
    setReviewRequests(prev => {
      if (!prev[bookingId]) return prev;
      return { ...prev, [bookingId]: { ...prev[bookingId], clicked_at: new Date().toISOString() } };
    });
  }, []);

  async function loadBookings(ph: string) {
    if (!ph.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings" as any)
        .select(`
          id, status, party_size, notes, created_at,
          slot:booking_slots(
            service_name, slot_date, slot_time, price,
            shop:shops(name, slug)
          )
        `)
        .eq("customer_phone", ph.trim())
        .order("created_at", { ascending: false })
        .limit(50) as any;
      if (error?.code === "42P01") {
        // Booking table not yet created
        setBookings([]);
        return;
      }
      if (error) throw error;
      const bList = (data ?? []) as Booking[];
      setBookings(bList);
      const completedIds = bList.filter(b => b.status === "completed").map(b => b.id);
      await Promise.all([loadReviews(completedIds), loadReviewRequests(completedIds)]);
    } catch (e: any) {
      toast.error("Gagal memuat booking: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openReschedule(b: Booking) {
    setRescheduleBooking(b);
    setSelectedSlot("");
    const shopId = (b.slot as any)?.shop_id;
    if (!shopId && !b.slot?.shop?.slug) { toast.error("Tidak dapat memuat slot toko ini"); return; }
    const today = new Date().toISOString().slice(0, 10);
    let query = (supabase as any)
      .from("booking_slots")
      .select("id, service_name, slot_date, slot_time, price, capacity")
      .gte("slot_date", today)
      .eq("is_active", true)
      .order("slot_date")
      .order("slot_time")
      .limit(30);
    if (shopId) query = query.eq("shop_id", shopId);
    const { data } = await query;
    const slots = ((data ?? []) as any[]).map(s => ({ ...s, booked: 0 }));
    setAvailableSlots(slots);
  }

  async function confirmReschedule() {
    if (!selectedSlot || !rescheduleBooking) return;
    setRescheduling(true);
    const { error } = await (supabase as any)
      .from("bookings")
      .update({ slot_id: selectedSlot, status: "pending" })
      .eq("id", rescheduleBooking.id);
    if (error) { toast.error(error.message); } else {
      toast.success("Booking berhasil dijadwalkan ulang");
      setRescheduleBooking(null);
      loadBookings(phone);
    }
    setRescheduling(false);
  }

  async function cancelBooking(id: string) {
    setCancelling(id);
    try {
      const { error } = await supabase
        .from("bookings" as any)
        .update({ status: "cancelled" })
        .eq("id", id) as any;
      if (error) throw error;
      toast.success("Booking berhasil dibatalkan");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(null);
    }
  }

  async function submitReview() {
    if (!reviewForm || reviewForm.rating === 0) { toast.error("Pilih rating terlebih dahulu"); return; }
    setSubmittingReview(true);
    try {
      const { error } = await (supabase as any).from("booking_reviews").upsert({
        booking_id: reviewForm.bookingId,
        customer_phone: phone,
        rating: reviewForm.rating,
        body: reviewForm.body.trim() || null,
      }, { onConflict: "booking_id" });
      if (error) throw error;
      toast.success("Ulasan berhasil dikirim! Terima kasih.");
      setReviews(prev => ({
        ...prev,
        [reviewForm.bookingId]: { booking_id: reviewForm.bookingId, rating: reviewForm.rating, body: reviewForm.body.trim() || null, created_at: new Date().toISOString() },
      }));
      setReviewForm(null);
    } catch (e: any) {
      toast.error("Gagal menyimpan ulasan: " + e.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  const upcoming = bookings.filter(b => ["pending","confirmed"].includes(b.status));
  const past     = bookings.filter(b => !["pending","confirmed"].includes(b.status));

  // Booking selesai yang ada review request tapi belum diulas
  const pendingReviewRequestCount = past.filter(
    b => b.status === "completed" && reviewRequests[b.id] && !reviews[b.id]
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Riwayat Booking</h2>
        <p className="mt-1 text-sm text-muted-foreground">Semua jadwal layanan yang telah kamu pesan.</p>
      </div>

      {/* Banner H+1 review request */}
      {pendingReviewRequestCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 fill-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Kamu punya {pendingReviewRequestCount} ulasan yang menunggu!
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Ceritakan pengalamanmu — ulasanmu membantu orang lain memilih toko yang tepat.
            </p>
          </div>
        </div>
      )}

      {!phone && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary" />
            Masukkan nomor HP untuk mencari booking kamu
          </div>
          <div className="flex gap-2">
            <Input
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              placeholder="Contoh: 08123456789"
              className="max-w-xs"
              onKeyDown={e => e.key === "Enter" && (setPhone(phoneInput), loadBookings(phoneInput))}
            />
            <Button onClick={() => { setPhone(phoneInput); loadBookings(phoneInput); }}>
              Cari
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat booking…
        </div>
      )}

      {!loading && phone && bookings.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada riwayat booking untuk nomor ini.</p>
        </div>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleBooking} onOpenChange={open => !open && setRescheduleBooking(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Jadwalkan Ulang Booking</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Pilih jadwal baru untuk booking <strong>{rescheduleBooking?.slot?.service_name}</strong>.</p>
            {availableSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Tidak ada slot tersedia untuk toko ini.
              </div>
            ) : (
              <div className="space-y-2">
                {availableSlots.map(s => (
                  <button key={s.id} onClick={() => setSelectedSlot(s.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${selectedSlot === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <p className="font-medium">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.slot_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {s.slot_time.slice(0,5)}
                      {s.price != null && ` · Rp ${Number(s.price).toLocaleString("id-ID")}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleBooking(null)}>Batal</Button>
            <Button onClick={confirmReschedule} disabled={!selectedSlot || rescheduling} className="gap-2">
              {rescheduling && <Loader2 className="h-3 w-3 animate-spin" />}
              Konfirmasi Jadwal Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewForm} onOpenChange={open => !open && setReviewForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> Tulis Ulasan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-2 block">Rating kamu</Label>
              <StarRating
                value={reviewForm?.rating ?? 0}
                onChange={v => setReviewForm(f => f ? { ...f, rating: v } : null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {reviewForm?.rating === 1 && "Sangat Buruk"}
                {reviewForm?.rating === 2 && "Kurang"}
                {reviewForm?.rating === 3 && "Cukup"}
                {reviewForm?.rating === 4 && "Bagus"}
                {reviewForm?.rating === 5 && "Sangat Bagus!"}
              </p>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Ceritakan pengalamanmu <span className="text-muted-foreground">(opsional)</span></Label>
              <Textarea
                placeholder="Layanannya memuaskan, staff ramah…"
                rows={3}
                value={reviewForm?.body ?? ""}
                onChange={e => setReviewForm(f => f ? { ...f, body: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewForm(null)}>Batal</Button>
            <Button onClick={submitReview} disabled={submittingReview || !reviewForm?.rating} className="gap-2">
              {submittingReview && <Loader2 className="h-3 w-3 animate-spin" />}
              Kirim Ulasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mendatang</h3>
          <div className="space-y-3">
            {upcoming.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                expanded={expanded === b.id}
                onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                onCancel={cancelBooking}
                cancelling={cancelling === b.id}
                onReschedule={openReschedule}
              />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riwayat</h3>
          <div className="space-y-3">
            {past.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                expanded={expanded === b.id}
                onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                onCancel={cancelBooking}
                cancelling={cancelling === b.id}
                review={reviews[b.id]}
                reviewTableExists={reviewTableExists}
                hasPendingRequest={!reviews[b.id] && !!reviewRequests[b.id]}
                onReview={b.status === "completed" ? () => {
                  setReviewForm({ bookingId: b.id, rating: reviews[b.id]?.rating ?? 0, body: reviews[b.id]?.body ?? "" });
                  markReviewRequestClicked(b.id);
                } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ICS calendar export ───────────────────────────────────────────────────────

function downloadICS(b: Booking) {
  if (!b.slot) return;
  const dateStr = b.slot.slot_date.replace(/-/g, "");
  const [h, m] = b.slot.slot_time.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${dateStr}T${pad(h)}${pad(m)}00`;
  const dtEnd   = `${dateStr}T${pad(h + 1)}${pad(m)}00`;
  const shopName = b.slot.shop?.name ?? "";
  const summary  = `${b.slot.service_name}${shopName ? ` — ${shopName}` : ""}`;
  const uid      = `${b.id}@umkmgo`;
  const now      = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UMKMgo//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Asia/Jakarta:${dtStart}`,
    `DTEND;TZID=Asia/Jakarta:${dtEnd}`,
    `SUMMARY:${summary}`,
    ...(shopName ? [`LOCATION:${shopName}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `booking-${b.slot.service_name.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function BookingCard({
  booking: b,
  expanded,
  onToggle,
  onCancel,
  cancelling,
  onReschedule,
  review,
  reviewTableExists,
  onReview,
}: {
  booking: Booking;
  expanded: boolean;
  onToggle: () => void;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onReschedule?: (b: Booking) => void;
  review?: BookingReview;
  reviewTableExists?: boolean | null;
  hasPendingRequest?: boolean;
  onReview?: () => void;
}) {
  const Icon = STATUS_ICON[b.status] ?? CalendarCheck;
  const canCancel = ["pending","confirmed"].includes(b.status);
  const canReview = b.status === "completed" && reviewTableExists !== false;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${hasPendingRequest ? "border-amber-300 ring-1 ring-amber-200" : "border-border"}`}>
      <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors" onClick={onToggle}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{b.slot?.service_name ?? "Layanan"}</span>
            <Badge className={`text-[10px] px-2 py-0 ${STATUS_COLOR[b.status] ?? "bg-muted text-muted-foreground"}`}>
              {STATUS_LABEL[b.status] ?? b.status}
            </Badge>
            {review && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {review.rating}/5
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {b.slot ? `${fmtDate(b.slot.slot_date)}, pukul ${fmtTime(b.slot.slot_time)}` : "—"}
          </p>
          {b.slot?.shop?.name && (
            <p className="text-xs text-muted-foreground">{b.slot.shop.name}</p>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Jumlah Tamu</Label>
              <p className="font-medium">{b.party_size} orang</p>
            </div>
            {b.slot?.price != null && (
              <div>
                <Label className="text-xs text-muted-foreground">Harga</Label>
                <p className="font-medium">Rp {Number(b.slot.price).toLocaleString("id-ID")}</p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Tanggal Pesan</Label>
              <p className="font-medium">{new Date(b.created_at).toLocaleDateString("id-ID")}</p>
            </div>
          </div>
          {b.notes && (
            <div>
              <Label className="text-xs text-muted-foreground">Catatan</Label>
              <p className="text-sm">{b.notes}</p>
            </div>
          )}

          {/* Review section for completed bookings */}
          {canReview && (
            <div className={`rounded-xl border p-3 ${hasPendingRequest ? "bg-amber-50 border-amber-200" : "bg-muted/40 border-border"}`}>
              {review ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Ulasan kamu</p>
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`h-4 w-4 ${n <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{review.rating}/5</span>
                  </div>
                  {review.body && <p className="text-sm text-foreground/80 italic">"{review.body}"</p>}
                  <button onClick={onReview} className="mt-2 text-xs text-primary hover:underline">Edit ulasan</button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {hasPendingRequest ? (
                      <>
                        <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          Bagaimana layanannya?
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Kami mengingatkan kamu H+1 — ulasanmu sangat berarti!
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Bagaimana layanannya?</p>
                        <p className="text-xs text-muted-foreground">Ulasanmu membantu orang lain memilih toko.</p>
                      </>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={hasPendingRequest ? "default" : "outline"}
                    className="gap-1.5 shrink-0"
                    onClick={onReview}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Beri Ulasan
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tambah ke Kalender (untuk booking mendatang) */}
          {["pending", "confirmed"].includes(b.status) && b.slot && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 w-full"
              onClick={() => downloadICS(b)}
            >
              <Calendar className="h-3.5 w-3.5" /> Tambah ke Kalender (.ics)
            </Button>
          )}

          {canCancel && (
            <div className="flex gap-2 pt-1 flex-wrap">
              {onReschedule && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onReschedule(b)}
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Jadwalkan Ulang
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={cancelling}
                onClick={() => onCancel(b.id)}
              >
                {cancelling ? "Membatalkan…" : "Batalkan Booking"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
