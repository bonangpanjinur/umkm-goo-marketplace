import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListOrdered, Bell, Check, XCircle, Loader2, Copy, Users, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/waitlist")({
  head: () => ({ meta: [{ title: "Antrian Waitlist — Merchant" }] }),
  component: WaitlistPage,
});

const WAITLIST_SQL = `-- Jalankan di Supabase SQL Editor:
create table if not exists public.booking_waitlists (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.booking_slots(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  party_size integer not null default 1,
  status text not null default 'waiting'
    check (status in ('waiting','notified','confirmed','cancelled')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.booking_waitlists enable row level security;
create policy "shop_all_wl" on public.booking_waitlists
  using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
create policy "public_insert_wl" on public.booking_waitlists
  for insert with check (true);`;

const STATUS_LABEL: Record<string, string> = {
  waiting:   "Menunggu",
  notified:  "Sudah Dihubungi",
  confirmed: "Konfirmasi",
  cancelled: "Batal",
};
const STATUS_COLOR: Record<string, string> = {
  waiting:   "bg-amber-100 text-amber-800",
  notified:  "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

type WaitlistEntry = {
  id: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  status: string;
  notified_at: string | null;
  created_at: string;
  slot?: { service_name: string; slot_date: string; slot_time: string } | null;
};

type Slot = { id: string; service_name: string; slot_date: string; slot_time: string };

function WaitlistPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [filterSlot, setFilterSlot] = useState("all");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { error } = await (supabase as any).from("booking_waitlist").select("id").limit(1);
      if (error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
        setTableExists(false);
        setLoading(false);
        return;
      }
      setTableExists(true);
      await Promise.all([loadEntries(), loadSlots()]);
    })();
  }, [shop?.id]);

  async function loadSlots() {
    if (!shop?.id) return;
    const { data } = await (supabase as any)
      .from("booking_slots")
      .select("id, service_name, slot_date, slot_time")
      .eq("shop_id", shop.id)
      .gte("slot_date", new Date().toISOString().slice(0,10))
      .order("slot_date")
      .order("slot_time")
      .limit(100) as any;
    setSlots((data ?? []) as Slot[]);
  }

  async function loadEntries() {
    if (!shop?.id) return;
    const { data, error } = await (supabase as any)
      .from("booking_waitlist")
      .select(`
        id, slot_id, customer_name, customer_phone, party_size, status, notified_at, created_at,
        slot:booking_slots(service_name, slot_date, slot_time)
      `)
      .eq("shop_id", shop.id)
      .order("created_at");
    if (error) toast.error(error.message);
    setEntries((data ?? []) as WaitlistEntry[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const patch: any = { status };
    if (status === "notified") patch.notified_at = new Date().toISOString();
    const { error } = await (supabase as any).from("booking_waitlist").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Status diperbarui: ${STATUS_LABEL[status]}`); await loadEntries(); }
    setUpdating(null);
  }

  const filtered = entries.filter(e => {
    const matchSlot = filterSlot === "all" || e.slot_id === filterSlot;
    const matchSearch = !search || e.customer_name.toLowerCase().includes(search.toLowerCase()) || e.customer_phone.includes(search);
    return matchSlot && matchSearch;
  });

  const waiting   = filtered.filter(e => e.status === "waiting").length;
  const notified  = filtered.filter(e => e.status === "notified").length;

  if (shopLoading || loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  if (tableExists === false) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Antrian Waitlist</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">Tabel booking_waitlists belum ada. Jalankan SQL ini:</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-border p-3 text-[11px] whitespace-pre-wrap">{WAITLIST_SQL}</pre>
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => { navigator.clipboard.writeText(WAITLIST_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          >
            {copied ? <><Check className="h-3.5 w-3.5" /> Disalin!</> : <><Copy className="h-3.5 w-3.5" /> Salin SQL</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Antrian Waitlist</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola daftar tunggu pelanggan untuk slot booking yang penuh.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{waiting}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Menunggu</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{notified}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sudah Dihubungi</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{entries.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Antrian</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          className="max-w-[200px]"
          placeholder="Cari nama / telepon…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={filterSlot} onValueChange={setFilterSlot}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Semua slot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua slot</SelectItem>
            {slots.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.service_name} · {s.slot_date} {s.slot_time.slice(0,5)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada antrian waitlist.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e, idx) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{e.customer_name}</span>
                  <Badge className={`text-[10px] px-2 py-0 ${STATUS_COLOR[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </Badge>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{e.customer_phone}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.party_size} orang</span>
                  {e.slot && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {e.slot.service_name} · {e.slot.slot_date} {e.slot.slot_time.slice(0,5)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {e.status === "waiting" && (
                  <Button
                    size="sm" variant="outline" className="gap-1 text-xs h-7"
                    disabled={updating === e.id}
                    onClick={() => updateStatus(e.id, "notified")}
                  >
                    <Bell className="h-3 w-3" /> Hubungi
                  </Button>
                )}
                {e.status === "notified" && (
                  <Button
                    size="sm" className="gap-1 text-xs h-7"
                    disabled={updating === e.id}
                    onClick={() => updateStatus(e.id, "confirmed")}
                  >
                    <Check className="h-3 w-3" /> Konfirmasi
                  </Button>
                )}
                {["waiting","notified"].includes(e.status) && (
                  <Button
                    size="sm" variant="ghost" className="gap-1 text-xs h-7 text-destructive"
                    disabled={updating === e.id}
                    onClick={() => updateStatus(e.id, "cancelled")}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
