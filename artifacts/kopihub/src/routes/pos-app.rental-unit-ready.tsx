import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Bell, Loader2, RefreshCw, Car, CheckCircle2, MessageSquare, Search, Clock } from "lucide-react";

export const Route = createFileRoute("/pos-app/rental-unit-ready")({
  head: () => ({ meta: [{ title: "Notifikasi Unit Siap Diambil" }] }),
  component: RentalUnitReadyPage,
});

type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_date: string;
  status: string;
  unit_ready_notified: boolean | null;
  unit: { name: string; unit_code: string | null } | null;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

export default function RentalUnitReadyPage() {
  const { shop } = useCurrentShop();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [search, setSearch] = useState("");
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("rental_bookings")
        .select("id, customer_name, customer_phone, start_date, status, unit_ready_notified, unit:rental_units(name, unit_code)")
        .eq("shop_id", shopId)
        .eq("status", "confirmed")
        .gte("start_date", todayStr)
        .lte("start_date", tomorrowStr)
        .order("start_date");
      if (error?.message?.includes("column")) setShowSql(true);
      setBookings((data ?? []) as Booking[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const notify = async (b: Booking) => {
    setNotifying(b.id);
    try {
      const msg = `Halo ${b.customer_name}! Unit ${b.unit?.name ?? "Anda"} sudah siap diambil untuk penyewaan mulai ${fmtDate(b.start_date)}. Silakan datang ke lokasi kami. Terima kasih sudah memilih kami! 🚗`;
      if (b.customer_phone) {
        window.open(`https://wa.me/${b.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      await (supabase as any).from("rental_bookings").update({ unit_ready_notified: true }).eq("id", b.id);
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, unit_ready_notified: true } : x));
      toast.success(`Notifikasi dikirim ke ${b.customer_name}`);

      await (supabase as any).from("owner_notifications" as any).insert({
        shop_id: shop!.id, type: "rental_unit_ready",
        title: `✅ Notif terkirim — ${b.customer_name}`,
        body: `Unit ${b.unit?.name ?? ""} sudah diinfokan siap diambil via WA`,
        severity: "info", link: "/pos-app/rental-unit-ready",
        dedupe_key: `unit_ready_${b.id}`,
      });
    } catch { toast.error("Gagal mengirim notifikasi"); }
    finally { setNotifying(null); }
  };

  const notifyAll = async () => {
    const toNotify = filtered.filter(b => !b.unit_ready_notified);
    for (const b of toNotify) await notify(b);
  };

  const filtered = bookings.filter(b => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return b.customer_name.toLowerCase().includes(s) || (b.customer_phone ?? "").includes(s);
  });

  const unnotified = filtered.filter(b => !b.unit_ready_notified).length;

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Bell className="h-5 w-5 text-primary" /> Notifikasi Unit Siap Diambil</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Infokan penyewa bahwa unit mereka sudah siap — hari ini & besok.</p>
        </div>
        <div className="flex gap-2">
          {unnotified > 0 && (
            <Button onClick={notifyAll} className="gap-1.5">
              <Bell className="h-4 w-4" /> Notif Semua ({unnotified})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => load(shop.id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama penyewa..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Bell className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Tidak ada booking yang perlu dinotifikasi hari ini & besok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{b.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.unit?.name} · Ambil: {fmtDate(b.start_date)}
                  {b.customer_phone && ` · ${b.customer_phone}`}
                </p>
              </div>
              {b.unit_ready_notified ? (
                <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Sudah Dinotif
                </Badge>
              ) : (
                <Button size="sm" disabled={notifying === b.id} onClick={() => notify(b)} className="gap-1.5 shrink-0">
                  {notifying === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  Kirim WA
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
