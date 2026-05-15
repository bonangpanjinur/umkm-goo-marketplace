import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap, Plus, Trash2, Loader2, Copy, Check, Pencil, Clock,
  CalendarClock, Tag, BarChart3, Ban, Play, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/flash-sale")({
  head: () => ({ meta: [{ title: "Flash Sale Terjadwal — Merchant" }] }),
  component: FlashSalePage,
});

const FS_SQL = `-- Jalankan di Supabase SQL Editor:
create table if not exists public.flash_sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.coffee_shops(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  flash_price numeric(10,2) not null,
  original_price numeric(10,2) not null,
  stock_limit integer,
  stock_sold integer not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.flash_sales enable row level security;
create policy "owner_all_fs" on public.flash_sales
  using (shop_id in (select id from coffee_shops where owner_id = auth.uid()))
  with check (shop_id in (select id from coffee_shops where owner_id = auth.uid()));
create policy "public_read_fs" on public.flash_sales
  for select using (true);`;

type MenuItem = { id: string; name: string; price: number; image_url: string | null };
type FlashSale = {
  id: string; menu_item_id: string; flash_price: number; original_price: number;
  stock_limit: number | null; stock_sold: number; starts_at: string; ends_at: string; is_active: boolean;
};
type FSStatus = "active" | "upcoming" | "ended" | "paused";

function getStatus(fs: FlashSale): FSStatus {
  const now = Date.now();
  const start = new Date(fs.starts_at).getTime();
  const end   = new Date(fs.ends_at).getTime();
  if (!fs.is_active) return "paused";
  if (now < start) return "upcoming";
  if (now > end)   return "ended";
  return "active";
}

const STATUS_COLOR: Record<FSStatus, string> = {
  active:   "bg-red-100 text-red-700 border-red-200",
  upcoming: "bg-amber-100 text-amber-700 border-amber-200",
  ended:    "bg-muted text-muted-foreground",
  paused:   "bg-slate-100 text-slate-600",
};
const STATUS_LABEL: Record<FSStatus, string> = {
  active: "Sedang Berlangsung", upcoming: "Terjadwal", ended: "Selesai", paused: "Dijeda",
};

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function fromLocalDatetimeInput(val: string) {
  return new Date(val).toISOString();
}

function defaultForm() {
  const now = new Date();
  const start = new Date(now.getTime() + 5 * 60 * 1000);
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    menu_item_id: "",
    flash_price: 0,
    discount_pct: 20,
    use_pct: true,
    starts_at: toLocalDatetimeInput(start.toISOString()),
    ends_at:   toLocalDatetimeInput(end.toISOString()),
    stock_limit: "" as number | "",
  };
}

