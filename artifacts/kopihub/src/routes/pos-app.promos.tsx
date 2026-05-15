import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Loader2, TicketPercent, Zap, RefreshCw, X, Bell, Users } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/promos")({
  component: PromosPage,
});

type Promo = {
  id: string;
  code: string;
  description: string | null;
  type: "percent" | "nominal";
  value: number;
  min_order: number;
  max_discount: number | null;
  channel: "pos" | "online" | "all";
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

type FlashItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  flash_price: number | null;
  flash_starts_at: string | null;
  flash_ends_at: string | null;
  is_available: boolean;
};

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Min 2 karakter")
    .max(32)
    .regex(/^[A-Z0-9_-]+$/i, "Hanya huruf/angka/_/-"),
  description: z.string().max(200).optional().nullable(),
  type: z.enum(["percent", "nominal"]),
  value: z.coerce.number().min(0),
  min_order: z.coerce.number().min(0),
  max_discount: z.coerce.number().min(0).optional().nullable(),
  channel: z.enum(["pos", "online", "all"]),
  usage_limit: z.coerce.number().int().min(0).optional().nullable(),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean(),
});

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function isFlashActive(item: FlashItem) {
  if (item.flash_price == null) return false;
  const now = Date.now();
  const start = item.flash_starts_at ? new Date(item.flash_starts_at).getTime() : 0;
  const end = item.flash_ends_at ? new Date(item.flash_ends_at).getTime() : Infinity;
  return now >= start && now <= end;
}

function PromosPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tab, setTab] = useState<"voucher" | "flash">("voucher");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [flashItems, setFlashItems] = useState<FlashItem[]>([]);
  const [allProducts, setAllProducts] = useState<FlashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [flashDialog, setFlashDialog] = useState<FlashItem | null>(null);

  async function load() {
    if (!shop) return;
    setLoading(true);
    const [promosRes, itemsRes] = await Promise.all([
      supabase.from("promos").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      supabase.from("menu_items").select("id, name, price, image_url, flash_price, flash_starts_at, flash_ends_at, is_available").eq("shop_id", shop.id).order("name"),
    ]);
    setPromos((promosRes.data ?? []) as Promo[]);
    const items = (itemsRes.data ?? []) as FlashItem[];
    setAllProducts(items);
    setFlashItems(items.filter(i => i.flash_price != null));
    setLoading(false);
  }

  useEffect(() => {
    if (!shopLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, shopLoading]);

  async function toggleActive(p: Promo) {
    const { error } = await supabase.from("promos").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setPromos((xs) => xs.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
  }

  async function remove(p: Promo) {
    if (!confirm(`Hapus promo ${p.code}?`)) return;
    const { error } = await supabase.from("promos").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setPromos((xs) => xs.filter((x) => x.id !== p.id));
    toast.success("Promo dihapus");
  }

  async function clearFlash(item: FlashItem) {
    if (!confirm(`Hapus flash sale dari "${item.name}"?`)) return;
    const { error } = await supabase.from("menu_items").update({
      flash_price: null, flash_starts_at: null, flash_ends_at: null,
    }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Flash sale dihapus");
    load();
  }

  const activeFlash = flashItems.filter(isFlashActive);
  const scheduledFlash = flashItems.filter(i => {
    if (i.flash_starts_at && new Date(i.flash_starts_at).getTime() > Date.now()) return true;
    return false;
  });
  const expiredFlash = flashItems.filter(i => {
    if (i.flash_ends_at && new Date(i.flash_ends_at).getTime() < Date.now()) return true;
    return false;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Promo & Diskon</h1>
          <p className="text-sm text-muted-foreground">Kelola kode promo dan flash sale produkmu.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {tab === "voucher" ? (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> Tambah voucher
            </Button>
          ) : (
            <Button onClick={() => setFlashDialog(null as any)}>
              <Zap className="mr-1.5 h-4 w-4" /> Set Flash Sale
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
        <button
          onClick={() => setTab("voucher")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === "voucher" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <TicketPercent className="h-4 w-4" /> Kode Voucher
          <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">{promos.length}</span>
        </button>
        <button
          onClick={() => setTab("flash")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === "flash" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Zap className="h-4 w-4 text-amber-500" /> Flash Sale
          {activeFlash.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs text-amber-700 font-semibold">{activeFlash.length} aktif</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "voucher" ? (
        // ---- VOUCHER TAB ----
        promos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <TicketPercent className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada voucher. Buat kode pertamamu!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {promos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold">{p.code}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                      {p.type === "percent" ? `${p.value}%` : formatIDR(p.value)}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase">{p.channel}</span>
                    {!p.is_active && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">nonaktif</span>
                    )}
                    {p.expires_at && new Date(p.expires_at) < new Date() && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">expired</span>
                    )}
                  </div>
                  {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Min {formatIDR(p.min_order)} · Terpakai {p.usage_count}{p.usage_limit ? `/${p.usage_limit}` : ""}
                    {p.expires_at ? ` · Exp ${new Date(p.expires_at).toLocaleDateString("id-ID")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ---- FLASH SALE TAB ----
        <div className="space-y-6">
          {/* Summary chips */}
          <div className="flex gap-2 flex-wrap">
            {activeFlash.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeFlash.length} Sedang berlangsung
              </span>
            )}
            {scheduledFlash.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {scheduledFlash.length} Dijadwalkan
              </span>
            )}
            {expiredFlash.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {expiredFlash.length} Berakhir
              </span>
            )}
            {flashItems.length === 0 && (
              <span className="text-sm text-muted-foreground">Belum ada flash sale aktif</span>
            )}
          </div>

          {/* Flash items list */}
          {flashItems.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">
                Produk Flash Sale
              </div>
              <ul className="divide-y divide-border">
                {flashItems.map(item => {
                  const active = isFlashActive(item);
                  const scheduled = item.flash_starts_at && new Date(item.flash_starts_at) > new Date();
                  const expired = item.flash_ends_at && new Date(item.flash_ends_at) < new Date();
                  const disc = item.flash_price != null
                    ? Math.round(((item.price - item.flash_price) / item.price) * 100)
                    : 0;

                  return (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                      {item.image_url
                        ? <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" />
                        : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Zap className="h-4 w-4" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{item.name}</span>
                          {active && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE</span>}
                          {scheduled && <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">DIJADWAL</span>}
                          {expired && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">BERAKHIR</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="line-through">{formatIDR(item.price)}</span>
                          <span className="font-semibold text-emerald-700">{formatIDR(item.flash_price!)}</span>
                          <span className="rounded-full bg-red-100 px-1.5 text-red-700 font-semibold">-{disc}%</span>
                        </div>
                        {(item.flash_starts_at || item.flash_ends_at) && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {item.flash_starts_at && `Mulai ${new Date(item.flash_starts_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}`}
                            {item.flash_starts_at && item.flash_ends_at && " · "}
                            {item.flash_ends_at && `Selesai ${new Date(item.flash_ends_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setFlashDialog(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => clearFlash(item)} className="text-destructive hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Add flash sale to product */}
          <div className="rounded-xl border border-dashed border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Tambah Flash Sale ke Produk</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {allProducts
                .filter(p => p.flash_price == null)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFlashDialog(p)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-colors group"
                  >
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="h-8 w-8 rounded-md object-cover border border-border shrink-0" />
                      : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted"><Zap className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatIDR(p.price)}</p>
                    </div>
                  </button>
                ))
              }
              {allProducts.filter(p => p.flash_price == null).length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground">Semua produk sudah punya flash sale.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voucher dialog */}
      {open && shop && (
        <PromoDialog
          shopId={shop.id}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); load(); }}
        />
      )}

      {/* Flash sale dialog */}
      {flashDialog !== undefined && flashDialog !== null && (
        <FlashDialog
          item={flashDialog as FlashItem}
          shopId={shop!.id}
          onClose={() => setFlashDialog(undefined as any)}
          onSaved={() => { setFlashDialog(undefined as any); load(); }}
        />
      )}
      {flashDialog === null && tab === "flash" && (
        <FlashPickerDialog
          products={allProducts}
          onPick={(p) => setFlashDialog(p)}
          onClose={() => setFlashDialog(undefined as any)}
        />
      )}
    </div>
  );
}

function FlashPickerDialog({ products, onPick, onClose }: { products: FlashItem[]; onPick: (p: FlashItem) => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pilih Produk untuk Flash Sale</DialogTitle></DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-1 py-2">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 hover:bg-muted transition-colors text-left"
            >
              {p.image_url
                ? <img src={p.image_url} alt="" className="h-9 w-9 rounded-md object-cover border border-border shrink-0" />
                : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Zap className="h-4 w-4" /></div>
              }
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{formatIDR(p.price)}</p>
              </div>
              {p.flash_price != null && (
                <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Flash aktif</span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FlashDialog({ item, shopId, onClose, onSaved }: { item: FlashItem; shopId: string; onClose: () => void; onSaved: () => void }) {
  const [flashPrice, setFlashPrice] = useState(item.flash_price != null ? String(item.flash_price) : "");
  const [starts, setStarts] = useState(toLocalInput(item.flash_starts_at));
  const [ends, setEnds] = useState(toLocalInput(item.flash_ends_at));
  const [saving, setSaving] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("shop_follows" as any).select("id", { count: "exact", head: true }).eq("shop_id", shopId)
      .then(({ count }) => setFollowerCount(count ?? 0));
  }, [shopId]);

  const fpNum = flashPrice.trim() === "" ? null : Number(flashPrice);
  const disc = fpNum != null && item.price > 0 ? Math.round(((item.price - fpNum) / item.price) * 100) : null;

  async function save() {
    if (fpNum == null || fpNum <= 0) { toast.error("Masukkan harga flash sale"); return; }
    if (fpNum >= item.price) { toast.error("Harga flash harus lebih kecil dari harga normal"); return; }
    setSaving(true);
    const { error } = await supabase.from("menu_items").update({
      flash_price: fpNum,
      flash_starts_at: starts ? new Date(starts).toISOString() : null,
      flash_ends_at:   ends   ? new Date(ends).toISOString()   : null,
    }).eq("id", item.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Flash sale disimpan"); onSaved(); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Flash Sale · {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-muted p-3 text-sm">
            Harga normal: <span className="font-semibold">{formatIDR(item.price)}</span>
          </div>
          <div>
            <Label>Harga flash sale (Rp) *</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              value={flashPrice}
              onChange={e => setFlashPrice(e.target.value)}
              placeholder="cth: 25000"
            />
            {disc !== null && disc > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">Diskon {disc}% dari harga normal</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Mulai (opsional)</Label>
              <div className="mt-1"><DateTimePicker value={starts} onChange={setStarts} placeholder="Pilih mulai" /></div>
            </div>
            <div>
              <Label className="text-xs">Berakhir (opsional)</Label>
              <div className="mt-1"><DateTimePicker value={ends} onChange={setEnds} placeholder="Pilih berakhir" /></div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Jika tidak diisi, flash sale aktif tanpa batas waktu.</p>
          {item.flash_price == null && followerCount !== null && followerCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span>
                Notifikasi flash sale akan dikirim ke{" "}
                <span className="font-semibold">{followerCount} pengikut</span> toko ini.
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Flash Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromoDialog({ shopId, editing, onClose, onSaved }: { shopId: string; editing: Promo | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: editing?.code ?? "",
    description: editing?.description ?? "",
    type: (editing?.type ?? "percent") as "percent" | "nominal",
    value: String(editing?.value ?? 10),
    min_order: String(editing?.min_order ?? 0),
    max_discount: editing?.max_discount != null ? String(editing.max_discount) : "",
    channel: (editing?.channel ?? "all") as "pos" | "online" | "all",
    usage_limit: editing?.usage_limit != null ? String(editing.usage_limit) : "",
    starts_at: editing?.starts_at ? editing.starts_at.slice(0, 16) : "",
    expires_at: editing?.expires_at ? editing.expires_at.slice(0, 16) : "",
    is_active: editing?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("shop_follows" as any).select("id", { count: "exact", head: true }).eq("shop_id", shopId)
      .then(({ count }) => setFollowerCount(count ?? 0));
  }, [shopId]);

  const willNotifyFollowers =
    !editing &&
    form.is_active &&
    (form.channel === "online" || form.channel === "all") &&
    followerCount !== null &&
    followerCount > 0;

  async function save() {
    const parsed = schema.safeParse({
      ...form,
      max_discount: form.max_discount === "" ? null : form.max_discount,
      usage_limit: form.usage_limit === "" ? null : form.usage_limit,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      description: form.description || null,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const payload = {
      shop_id: shopId,
      code: parsed.data.code.toUpperCase(),
      description: parsed.data.description,
      type: parsed.data.type,
      value: parsed.data.value,
      min_order: parsed.data.min_order,
      max_discount: parsed.data.max_discount,
      channel: parsed.data.channel,
      usage_limit: parsed.data.usage_limit,
      starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
      expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at).toISOString() : null,
      is_active: parsed.data.is_active,
    };
    const { error } = editing
      ? await supabase.from("promos").update(payload).eq("id", editing.id)
      : await supabase.from("promos").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit voucher" : "Tambah voucher"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kode</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="HEMAT10" />
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as typeof form.channel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="pos">POS saja</SelectItem>
                  <SelectItem value="online">Online saja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Deskripsi (opsional)</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persen (%)</SelectItem>
                  <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nilai {form.type === "percent" ? "(0-100)" : "(Rp)"}</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min order (Rp)</Label>
              <Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Max diskon (Rp, opsional)</Label>
              <Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} placeholder="Tanpa batas" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Kuota</Label>
              <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <Label className="text-xs">Mulai</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Berakhir</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label className="text-sm">Aktif</Label>
          </div>
          {willNotifyFollowers && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span>
                Promo ini akan dinotifikasikan ke{" "}
                <span className="font-semibold">{followerCount} pengikut</span> toko secara otomatis.
              </span>
            </div>
          )}
          {!editing && form.is_active && (form.channel === "online" || form.channel === "all") && followerCount === 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Toko belum punya pengikut. Promo tetap bisa digunakan pelanggan via kode.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
