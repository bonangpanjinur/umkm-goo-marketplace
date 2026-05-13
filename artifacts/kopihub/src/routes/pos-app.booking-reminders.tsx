import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, MessageCircle, Loader2, CalendarClock, CheckCircle2, Clock, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/booking-reminders")({
  head: () => ({ meta: [{ title: "Reminder Booking Otomatis" }] }),
  component: BookingRemindersPage,
});

type UpcomingBooking = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  party_size: number;
  notes: string | null;
  slot: {
    service_name: string;
    slot_date: string;
    slot_time: string;
    price: number | null;
  } | null;
  daysUntil: number;
  reminderType: "h-1" | "h-3" | "none";
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function buildWAMessage(booking: UpcomingBooking, shopName: string): string {
  const date = booking.slot ? new Date(booking.slot.slot_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-";
  const time = booking.slot ? booking.slot.slot_time.slice(0, 5) : "-";
  const service = booking.slot?.service_name ?? "Layanan";
  const days = booking.daysUntil;

  const prefix = days === 1
    ? `⏰ *Pengingat Besok!*`
    : `📅 *Pengingat ${days} Hari Lagi!*`;

  return `${prefix}

Halo ${booking.customer_name}! 👋

Kami ingin mengingatkan booking kamu di *${shopName}*:

🗓️ *Layanan:* ${service}
📅 *Tanggal:* ${date}
⏰ *Jam:* ${time}
👥 *Jumlah:* ${booking.party_size} orang
${booking.slot?.price ? `💰 *Harga:* Rp ${Number(booking.slot.price).toLocaleString("id-ID")}` : ""}

${booking.notes ? `📝 *Catatan:* ${booking.notes}\n` : ""}
Jika ada perubahan, silakan hubungi kami. Terima kasih! 🙏`;
}

function BookingRemindersPage() {
  const { shop } = useCurrentShop();
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "h-1" | "h-3">("all");

  useEffect(() => {
    if (!shop) return;
    load();
  }, [shop]);

  async function load() {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 14);

    const todayISO = today.toISOString().slice(0, 10);
    const maxISO = maxDate.toISOString().slice(0, 10);

    const { data, error } = await (supabase as any)
      .from("bookings")
      .select(`
        id, customer_name, customer_phone, status, party_size, notes,
        slot:booking_slots(service_name, slot_date, slot_time, price, shop_id)
      `)
      .in("status", ["pending", "confirmed"])
      .gte("booking_slots.slot_date", todayISO)
      .lte("booking_slots.slot_date", maxISO);

    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      setLoading(false);
      return;
    }

    const result: UpcomingBooking[] = ((data ?? []) as any[])
      .filter((b: any) => b.slot?.shop_id === shop!.id && b.slot?.slot_date)
      .map((b: any) => {
        const days = daysUntilDate(b.slot.slot_date);
        const reminderType: UpcomingBooking["reminderType"] =
          days === 1 ? "h-1" : days === 3 ? "h-3" : "none";
        return { ...b, daysUntil: days, reminderType };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    setBookings(result);
    setLoading(false);
  }

  function sendWA(booking: UpcomingBooking) {
    if (!booking.customer_phone) { toast.error("Nomor HP pelanggan tidak tersedia"); return; }
    const msg = buildWAMessage(booking, shop?.name ?? "Toko");
    const phone = booking.customer_phone.replace(/\D/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const filtered = bookings.filter(b => filter === "all" || b.reminderType === filter);
  const h1Count = bookings.filter(b => b.reminderType === "h-1").length;
  const h3Count = bookings.filter(b => b.reminderType === "h-3").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Reminder Booking</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Kirim pengingat otomatis via WhatsApp ke pelanggan H-1 dan H-3 sebelum jadwal.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 w-full sm:w-auto">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{bookings.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Mendatang</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${h1Count > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : "border-border bg-card"}`}>
          <p className={`text-2xl font-bold ${h1Count > 0 ? "text-red-600" : ""}`}>{h1Count}</p>
          <p className="text-xs text-muted-foreground mt-1">Reminder H-1</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${h3Count > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10" : "border-border bg-card"}`}>
          <p className={`text-2xl font-bold ${h3Count > 0 ? "text-amber-600" : ""}`}>{h3Count}</p>
          <p className="text-xs text-muted-foreground mt-1">Reminder H-3</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={v => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Booking</SelectItem>
            <SelectItem value="h-1">🔴 Reminder H-1</SelectItem>
            <SelectItem value="h-3">🟡 Reminder H-3</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} booking</span>
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Tidak ada booking mendatang dalam 14 hari ke depan." : `Tidak ada booking yang perlu reminder ${filter.toUpperCase()}.`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className={`rounded-xl border bg-card p-4 ${b.reminderType === "h-1" ? "border-red-200" : b.reminderType === "h-3" ? "border-amber-200" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{b.customer_name}</span>
                    <Badge className={`text-[10px] px-2 py-0 ${STATUS_COLOR[b.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                    {b.reminderType !== "none" && (
                      <Badge className={`text-[10px] px-2 py-0 font-bold ${b.reminderType === "h-1" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        ⚡ {b.reminderType.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.slot?.service_name ?? "Layanan"} · {b.slot ? new Date(b.slot.slot_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }) : "-"} pukul {b.slot?.slot_time.slice(0,5) ?? "-"}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.daysUntil === 0 ? "Hari ini" : b.daysUntil === 1 ? "Besok" : `${b.daysUntil} hari lagi`}</span>
                    {b.customer_phone && <span>{b.customer_phone}</span>}
                    <span>{b.party_size} orang</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {b.customer_phone ? (
                    <Button size="sm" onClick={() => sendWA(b)} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs h-8">
                      <MessageCircle className="h-3.5 w-3.5" /> WA
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground self-center">Tidak ada HP</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground flex items-center gap-1.5"><Clock className="h-4 w-4" /> Cara Kerja Reminder</p>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>Halaman ini menampilkan booking dalam 14 hari ke depan</li>
          <li>H-1 = booking yang jadwalnya <strong>besok</strong> — kirim reminder hari ini</li>
          <li>H-3 = booking yang jadwalnya <strong>3 hari lagi</strong> — kirim reminder hari ini</li>
          <li>Klik tombol WA untuk membuka WhatsApp dengan pesan yang sudah terisi otomatis</li>
          <li>Refresh halaman setiap hari untuk melihat daftar terbaru</li>
        </ul>
      </div>
    </div>
  );
}