function useCountdown(endsAt: string) {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTicks(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { h, m, s: sec, expired: ms === 0, ms, _ticks: ticks };
}

function CountdownDisplay({ endsAt }: { endsAt: string }) {
  const { h, m, s, expired } = useCountdown(endsAt);
  if (expired) return <span className="text-xs text-muted-foreground">Selesai</span>;
  return (
    <span className="font-mono text-xs font-semibold tabular-nums text-red-600">
      {h > 0 ? `${h}j ${m}m ${s}d` : `${m}m ${s}d`}
    </span>
  );
}

export default function FlashSalePage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [menuItems, setMenuItems]     = useState<MenuItem[]>([]);
  const [sales, setSales]             = useState<FlashSale[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showDialog, setShowDialog]   = useState(false);
  const [editSale, setEditSale]       = useState<FlashSale | null>(null);
  const [form, setForm]               = useState(defaultForm());
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [toggling, setToggling]       = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | FSStatus>("all");

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { error } = await (supabase as any).from("flash_sales").select("id").limit(1);
      if (error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
        setTableExists(false); setLoading(false); return;
      }
      setTableExists(true);
      await Promise.all([loadMenuItems(), loadSales()]);
    })();
  }, [shop?.id]);

  async function loadMenuItems() {
    if (!shop?.id) return;
    const { data } = await supabase
      .from("menu_items" as any).select("id, name, price, image_url")
      .eq("shop_id" as any, shop.id).eq("is_available" as any, true)
      .order("name" as any).limit(200) as any;
    setMenuItems((data ?? []) as MenuItem[]);
  }

  async function loadSales() {
    if (!shop?.id) return;
    const { data, error } = await (supabase as any)
      .from("flash_sales").select("*").eq("shop_id", shop.id)
      .order("starts_at", { ascending: false });
    if (error) toast.error(error.message);
    setSales((data ?? []) as FlashSale[]);
    setLoading(false);
  }

  function openAdd() {
    setEditSale(null);
    setForm(defaultForm());
    setShowDialog(true);
  }

  function openEdit(fs: FlashSale) {
    setEditSale(fs);
    const discPct = Math.round((1 - fs.flash_price / fs.original_price) * 100);
    setForm({
      menu_item_id: fs.menu_item_id,
      flash_price: fs.flash_price,
      discount_pct: discPct,
      use_pct: false,
      starts_at: toLocalDatetimeInput(fs.starts_at),
      ends_at:   toLocalDatetimeInput(fs.ends_at),
      stock_limit: fs.stock_limit ?? "",
    });
    setShowDialog(true);
  }

  function getEffectiveFlashPrice(): number {
    const base = menuItems.find(m => m.id === form.menu_item_id)?.price ?? 0;
    if (form.use_pct && base > 0) {
      return Math.round(base * (1 - form.discount_pct / 100));
    }
    return Number(form.flash_price);
  }

  async function save() {
    if (!form.menu_item_id) { toast.error("Pilih produk."); return; }
    const item = menuItems.find(m => m.id === form.menu_item_id);
    if (!item) return;
    const fp = getEffectiveFlashPrice();
    if (fp <= 0 || fp >= item.price) { toast.error("Harga flash sale harus lebih kecil dari harga normal."); return; }
    const startsAt = fromLocalDatetimeInput(form.starts_at);
    const endsAt   = fromLocalDatetimeInput(form.ends_at);
    if (new Date(endsAt) <= new Date(startsAt)) { toast.error("Waktu selesai harus setelah waktu mulai."); return; }
    if (!shop?.id) return;
    setSaving(true);
    try {
      const payload = {
        shop_id: shop.id,
        menu_item_id: form.menu_item_id,
        flash_price: fp,
        original_price: item.price,
        stock_limit: form.stock_limit !== "" ? Number(form.stock_limit) : null,
        stock_sold: editSale?.stock_sold ?? 0,
        starts_at: startsAt,
        ends_at:   endsAt,
        is_active: true,
      };

      if (editSale) {
        const { error } = await (supabase as any).from("flash_sales").update(payload).eq("id", editSale.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("flash_sales").insert(payload);
        if (error) throw error;
      }

      // Sync to menu_items so marketplace homepage picks it up
      const now = Date.now();
      const isNowActive = new Date(startsAt).getTime() <= now && new Date(endsAt).getTime() > now;
      if (isNowActive) {
        await (supabase as any).from("menu_items").update({
          flash_price: fp,
          flash_starts_at: startsAt,
          flash_ends_at: endsAt,
        }).eq("id", form.menu_item_id);
      }

      toast.success(editSale ? "Flash sale diperbarui!" : "Flash sale dijadwalkan!");
      setShowDialog(false);
      await loadSales();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(fs: FlashSale) {
    setToggling(fs.id);
    const newActive = !fs.is_active;
    const { error } = await (supabase as any).from("flash_sales").update({ is_active: newActive }).eq("id", fs.id);
    if (error) { toast.error(error.message); }
    else {
      // Sync menu_items
      if (!newActive) {
        await (supabase as any).from("menu_items").update({ flash_price: null, flash_starts_at: null, flash_ends_at: null }).eq("id", fs.menu_item_id);
        toast.success("Flash sale dijeda");
      } else {
        const now = Date.now();
        const isNowActive = new Date(fs.starts_at).getTime() <= now && new Date(fs.ends_at).getTime() > now;
        if (isNowActive) {
          await (supabase as any).from("menu_items").update({
            flash_price: fs.flash_price,
            flash_starts_at: fs.starts_at,
            flash_ends_at: fs.ends_at,
          }).eq("id", fs.menu_item_id);
        }
        toast.success("Flash sale diaktifkan");
      }
      await loadSales();
    }
    setToggling(null);
  }

  async function deleteSale(fs: FlashSale) {
    setDeleting(fs.id);
    const { error } = await (supabase as any).from("flash_sales").delete().eq("id", fs.id);
    if (error) { toast.error(error.message); }
    else {
      // Clear menu_items flash fields
      await (supabase as any).from("menu_items").update({ flash_price: null, flash_starts_at: null, flash_ends_at: null }).eq("id", fs.menu_item_id);
      toast.success("Flash sale dihapus");
      await loadSales();
    }
    setDeleting(null);
  }

  if (shopLoading || loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  if (tableExists === false) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-destructive" /> Flash Sale Terjadwal</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">Tabel flash_sales belum ada. Jalankan SQL ini di Supabase:</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-border p-3 text-[11px] whitespace-pre-wrap">{FS_SQL}</pre>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
            navigator.clipboard.writeText(FS_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000);
          }}>
            {copied ? <><Check className="h-3.5 w-3.5" /> Disalin!</> : <><Copy className="h-3.5 w-3.5" /> Salin SQL</>}
          </Button>
        </div>
      </div>
    );
  }

  const activeCount   = sales.filter(s => getStatus(s) === "active").length;
  const upcomingCount = sales.filter(s => getStatus(s) === "upcoming").length;
  const filtered = filterStatus === "all" ? sales : sales.filter(s => getStatus(s) === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-destructive" /> Flash Sale Terjadwal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur diskon kilat dengan waktu mulai/selesai otomatis. Tampil langsung di marketplace dengan countdown timer.
          </p>
        </div>
        <Button className="gap-1.5 bg-destructive hover:bg-destructive/90 text-white" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Buat Flash Sale
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sedang Aktif", value: activeCount, color: "text-destructive", bg: "bg-red-50 border-red-200 dark:bg-red-950/20" },
          { label: "Terjadwal", value: upcomingCount, color: "text-amber-600", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20" },
          { label: "Total Flash Sale", value: sales.length, color: "text-foreground", bg: "" },
          { label: "Produk Terlibat", value: new Set(sales.map(s => s.menu_item_id)).size, color: "text-primary", bg: "" },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 text-center ${s.bg || "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      {sales.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "active", "upcoming", "ended", "paused"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterStatus === f ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
            >
              {f === "all" ? "Semua" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Belum ada flash sale</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Buat flash sale untuk meningkatkan penjualan — produkmu tampil di beranda marketplace dengan countdown timer!
          </p>
          <Button className="mt-4 gap-1.5 bg-destructive hover:bg-destructive/90 text-white" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Buat Flash Sale Pertama
          </Button>
        </div>
      )}

      {/* Sales list */}
      <div className="space-y-3">
        {filtered.map(fs => {
          const status  = getStatus(fs);
          const item    = menuItems.find(m => m.id === fs.menu_item_id);
          const discPct = Math.round((1 - fs.flash_price / fs.original_price) * 100);
          const stockPct = fs.stock_limit ? Math.round((fs.stock_sold / fs.stock_limit) * 100) : null;
          const isDeleting = deleting === fs.id;
          const isToggling = toggling === fs.id;

          return (
            <div key={fs.id} className={`rounded-xl border bg-card overflow-hidden ${status === "active" ? "border-red-300 dark:border-red-800 shadow-sm" : "border-border"}`}>
              {status === "active" && (
                <div className="flex items-center gap-2 bg-destructive px-4 py-1.5">
                  <Zap className="h-3.5 w-3.5 text-white animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Flash Sale Sedang Berlangsung</span>
                  <div className="ml-auto font-mono text-xs font-bold text-white tabular-nums">
                    <CountdownDisplay endsAt={fs.ends_at} />
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-4">
                {/* Product image */}
                <div className="shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-muted/40 border border-border">
                  {item?.image_url
                    ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center"><Tag className="h-6 w-6 text-muted-foreground" /></div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="font-semibold text-sm">{item?.name ?? fs.menu_item_id}</p>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-destructive">{formatIDR(fs.flash_price)}</span>
                      <span className="text-xs text-muted-foreground line-through">{formatIDR(fs.original_price)}</span>
                      <span className="text-xs font-bold text-destructive bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full">-{discPct}%</span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {new Date(fs.starts_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      {new Date(fs.ends_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {fs.stock_limit && (
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Stok {fs.stock_sold}/{fs.stock_limit}
                      </span>
                    )}
                    {status === "upcoming" && (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Mulai dalam: <CountdownDisplay endsAt={fs.starts_at} />
                      </span>
                    )}
                  </div>

                  {/* Stock progress bar */}
                  {stockPct !== null && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${Math.min(100, stockPct)}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {stockPct >= 80 ? "⚡ Hampir habis!" : `${100 - stockPct}% stok tersisa`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                    onClick={() => openEdit(fs)}
                    title="Edit"
                    disabled={isDeleting || isToggling}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                      fs.is_active
                        ? "border-amber-200 hover:bg-amber-50 text-amber-600"
                        : "border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                    }`}
                    onClick={() => toggleActive(fs)}
                    disabled={isDeleting || isToggling || status === "ended"}
                    title={fs.is_active ? "Jeda" : "Aktifkan"}
                  >
                    {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : fs.is_active ? <Ban className="h-3.5 w-3.5" />
                      : <Play className="h-3.5 w-3.5" />
                    }
                  </button>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors"
                    onClick={() => deleteSale(fs)}
                    disabled={isDeleting || isToggling}
                    title="Hapus"
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-destructive" />
              {editSale ? "Edit Flash Sale" : "Buat Flash Sale Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Product */}
            <div>
              <Label>Produk</Label>
              <Select value={form.menu_item_id} onValueChange={v => setForm(f => ({ ...f, menu_item_id: v, flash_price: 0 }))} disabled={!!editSale}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih produk…" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {menuItems.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} — {formatIDR(m.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.menu_item_id && menuItems.find(m => m.id === form.menu_item_id) && (
                <p className="mt-1 text-xs text-muted-foreground">Harga normal: <strong>{formatIDR(menuItems.find(m => m.id === form.menu_item_id)!.price)}</strong></p>
              )}
            </div>

            {/* Price / Discount toggle */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Label>Harga Flash Sale</Label>
                <div className="ml-auto flex rounded-lg border border-border overflow-hidden text-xs">
                  <button className={`px-2.5 py-1 ${form.use_pct ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`} onClick={() => setForm(f => ({ ...f, use_pct: true }))}>% Diskon</button>
                  <button className={`px-2.5 py-1 ${!form.use_pct ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`} onClick={() => setForm(f => ({ ...f, use_pct: false }))}>Harga</button>
                </div>
              </div>
              {form.use_pct ? (
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={99} value={form.discount_pct} onChange={e => setForm(f => ({ ...f, discount_pct: Number(e.target.value) }))} className="flex-1" placeholder="Contoh: 30" />
                  <span className="text-sm font-medium">%</span>
                </div>
              ) : (
                <Input type="number" min={0} value={form.flash_price} onChange={e => setForm(f => ({ ...f, flash_price: Number(e.target.value) }))} placeholder="Contoh: 45000" />
              )}
              {form.menu_item_id && (() => {
                const fp = getEffectiveFlashPrice();
                const base = menuItems.find(m => m.id === form.menu_item_id)?.price ?? 0;
                const pct = base > 0 ? Math.round((1 - fp / base) * 100) : 0;
                return fp > 0 && fp < base ? (
                  <p className="mt-1 text-xs text-destructive font-medium">
                    Harga flash: <strong>{formatIDR(fp)}</strong> — hemat {pct}% dari harga normal
                  </p>
                ) : fp >= base && fp > 0 ? (
                  <p className="mt-1 text-xs text-amber-600">Harga flash harus lebih kecil dari harga normal</p>
                ) : null;
              })()}
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mulai</Label>
                <div className="mt-1"><DateTimePicker value={form.starts_at} onChange={(v) => setForm(f => ({ ...f, starts_at: v }))} placeholder="Pilih mulai" /></div>
              </div>
              <div>
                <Label>Selesai</Label>
                <div className="mt-1"><DateTimePicker value={form.ends_at} onChange={(v) => setForm(f => ({ ...f, ends_at: v }))} placeholder="Pilih selesai" /></div>
              </div>
            </div>

            {/* Duration hint */}
            {form.starts_at && form.ends_at && (() => {
              const diff = new Date(form.ends_at).getTime() - new Date(form.starts_at).getTime();
              if (diff <= 0) return <p className="text-xs text-destructive">Waktu selesai harus setelah waktu mulai</p>;
              const h = Math.floor(diff / 3_600_000);
              const m = Math.floor((diff % 3_600_000) / 60_000);
              return <p className="text-xs text-muted-foreground">Durasi: <strong>{h > 0 ? `${h} jam ` : ""}{m > 0 ? `${m} menit` : ""}</strong></p>;
            })()}

            {/* Stock limit */}
            <div>
              <Label>Batas Stok Flash Sale <span className="text-muted-foreground">(opsional)</span></Label>
              <Input type="number" className="mt-1" min={1} value={form.stock_limit} onChange={e => setForm(f => ({ ...f, stock_limit: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="Kosong = stok tidak dibatasi" />
              <p className="mt-1 text-xs text-muted-foreground">Flash sale otomatis berakhir jika stok habis terjual</p>
            </div>

            {/* Preview */}
            {form.menu_item_id && getEffectiveFlashPrice() > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 flex items-center gap-3">
                <Zap className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">Preview di marketplace:</p>
                  <p className="text-sm font-bold text-destructive">{formatIDR(getEffectiveFlashPrice())} <span className="line-through text-xs text-muted-foreground font-normal">{formatIDR(menuItems.find(m => m.id === form.menu_item_id)?.price ?? 0)}</span></p>
                  <p className="text-xs text-muted-foreground">Tampil dengan badge diskon & countdown timer</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button className="bg-destructive hover:bg-destructive/90 text-white" onClick={save} disabled={saving || !form.menu_item_id}>
              {saving ? "Menyimpan…" : editSale ? "Simpan Perubahan" : "Buat Flash Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
