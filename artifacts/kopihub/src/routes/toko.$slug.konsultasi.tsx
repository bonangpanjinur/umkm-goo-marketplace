import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Video, Clock, Calendar, User, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/toko/$slug/konsultasi")({
  head: () => ({ meta: [{ title: "Konsultasi Video — Toko" }] }),
  component: ShopKonsultasiPage,
});

type Shop = { id: string; name: string; logo_url: string | null };
type Slot = {
  id: string; doctor_name: string; specialty: string | null; slot_date: string; slot_time: string;
  duration_minutes: number; price: number; platform: string; max_patients: number; booked_count: number;
  notes: string | null;
};

function ShopKonsultasiPage() {
  const { slug } = useParams({ from: "/toko/$slug/konsultasi" });
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState({ patient_name: "", patient_phone: "", patient_email: "", complaint: "" });
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("shops").select("id,name,logo_url").eq("slug", slug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setShop(s as Shop);
      const today = new Date().toISOString().slice(0, 10);
      const { data: sl } = await (supabase as any)
        .from("consultation_slots")
        .select("*")
        .eq("shop_id", s.id)
        .eq("is_active", true)
        .gte("slot_date", today)
        .order("slot_date").order("slot_time");
      setSlots((sl ?? []) as Slot[]);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (user) {
      supabase.from("customer_profiles").select("display_name, phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) setForm(f => ({
          ...f,
          patient_name: (data as any).display_name ?? f.patient_name,
          patient_phone: (data as any).phone ?? f.patient_phone,
        }));
      });
    }
  }, [user?.id]);

  const book = async () => {
    if (!selected || !shop) return;
    if (!form.patient_name.trim()) { toast.error("Nama pasien wajib diisi"); return; }
    setBooking(true);
    const { error } = await (supabase as any).from("consultation_sessions").insert({
      slot_id: selected.id, shop_id: shop.id, user_id: user?.id ?? null,
      patient_name: form.patient_name.trim(), patient_phone: form.patient_phone.trim() || null,
      patient_email: form.patient_email.trim() || null, complaint: form.complaint.trim() || null,
      status: "pending",
    });
    setBooking(false);
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from("consultation_slots").update({ booked_count: selected.booked_count + 1 }).eq("id", selected.id);
    toast.success("Booking berhasil! Kami akan mengkonfirmasi jadwal Anda.");
    setSelected(null);
    setDone(true);
  };

  const groupByDate = slots.reduce((acc, s) => {
    if (!acc[s.slot_date]) acc[s.slot_date] = [];
    acc[s.slot_date].push(s);
    return acc;
  }, {} as Record<string, Slot[]>);

  if (loading) return (
    <div className="min-h-screen flex flex-col"><MarketplaceHeader />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen flex flex-col"><MarketplaceHeader />
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Toko tidak ditemukan</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link to="/toko/$slug" params={{ slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2"><Video className="h-5 w-5" /> Konsultasi Video</h1>
          <p className="text-sm text-muted-foreground">{shop.name} — Pilih slot dan pesan konsultasi online</p>
        </div>

        {done ? (
          <Card className="flex flex-col items-center py-16 text-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="text-lg font-bold">Booking Berhasil!</h2>
            <p className="text-sm text-muted-foreground">Tim {shop.name} akan menghubungi Anda untuk konfirmasi jadwal dan link meeting.</p>
            <Button onClick={() => setDone(false)}>Pesan Lagi</Button>
          </Card>
        ) : slots.length === 0 ? (
          <Card className="flex flex-col items-center py-16 text-center gap-3">
            <Video className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">Tidak ada slot tersedia saat ini</p>
            <p className="text-sm text-muted-foreground">Cek kembali nanti atau hubungi toko langsung.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupByDate).map(([date, daySlots]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {daySlots.map(slot => {
                    const full = slot.booked_count >= slot.max_patients;
                    return (
                      <Card key={slot.id} className={`p-4 cursor-pointer transition-all ${full ? "opacity-60" : "hover:border-primary/60"}`} onClick={() => !full && setSelected(slot)}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{slot.doctor_name}</p>
                            {slot.specialty && <p className="text-xs text-muted-foreground">{slot.specialty}</p>}
                          </div>
                          <Badge className={full ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"} variant="outline">
                            {full ? "Penuh" : "Tersedia"}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{slot.slot_time} ({slot.duration_minutes} menit)</span>
                          <Badge variant="outline" className="text-[11px]">{slot.platform}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-semibold text-sm">{slot.price > 0 ? formatIDR(slot.price) : "Gratis"}</span>
                          <span className="text-xs text-muted-foreground">{slot.max_patients - slot.booked_count} slot tersisa</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <MarketplaceFooter />

      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pesan Slot Konsultasi</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <p className="font-semibold">{selected.doctor_name}</p>
                <p className="text-muted-foreground">{new Date(selected.slot_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {selected.slot_time} ({selected.duration_minutes} menit)</p>
                <p className="text-muted-foreground">{selected.platform} · {selected.price > 0 ? formatIDR(selected.price) : "Gratis"}</p>
              </div>
              <div>
                <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input className="mt-1" value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} placeholder="Nama Anda" />
              </div>
              <div>
                <Label>No. WhatsApp</Label>
                <Input className="mt-1" value={form.patient_phone} onChange={e => setForm(f => ({ ...f, patient_phone: e.target.value }))} placeholder="08xx..." />
              </div>
              <div>
                <Label>Email (opsional)</Label>
                <Input className="mt-1" type="email" value={form.patient_email} onChange={e => setForm(f => ({ ...f, patient_email: e.target.value }))} />
              </div>
              <div>
                <Label>Keluhan / Pertanyaan (opsional)</Label>
                <Textarea className="mt-1" rows={3} value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))} placeholder="Jelaskan keluhan atau pertanyaan Anda..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
            <Button onClick={book} disabled={booking}>
              {booking && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Pesan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
