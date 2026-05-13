import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle, Phone, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("customer_profiles" as any)
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.phone) {
          setPhone(data.phone);
          loadBookings(data.phone);
        }
      });
  }, [user]);

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
            shop:coffee_shops(name, slug)
          )
        `)
        .eq("customer_phone", ph.trim())
        .order("created_at", { ascending: false })
        .limit(50) as any;
      if (error) throw error;
      setBookings((data ?? []) as Booking[]);
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
    // fetch available future slots for same shop
    let query = (supabase as any)
      .from("booking_slots")
      .select("id, service_name, slot_date, slot_time, price, capacity")
      .gte("slot_date", today)
      .eq("is_active", true)
      .neq("id", b.slot ? undefined : undefined)
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

  const upcoming = bookings.filter(b => ["pending","confirmed"].includes(b.status));
  const past     = bookings.filter(b => !["pending","confirmed"].includes(b.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Riwayat Booking</h2>
        <p className="mt-1 text-sm text-muted-foreground">Semua jadwal layanan yang telah kamu pesan.</p>
      </div>

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
        <div className="text-sm text-muted-foreground">Memuat booking…</div>
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
              {rescheduling && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Konfirmasi Jadwal Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mendatang</h3>
          <div className="space-y-3">
            {upcoming.map(b => <BookingCard key={b.id} booking={b} expanded={expanded === b.id} onToggle={() => setExpanded(expanded === b.id ? null : b.id)} onCancel={cancelBooking} cancelling={cancelling === b.id} onReschedule={openReschedule} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riwayat</h3>
          <div className="space-y-3">
            {past.map(b => <BookingCard key={b.id} booking={b} expanded={expanded === b.id} onToggle={() => setExpanded(expanded === b.id ? null : b.id)} onCancel={cancelBooking} cancelling={cancelling === b.id} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking: b, expanded, onToggle, onCancel, cancelling, onReschedule }: {
  booking: Booking;
  expanded: boolean;
  onToggle: () => void;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onReschedule?: (b: Booking) => void;
}) {
  const Icon = STATUS_ICON[b.status] ?? CalendarCheck;
  const canCancel = ["pending","confirmed"].includes(b.status);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
