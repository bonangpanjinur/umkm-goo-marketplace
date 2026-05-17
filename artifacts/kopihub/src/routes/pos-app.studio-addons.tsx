import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Sparkles, Plus, Pencil, Loader2, Trash2, Eye, EyeOff,
  ImageIcon, BookOpen, Wand2, Film, Check, Info,
  GripVertical, ChevronDown, ChevronUp, ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/studio-addons")({
  head: () => ({ meta: [{ title: "Add-on Sesi Foto" }] }),
  component: StudioAddonsPage,
});

type BookingAddon = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const SQL_HINT = `-- M-17: Tabel add-on booking (jalankan jika belum ada)
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

type PresetCategory = {
  label: string;
  icon: React.ElementType;
  color: string;
  presets: { name: string; description: string; price: number }[];
};

const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: "Editing & Retouching",
    icon: Wand2,
    color: "purple",
    presets: [
      { name: "Editing Ekstra (10 Foto)", description: "Color grading + retouching mendalam per 10 foto tambahan", price: 150000 },
      { name: "Retouch Wajah Premium", description: "Skin smoothing, blemish removal, dan penyempurnaan detail wajah per foto", price: 75000 },
      { name: "Background Replacement", description: "Ganti background foto dengan pilihan backdrop digital premium", price: 50000 },
      { name: "Composite / Manipulasi Foto", description: "Penggabungan elemen kreatif & efek artistik (per foto)", price: 200000 },
    ],
  },
  {
    label: "Produk Cetak",
    icon: BookOpen,
    color: "amber",
    presets: [
      { name: "Album Cetak A4 (20 Halaman)", description: "Album foto hardcover A4 berkualitas tinggi, 20 halaman — dikirim ke lokasi", price: 450000 },
      { name: "Album Cetak A3 (20 Halaman)", description: "Album foto hardcover A3 premium, 20 halaman — dikirim ke lokasi", price: 650000 },
      { name: "Photobook Softcover A5", description: "Photobook tipis & ringkas — cocok untuk kenang-kenangan", price: 250000 },
      { name: "Canvas Print 30×40 cm", description: "Cetak di kanvas berkualitas galeri, siap pasang di dinding", price: 350000 },
      { name: "Foto Cetak 4R (10 lembar)", description: "Cetak foto 4R glossy atau matte pilihan, 10 lembar", price: 80000 },
    ],
  },
  {
    label: "Layanan Tambahan",
    icon: Sparkles,
    color: "rose",
    presets: [
      { name: "Sesi Make-up Artist", description: "Make-up profesional sebelum sesi foto oleh MUA rekanan studio", price: 300000 },
      { name: "Extra Model / Talent", description: "Tambah model profesional untuk sesi foto produk atau konsep kreatif", price: 500000 },
      { name: "Tambah Lokasi (Outdoor)", description: "Perpanjang sesi dengan 1 lokasi outdoor tambahan di area studio", price: 200000 },
      { name: "Rush Delivery (24 Jam)", description: "Hasil foto dikirim dalam 24 jam setelah sesi (biasanya 3–5 hari kerja)", price: 250000 },
    ],
  },
  {
    label: "Video & Multimedia",
    icon: Film,
    color: "blue",
    presets: [
      { name: "Video Recap 60 Detik", description: "Short video highlights sesi foto, siap upload ke Instagram/TikTok", price: 350000 },
      { name: "Video Behind-the-Scenes", description: "Rekaman proses sesi foto — kenangan autentik untuk klien", price: 200000 },
      { name: "Reel Foto Slideshow", description: "Slideshow animasi dari foto-foto terbaik, format landscape & portrait", price: 150000 },
    ],
  },
];

const COLOR_STYLE: Record<string, { badge: string; border: string; icon: string }> = {
  purple: { badge: "bg-purple-100 text-purple-700", border: "border-purple-200 bg-purple-50/40", icon: "text-purple-600" },
  amber:  { badge: "bg-amber-100 text-amber-700",   border: "border-amber-200 bg-amber-50/40",   icon: "text-amber-600"  },
  rose:   { badge: "bg-rose-100 text-rose-700",     border: "border-rose-200 bg-rose-50/40",     icon: "text-rose-600"   },
  blue:   { badge: "bg-blue-100 text-blue-700",     border: "border-blue-200 bg-blue-50/40",     icon: "text-blue-600"   },
};

const EMPTY_FORM = { name: "", description: "", price: "0", sort_order: "0" };

export default function StudioAddonsPage() {
  const { shop } = useCurrentShop();
  const [addons, setAddons] = useState<BookingAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<BookingAddon | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedPreset, setExpandedPreset] = useState<string | null>("Editing & Retouching");
  const [addingPreset, setAddingPreset] = useState<string | null>(null);
  const [addonUsageCounts, setAddonUsageCounts] = useState<Record<string, number>>({});

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("booking_addons")
        .select("*")
        .eq("shop_id", shopId)
        .order("sort_order")
        .order("created_at");
      if (error?.code === "42P01") {
        setShowSql(true);
        setAddons([]);
        return;
      }
      setAddons((data ?? []) as BookingAddon[]);

      // Load usage counts from bookings
      const { data: bookingsData } = await (supabase as any)
        .from("bookings")
        .select("addon_ids")
        .eq("booking_slots.shop_id", shopId)
        .not("addon_ids", "is", null);

      if (bookingsData) {
        const counts: Record<string, number> = {};
        for (const booking of bookingsData as any[]) {
          const ids: string[] = booking.addon_ids ?? [];
          for (const id of ids) {
            counts[id] = (counts[id] ?? 0) + 1;
          }
        }
        setAddonUsageCounts(counts);
      }
    } catch {
      setAddons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shop?.id) load(shop.id);
  }, [shop?.id, load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sort_order: String(addons.length) });
    setOpen(true);
  };

  const openEdit = (addon: BookingAddon) => {
    setEditing(addon);
    setForm({
      name: addon.name,
      description: addon.description ?? "",
      price: String(addon.price),
      sort_order: String(addon.sort_order),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop?.id) return;
    if (!form.name.trim()) { toast.error("Nama add-on wajib diisi"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await (supabase as any).from("booking_addons").update(payload).eq("id", editing.id)
      : await (supabase as any).from("booking_addons").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Add-on diperbarui" : "Add-on berhasil ditambahkan");
    setOpen(false);
    load(shop.id);
  };

  const toggle = async (addon: BookingAddon) => {
    if (!shop?.id) return;
    await (supabase as any).from("booking_addons").update({ is_active: !addon.is_active }).eq("id", addon.id);
    toast.success(addon.is_active ? "Add-on disembunyikan dari booking" : "Add-on diaktifkan");
    load(shop.id);
  };

  const del = async (addon: BookingAddon) => {
    if (!shop?.id) return;
    if (!confirm(`Hapus add-on "${addon.name}"?`)) return;
    await (supabase as any).from("booking_addons").delete().eq("id", addon.id);
    toast.success("Add-on dihapus");
    load(shop.id);
  };

  const addPreset = async (preset: { name: string; description: string; price: number }) => {
    if (!shop?.id) return;
    const key = preset.name;
    if (addons.some(a => a.name === preset.name)) {
      toast.info(`"${preset.name}" sudah ada di daftar add-on kamu`);
      return;
    }
    setAddingPreset(key);
    const { error } = await (supabase as any).from("booking_addons").insert({
      shop_id: shop.id,
      name: preset.name,
      description: preset.description,
      price: preset.price,
      sort_order: addons.length,
    });
    setAddingPreset(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`"${preset.name}" ditambahkan sebagai add-on`);
    load(shop.id);
  };

  const activeAddons = addons.filter(a => a.is_active);
  const inactiveAddons = addons.filter(a => !a.is_active);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-rose-500" />
            Add-on Sesi Foto
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Layanan tambahan yang bisa dipilih klien langsung saat booking — editing ekstra, album cetak, video recap, dan lainnya.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Tambah Add-on
        </Button>
      </div>

      {/* ── SQL Fallback ── */}
      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Info className="h-4 w-4" /> Tabel add-on belum dibuat di database
          </p>
          <p className="text-sm text-amber-700">Jalankan SQL berikut di Supabase SQL Editor untuk mengaktifkan fitur ini:</p>
          <pre className="text-xs bg-white dark:bg-card border border-amber-200 rounded p-3 overflow-x-auto text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
            {SQL_HINT}
          </pre>
        </div>
      )}

      {/* ── How It Works ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" /> Cara Kerja Add-on
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0 mt-0.5">1</span>
            <span>Tambahkan add-on yang tersedia di studio kamu di halaman ini</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0 mt-0.5">2</span>
            <span>Klien bisa memilih add-on langsung di wizard booking online</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0 mt-0.5">3</span>
            <span>Total harga (termasuk add-on) dihitung otomatis & tersimpan di detail booking</span>
          </div>
        </div>
      </div>

      {/* ── Preset Add-ons ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Template Add-on Populer</h2>
          <p className="text-xs text-muted-foreground">Klik untuk langsung menambahkan ke daftar kamu</p>
        </div>

        {PRESET_CATEGORIES.map((cat) => {
          const isExpanded = expandedPreset === cat.label;
          const styles = COLOR_STYLE[cat.color];
          const Icon = cat.icon;
          return (
            <div key={cat.label} className={`rounded-xl border ${styles.border} overflow-hidden`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpandedPreset(isExpanded ? null : cat.label)}
              >
                <span className={`flex items-center gap-2 text-sm font-semibold ${styles.icon}`}>
                  <Icon className="h-4 w-4" />
                  {cat.label}
                  <Badge className={`text-[10px] py-0 ${styles.badge}`}>{cat.presets.length} template</Badge>
                </span>
                {isExpanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 grid sm:grid-cols-2 gap-2">
                  {cat.presets.map((preset) => {
                    const alreadyAdded = addons.some(a => a.name === preset.name);
                    const isAdding = addingPreset === preset.name;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => addPreset(preset)}
                        disabled={alreadyAdded || isAdding}
                        className={`text-left rounded-lg border px-3 py-2.5 transition-all flex items-start gap-2 ${
                          alreadyAdded
                            ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 cursor-default"
                            : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${alreadyAdded ? "text-emerald-700" : ""}`}>
                            {preset.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preset.description}</p>
                          <p className="text-xs font-semibold mt-1 text-foreground">
                            {preset.price === 0 ? "Gratis" : `+${formatIDR(preset.price)}`}
                          </p>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : alreadyAdded ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Your Add-ons ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add-on Kamu</h2>
          {addons.length > 0 && (
            <p className="text-xs text-muted-foreground">{activeAddons.length} aktif · {inactiveAddons.length} tersembunyi</p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : addons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada add-on</p>
            <p className="text-xs text-muted-foreground mt-1">Gunakan template di atas atau tambah add-on manual</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Active add-ons */}
            {activeAddons.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                usageCount={addonUsageCounts[addon.id] ?? 0}
                onEdit={() => openEdit(addon)}
                onToggle={() => toggle(addon)}
                onDelete={() => del(addon)}
              />
            ))}

            {/* Hidden add-ons */}
            {inactiveAddons.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground font-medium px-1">Tersembunyi (tidak tampil di booking)</p>
                {inactiveAddons.map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    usageCount={addonUsageCounts[addon.id] ?? 0}
                    onEdit={() => openEdit(addon)}
                    onToggle={() => toggle(addon)}
                    onDelete={() => del(addon)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Customer Preview ── */}
      {activeAddons.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" /> Preview Tampilan Pelanggan
          </h2>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Layanan Tambahan (Add-on)
              <span className="text-xs font-normal text-muted-foreground">(bisa pilih lebih dari satu)</span>
            </p>
            <div className="space-y-2">
              {activeAddons.slice(0, 4).map((addon) => (
                <div
                  key={addon.id}
                  className="rounded-xl border border-border px-4 py-3 flex items-center gap-3"
                >
                  <div className="h-5 w-5 rounded border-2 border-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{addon.name}</p>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold shrink-0 text-muted-foreground">
                    {addon.price > 0 ? `+${formatIDR(addon.price)}` : "Gratis"}
                  </p>
                </div>
              ))}
              {activeAddons.length > 4 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{activeAddons.length - 4} add-on lainnya tersedia saat booking
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Create Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Add-on" : "Tambah Add-on Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Add-on <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="cth: Editing Ekstra 10 Foto"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi <span className="text-muted-foreground font-normal text-xs">(opsional)</span></Label>
              <Textarea
                placeholder="Jelaskan apa yang didapat klien dengan memilih add-on ini"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="resize-none"
                maxLength={300}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Harga (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Isi 0 untuk gratis</p>
              </div>
              <div className="space-y-1.5">
                <Label>Urutan Tampil</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Angka kecil = tampil dulu</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddonCard({
  addon,
  usageCount,
  onEdit,
  onToggle,
  onDelete,
}: {
  addon: BookingAddon;
  usageCount: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-all ${
        addon.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-70"
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{addon.name}</p>
          {!addon.is_active && (
            <Badge variant="secondary" className="text-[10px] py-0">Tersembunyi</Badge>
          )}
          {usageCount > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0 bg-emerald-100 text-emerald-700">
              {usageCount}× dipilih
            </Badge>
          )}
        </div>
        {addon.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{addon.description}</p>
        )}
        <p className="text-xs font-semibold mt-1">
          {addon.price === 0
            ? <span className="text-emerald-600">Gratis</span>
            : <span className="text-foreground">+{formatIDR(addon.price)}</span>
          }
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={addon.is_active ? "Sembunyikan" : "Aktifkan"}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {addon.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Hapus"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
