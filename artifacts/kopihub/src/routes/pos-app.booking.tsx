import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  Clock,
  User,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/booking")({ component: BookingPage });

type Slot = {
  id: string;
  service_name: string;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  max_capacity: number;
  booked_count: number;
  price: number;
  notes: string | null;
};

type Booking = {
  id: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  status: "pending" | "confirmed" | "cancelled" | "done";
  notes: string | null;
  created_at: string;
  slot?: Slot;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Menunggu",   cls: "bg-amber-500/15 text-amber-700" },
  confirmed: { label: "Dikonfirmasi", cls: "bg-green-500/15 text-green-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-red-500/15 text-red-700" },
  done:      { label: "Selesai",    cls: "bg-muted text-muted-foreground" },
};

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function BookingPage() {
  const { shop } = useShop();
  const [view, setView] = useState<"bookings" | "slots">("bookings");
  const [date, setDate] = useState(isoDate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [slotOpen, setSlotOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({ service_name: "", slot_date: isoDate(new Date()), slot_time: "09:00", duration_min: "60", max_capacity: "1", price: "0", notes: "" });
  const [savingSlot, setSavingSlot] = useState(false);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [bookingForm, setBookingForm] = useState({ customer_name: "", customer_phone: "", party_size: "1", notes: "" });
  const [savingBooking, setSavingBooking] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const [sl, bk] = await Promise.all([
        supabase
          .from("booking_slots" as any)
          .select("*")
          .eq("shop_id" as any, shop.id)
          .eq("slot_date" as any, date)
          .order("slot_time" as any) as any,
        supabase
          .from("bookings" as any)
          .select("*, booking_slots!inner(*, shop_id)")
          .eq("booking_slots.shop_id" as any, shop.id)
          .eq("booking_slots.slot_date" as any, date)
          .order("created_at", { ascending: false }) as any,
      ]);
      setSlots(((sl.data as any[]) ?? []).map((s) => ({
        ...s,
        price: Number(s.price),
        duration_min: Number(s.duration_min),
        max_capacity: Number(s.max_capacity),
        booked_count: Number(s.booked_count ?? 0),
      })));
      setBookings(
        ((bk.data as any[]) ?? []).map((b) => ({ ...b, slot: b.booking_slots }))
      );
    } finally {
      setLoading(false);
    }
  }, [shop?.id, date]);

  useEffect(() => { load(); }, [load]);

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(isoDate(d));
  };
  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(isoDate(d));
  };

  const saveSlot = async () => {
    if (!shop?.id) return;
    if (!slotForm.service_name.trim()) { toast.error("Nama layanan wajib diisi"); return; }
    setSavingSlot(true);
    const { error } = await supabase.from("booking_slots" as any).insert({
      shop_id: shop.id,
      service_name: slotForm.service_name.trim(),
      slot_date: slotForm.slot_date,
      slot_time: slotForm.slot_time,
      duration_min: Number(slotForm.duration_min),
      max_capacity: Number(slotForm.max_capacity),
      price: Number(slotForm.price),
      notes: slotForm.notes.trim() || null,
    });
    setSavingSlot(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Slot ditambahkan");
    setSlotOpen(false);
    load();
  };

  const openBooking = (slot: Slot) => {
    setBookingSlot(slot);
    setBookingForm({ customer_name: "", customer_phone: "", party_size: "1", notes: "" });
    setBookingOpen(true);
  };

  const saveBooking = async () => {
    if (!bookingSlot) return;
    if (!bookingForm.customer_name.trim()) { toast.error("Nama pelanggan wajib diisi"); return; }
    setSavingBooking(true);
    const { error } = await supabase.from("bookings" as any).insert({
      slot_id: bookingSlot.id,
      customer_name: bookingForm.customer_name.trim(),
      customer_phone: bookingForm.customer_phone.trim() || null,
      party_size: Number(bookingForm.party_size),
      notes: bookingForm.notes.trim() || null,
      status: "confirmed",
    });
    setSavingBooking(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Booking ditambahkan");
    setBookingOpen(false);
    load();
  };

  const updateStatus = async (bk: Booking, status: Booking["status"]) => {
    setStatusUpdating(bk.id);
    const { error } = await supabase.from("bookings" as any).update({ status }).eq("id", bk.id);
    setStatusUpdating(null);
    if (error) toast.error(error.message);
    else { toast.success("Status diperbarui"); load(); }
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" /> Booking Jadwal Layanan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola slot waktu dan konfirmasi booking pelanggan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setSlotOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Buat Slot
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{fmtDate(date)}</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs text-muted-foreground bg-transparent text-center cursor-pointer"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-2xl font-bold">{slots.length}</p>
          <p className="text-xs text-muted-foreground">Slot hari ini</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{bookings.length}</p>
          <p className="text-xs text-muted-foreground">Total booking</p>
        </Card>
        <Card className={`p-4 ${pendingCount > 0 ? "border-amber-200 bg-amber-50/30" : ""}`}>
          <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-amber-700" : ""}`}>{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Menunggu konfirmasi</p>
        </Card>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {(["bookings", "slots"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
              view === v ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "bookings" ? "Booking Masuk" : "Slot Tersedia"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : view === "slots" ? (
        <div className="space-y-3">
          {slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
              Belum ada slot untuk hari ini — klik "Buat Slot" untuk menambahkan
            </div>
          ) : slots.map((slot) => {
            const avail = slot.max_capacity - slot.booked_count;
            return (
              <Card key={slot.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{slot.service_name}</span>
                      <Badge variant={avail === 0 ? "destructive" : "outline"} className="text-[10px]">
                        {avail === 0 ? "Penuh" : `${avail} slot tersisa`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{slot.slot_time} ({slot.duration_min} menit)</span>
                      <span>{slot.booked_count}/{slot.max_capacity} booking</span>
                      {slot.price > 0 && <span>Rp {slot.price.toLocaleString("id-ID")}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={avail === 0}
                    onClick={() => openBooking(slot)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Tambah Booking
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
              Belum ada booking untuk hari ini
            </div>
          ) : bookings.map((bk) => {
            const st = STATUS_BADGE[bk.status] ?? STATUS_BADGE.pending;
            return (
              <Card key={bk.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold">{bk.customer_name}</span>
                      {bk.party_size > 1 && <span className="text-xs text-muted-foreground">(×{bk.party_size})</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {bk.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{bk.customer_phone}</span>}
                      {bk.slot && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{bk.slot.slot_time} — {bk.slot.service_name}</span>}
                    </div>
                    {bk.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{bk.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {bk.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={statusUpdating === bk.id}
                          onClick={() => updateStatus(bk, "confirmed")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          Konfirmasi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={statusUpdating === bk.id}
                          onClick={() => updateStatus(bk, "cancelled")}
                        >
                          <XCircle className="h-3 w-3 mr-1 text-red-500" />
                          Tolak
                        </Button>
                      </>
                    )}
                    {bk.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={statusUpdating === bk.id}
                        onClick={() => updateStatus(bk, "done")}
                      >
                        <CheckCircle className="h-3 w-3 mr-1 text-primary" />
                        Selesai
                      </Button>
                    )}
                    {bk.status === "done" && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={slotOpen} onOpenChange={setSlotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Buat Slot Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama Layanan *</Label>
              <Input value={slotForm.service_name} onChange={(e) => setSlotForm((f) => ({ ...f, service_name: e.target.value }))} placeholder="cth: Konsultasi, Fotografi, Potong Rambut" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={slotForm.slot_date} onChange={(e) => setSlotForm((f) => ({ ...f, slot_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Jam mulai</Label>
                <Input type="time" value={slotForm.slot_time} onChange={(e) => setSlotForm((f) => ({ ...f, slot_time: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Durasi (mnt)</Label>
                <Input type="number" min={15} step={15} value={slotForm.duration_min} onChange={(e) => setSlotForm((f) => ({ ...f, duration_min: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Kapasitas</Label>
                <Input type="number" min={1} value={slotForm.max_capacity} onChange={(e) => setSlotForm((f) => ({ ...f, max_capacity: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Harga (Rp)</Label>
                <Input type="number" min={0} value={slotForm.price} onChange={(e) => setSlotForm((f) => ({ ...f, price: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={slotForm.notes} onChange={(e) => setSlotForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" placeholder="Opsional" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSlotOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveSlot} disabled={savingSlot}>{savingSlot ? "Menyimpan…" : "Buat Slot"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Booking Manual</DialogTitle></DialogHeader>
          {bookingSlot && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs mt-1">
              <strong>{bookingSlot.service_name}</strong> · {bookingSlot.slot_time} · {bookingSlot.duration_min} mnt
            </div>
          )}
          <div className="space-y-3 mt-1">
            <div>
              <Label>Nama Pelanggan *</Label>
              <Input value={bookingForm.customer_name} onChange={(e) => setBookingForm((f) => ({ ...f, customer_name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>No. WhatsApp</Label>
                <Input value={bookingForm.customer_phone} onChange={(e) => setBookingForm((f) => ({ ...f, customer_phone: e.target.value }))} placeholder="08xx" className="mt-1" />
              </div>
              <div>
                <Label>Jumlah Orang</Label>
                <Input type="number" min={1} value={bookingForm.party_size} onChange={(e) => setBookingForm((f) => ({ ...f, party_size: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" placeholder="Opsional" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setBookingOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveBooking} disabled={savingBooking}>{savingBooking ? "Menyimpan…" : "Konfirmasi Booking"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
