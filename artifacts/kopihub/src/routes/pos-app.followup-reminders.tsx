import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell, Loader2, RefreshCw, MessageSquare, CheckCircle2, Search,
  Clock, Scissors, Stethoscope, Play, Settings2, Save,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/followup-reminders")({
  head: () => ({ meta: [{ title: "Reminder Kunjungan Ulang" }] }),
  component: FollowupRemindersPage,
});

type ReminderConfig = {
  enabled: boolean;
  days_after: number;
  mode: "haircut" | "clinic" | "custom";
  message_template: string;
};

type PastBooking = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  slot_date: string;
  service_name: string | null;
  reminded: boolean;
  days_since: number;
};

const TEMPLATES = {
  haircut: "Halo {{name}}! Sudah {{days}} hari sejak kamu potong rambut di {{shop}}. Yuk mampir lagi biar tetap rapi! 💈 Booking sekarang: {{link}}",
  clinic: "Halo {{name}}, sudah {{days}} hari sejak kunjungan terakhir ke {{shop}}. Kami merekomendasikan kontrol ulang untuk memastikan kondisi Anda tetap optimal. Hubungi kami untuk jadwal: {{phone}}",
  custom: "Halo {{name}}, sudah {{days}} hari sejak kunjungan terakhirmu ke {{shop}}. Kami senang bertemu Anda kembali! {{link}}",
};

function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }

export default function FollowupRemindersPage() {
  const { shop } = useCurrentShop();
  const [config, setConfig] = useState<ReminderConfig>({
    enabled: true,
    days_after: 28,
    mode: "haircut",
    message_template: TEMPLATES.haircut,
  });
  const [bookings, setBookings] = useState<PastBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reminding, setReminding] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const since = new Date(Date.now() - config.days_after * 86400000 * 1.5).toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("bookings")
      .select("id, customer_name, customer_phone, slot:booking_slots(slot_date, service_name)")
      .eq("shop_id" as any, shopId)
      .eq("status" as any, "completed")
      .gte("created_at" as any, since)
      .order("created_at" as any, { ascending: false })
      .limit(100) as any;

    const rows: PastBooking[] = (data ?? []).map((b: Record<string, unknown>) => {
      const slot = b.slot as Record<string, string> | null;
      const slotDate = slot?.slot_date ?? "";
      const ds = slotDate ? daysSince(slotDate) : 0;
      return {
        id: String(b.id),
        customer_name: String(b.customer_name),
        customer_phone: b.customer_phone as string | null,
        slot_date: slotDate,
        service_name: slot?.service_name ?? null,
        reminded: false,
        days_since: ds,
      };
    });
    setBookings(rows.filter(r => r.days_since >= config.days_after - 2 && r.days_since <= config.days_after + 7));
    setLoading(false);
  }, [config.days_after]);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const sendReminder = async (b: PastBooking) => {
    if (!b.customer_phone) { toast.error("Nomor WA tidak tersedia"); return; }
    setReminding(b.id);
    const msg = config.message_template
      .replace(/{{name}}/g, b.customer_name)
      .replace(/{{days}}/g, String(b.days_since))
      .replace(/{{shop}}/g, shop?.name ?? "toko kami")
      .replace(/{{link}}/g, `https://umkmgo.id/toko/${(shop as Record<string, string>)?.slug ?? ""}`)
      .replace(/{{phone}}/g, shop?.phone ?? "");
    window.open(`https://wa.me/${b.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    setBookings(prev => prev.map(x => x.id === b.id ? { ...x, reminded: true } : x));
    toast.success(`Reminder dikirim ke ${b.customer_name}`);
    setReminding(null);
  };

  const remindAll = async () => {
    const toRemind = filtered.filter(b => !b.reminded && b.customer_phone);
    for (const b of toRemind) await sendReminder(b);
  };

  const filtered = bookings.filter(b =>
    !search.trim() || b.customer_name.toLowerCase().includes(search.toLowerCase())
  );
  const unreminded = filtered.filter(b => !b.reminded && b.customer_phone).length;

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Bell className="h-5 w-5 text-primary" />
            Reminder Kunjungan Ulang
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ingatkan pelanggan kembali otomatis — {config.days_after} hari setelah kunjungan terakhir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}><Settings2 className="h-3.5 w-3.5" /></Button>
          {unreminded > 0 && (
            <Button onClick={remindAll} className="gap-1.5">
              <Play className="h-4 w-4" /> Kirim Semua ({unreminded})
            </Button>
          )}
        </div>
      </div>

      {showConfig && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <p className="font-semibold text-sm">Pengaturan Reminder</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={config.mode} onValueChange={v => {
                const mode = v as ReminderConfig["mode"];
                setConfig(c => ({ ...c, mode, message_template: TEMPLATES[mode] }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="haircut"><Scissors className="inline h-3 w-3 mr-1" /> Potong Rambut / Salon</SelectItem>
                  <SelectItem value="clinic"><Stethoscope className="inline h-3 w-3 mr-1" /> Klinik / Kontrol</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kirim setelah (hari)</Label>
              <Input type="number" min={1} max={365} value={config.days_after}
                onChange={e => setConfig(c => ({ ...c, days_after: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Template Pesan WA</Label>
            <textarea
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.message_template}
              onChange={e => setConfig(c => ({ ...c, message_template: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Variabel: {"{{name}}"}, {"{{days}}"}, {"{{shop}}"}, {"{{link}}"}, {"{{phone}}"}</p>
          </div>
          <Button size="sm" onClick={() => { setShowConfig(false); load(shop.id); toast.success("Pengaturan disimpan"); }} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Simpan & Refresh
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama pelanggan..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Bell className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Tidak ada pelanggan yang perlu diingatkan saat ini ({config.days_after} hari setelah kunjungan).</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="flex items-center gap-4 rounded-xl border bg-card p-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{b.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.service_name ?? "Kunjungan"} · {fmtDate(b.slot_date)} · <strong>{b.days_since} hari lalu</strong>
                </p>
              </div>
              {b.reminded ? (
                <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Terkirim
                </Badge>
              ) : b.customer_phone ? (
                <Button size="sm" disabled={reminding === b.id} onClick={() => sendReminder(b)} className="gap-1.5 shrink-0">
                  {reminding === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  WA
                </Button>
              ) : (
                <Badge variant="secondary" className="text-xs shrink-0">No WA</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
