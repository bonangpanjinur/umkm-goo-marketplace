import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarCheck, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/booking/reschedule/$token")({
  component: BookingReschedulePage,
});

type Booking = {
  id: string;
  status: string;
  customer_name: string;
  party_size: number;
  slot: {
    id: string;
    service_name: string;
    slot_date: string;
    slot_time: string;
    duration_min: number;
    shop_id: string;
    shop: { name: string; slug: string };
  };
};

type Slot = {
  id: string;
  slot_date: string;
  slot_time: string;
  capacity: number;
  booked_count: number;
};

function BookingReschedulePage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: tok } = await supabase
          .from("booking_reschedule_tokens" as any)
          .select("id, booking_id, used_at, expires_at")
          .eq("token", token)
          .maybeSingle();
        if (!tok) { setError("Link reschedule tidak valid atau sudah kadaluarsa."); return; }
        const t = tok as any;
        if (t.used_at) { setError("Link sudah pernah digunakan."); return; }
        if (new Date(t.expires_at) < new Date()) { setError("Link sudah kadaluarsa."); return; }
        setTokenId(t.id);

        const { data: b } = await supabase
          .from("booking_reservations" as any)
          .select("id, status, customer_name, party_size, slot:booking_slots!inner(id, service_name, slot_date, slot_time, duration_min, shop_id, shop:coffee_shops!inner(name, slug))")
          .eq("id", t.booking_id)
          .maybeSingle();
        if (!b) { setError("Booking tidak ditemukan."); return; }
        const bk = b as any as Booking;
        if (bk.status === "cancelled") { setError("Booking sudah dibatalkan."); return; }
        if (bk.status === "completed") { setError("Booking sudah selesai."); return; }
        setBooking(bk);
        setDate(bk.slot.slot_date);
      } catch (e) {
        setError((e as Error).message);
      } finally { setLoading(false); }
    })();
  }, [token]);

  useEffect(() => {
    if (!booking || !date) return;
    (async () => {
      const { data } = await supabase
        .from("booking_slots" as any)
        .select("id, slot_date, slot_time, capacity, booked_count")
        .eq("shop_id", booking.slot.shop_id)
        .eq("service_name", booking.slot.service_name)
        .eq("slot_date", date)
        .order("slot_time");
      setSlots(((data as any[]) ?? []).filter((s: any) => s.booked_count < s.capacity || s.id === booking.slot.id));
    })();
  }, [date, booking]);

  const submit = async () => {
    if (!booking || !selectedSlot || !tokenId) return;
    setSubmitting(true);
    try {
      // decrement old slot
      await supabase.rpc("decrement_slot_booked" as any, { _slot_id: booking.slot.id }).throwOnError();
    } catch {}
    try {
      // increment new slot via RPC if exists, else direct update
      const { error: incErr } = await supabase.rpc("increment_slot_booked" as any, { _slot_id: selectedSlot });
      if (incErr) {
        // fallback: best-effort
        await supabase.from("booking_slots" as any)
          .update({ booked_count: (slots.find((s) => s.id === selectedSlot)?.booked_count ?? 0) + 1 })
          .eq("id", selectedSlot);
      }
      const { error: upErr } = await supabase
        .from("booking_reservations" as any)
        .update({ slot_id: selectedSlot, status: "confirmed" })
        .eq("id", booking.id);
      if (upErr) throw upErr;
      await supabase.from("booking_reschedule_tokens" as any)
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenId);
      setDone(true);
      toast.success("Jadwal berhasil diubah");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Reschedule Booking</h1>
          <p className="text-sm text-muted-foreground mt-1">Ubah jadwal kunjungan Anda secara mandiri.</p>
        </div>

        {loading ? (
          <Card className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></Card>
        ) : error ? (
          <Card className="p-6 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-2 text-red-700 font-semibold"><AlertTriangle className="h-5 w-5" /> {error}</div>
          </Card>
        ) : done ? (
          <Card className="p-6 border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-2 text-green-700 font-semibold mb-2"><CheckCircle2 className="h-5 w-5" /> Berhasil</div>
            <p className="text-sm text-muted-foreground">Jadwal Anda sudah diperbarui. Anda akan menerima konfirmasi via WhatsApp.</p>
          </Card>
        ) : booking && (
          <>
            <Card className="p-5 mb-4">
              <div className="text-xs text-muted-foreground">Booking saat ini</div>
              <div className="mt-1 font-semibold">{booking.slot.shop.name} — {booking.slot.service_name}</div>
              <div className="text-sm">{booking.slot.slot_date} · {booking.slot.slot_time.slice(0, 5)} ({booking.slot.duration_min} menit)</div>
              <div className="text-xs text-muted-foreground mt-1">a/n {booking.customer_name}</div>
            </Card>

            <Card className="p-5">
              <Label>Pilih Tanggal Baru</Label>
              <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }} className="mb-4" />

              <Label className="mb-2 block">Pilih Slot Waktu</Label>
              {slots.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Tidak ada slot tersedia di tanggal ini.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const full = s.booked_count >= s.capacity && s.id !== booking.slot.id;
                    return (
                      <button
                        key={s.id}
                        disabled={full}
                        onClick={() => setSelectedSlot(s.id)}
                        className={`px-3 py-2 rounded-md border text-sm tabular-nums transition-colors ${
                          selectedSlot === s.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : full
                            ? "opacity-40 cursor-not-allowed border-border"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {s.slot_time.slice(0, 5)}
                      </button>
                    );
                  })}
                </div>
              )}

              <Button className="w-full mt-6" disabled={!selectedSlot || submitting} onClick={submit}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Konfirmasi Reschedule
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Link ini hanya berlaku 1× dan kadaluarsa otomatis.
              </p>
            </Card>
          </>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}