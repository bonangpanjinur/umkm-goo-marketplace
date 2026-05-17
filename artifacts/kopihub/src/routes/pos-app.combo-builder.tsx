import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Utensils, Plus, Pencil, Trash2, Loader2, RefreshCw,
  X, ChevronDown, ChevronUp, Tag, Package, ImageIcon,
  AlertTriangle, Percent, Zap,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/combo-builder")({
  head: () => ({ meta: [{ title: "Paket & Combo Builder" }] }),
  component: ComboBuilderPage,
});

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  item_type: string;
};

type ComboItem = {
  item_id: string;
  quantity: number;
  item_name: string;
  item_price: number;
};

type Combo = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  combo_price: number;
  original_price: number;
  discount_pct: number;
  is_active: boolean;
  tag: string | null;
  items: ComboItem[];
};

const SQL_HINT = `-- Jalankan di Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.fnb_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  combo_price numeric(12,2) NOT NULL,
  original_price numeric(12,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  tag text,
  items jsonb NOT NULL DEFAULT '[]',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

export default function ComboBuilderPage() {
  const { shop } = useCurrentShop();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", description: "", combo_price: "", tag: "", is_active: true,
    image_url: "",
  });
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [searchItem, setSearchItem] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const [combosRes, menuRes] = await Promise.all([
      (supabase as any).from("fnb_combos").select("*").eq("shop_id", shopId).order("sort_order").order("created_at"),
      (supabase as any).from("menu_items").select("id, name, price, image_url, item_type").eq("shop_id", shopId).eq("is_available", true).order("name"),
    ]);
    if (combosRes.error) {
      if (combosRes.error.message?.includes("exist")) setShowSql(true);
      else toast.error("Gagal memuat combo");
    }
    setCombos((combosRes.data ?? []) as Combo[]);
    setMenuItems((menuRes.data ?? []) as MenuItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (shop?.id) load(shop.id);
  }, [shop?.id, load]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", combo_price: "", tag: "", is_active: true, image_url: "" });
    setComboItems([]);
    setOpen(true);
  };

  const openEdit = (c: Combo) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? "",
      combo_price: String(c.combo_price),
      tag: c.tag ?? "",
      is_active: c.is_active,
      image_url: c.image_url ?? "",
    });
    setComboItems(c.items ?? []);
    setOpen(true);
  };

  const addItem = (item: MenuItem) => {
    const exists = comboItems.find(i => i.item_id === item.id);
    if (exists) {
      setComboItems(prev => prev.map(i => i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setComboItems(prev => [...prev, { item_id: item.id, quantity: 1, item_name: item.name, item_price: item.price }]);
    }
    setSearchItem("");
  };

  const removeItem = (itemId: string) => setComboItems(prev => prev.filter(i => i.item_id !== itemId));
  const changeQty = (itemId: string, qty: number) => {
    if (qty <= 0) { removeItem(itemId); return; }
    setComboItems(prev => prev.map(i => i.item_id === itemId ? { ...i, quantity: qty } : i));
  };

  const originalPrice = comboItems.reduce((s, i) => s + i.item_price * i.quantity, 0);
  const comboPrice = Number(form.combo_price) || 0;
  const discountPct = originalPrice > 0 ? Math.round(((originalPrice - comboPrice) / originalPrice) * 100) : 0;

  const save = async () => {
    if (!shop || !form.name.trim()) { toast.error("Nama combo wajib diisi"); return; }
    if (comboItems.length < 2) { toast.error("Combo harus minimal 2 item menu"); return; }
    if (comboPrice <= 0) { toast.error("Harga combo wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = {
        shop_id: shop.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        combo_price: comboPrice,
        original_price: originalPrice,
        discount_pct: discountPct,
        is_active: form.is_active,
        tag: form.tag.trim() || null,
        items: comboItems,
      };
      let error: unknown;
      if (editing) {
        ({ error } = await (supabase as any).from("fnb_combos").update(payload).eq("id", editing.id));
      } else {
        ({ error } = await (supabase as any).from("fnb_combos").insert(payload));
      }
      if (error) throw error;
      toast.success(editing ? "Combo diperbarui" : "Combo baru dibuat");
      setOpen(false);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    setDeleting(id);
    const { error } = await (supabase as any).from("fnb_combos").delete().eq("id", id);
    if (error) toast.error("Gagal hapus");
    else { toast.success("Combo dihapus"); load(shop!.id); }
    setDeleting(null);
  };

  const toggleActive = async (c: Combo) => {
    await (supabase as any).from("fnb_combos").update({ is_active: !c.is_active }).eq("id", c.id);
    setCombos(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
  };

  const filtered = menuItems.filter(m =>
    searchItem ? m.name.toLowerCase().includes(searchItem.toLowerCase()) : true
  );

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Utensils className="h-5 w-5 text-primary" />
            Paket & Combo Builder
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Buat paket hemat F&B — gabungkan beberapa menu dengan harga spesial.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Buat Paket
        </Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Tabel combo belum ada</p>
          <pre className="rounded bg-amber-100 p-2 text-xs font-mono overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : combos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Utensils className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada paket combo</p>
          <p className="text-sm mt-1">Buat paket hemat untuk meningkatkan nilai pesanan rata-rata.</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Buat Paket Pertama</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {combos.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {c.image_url && (
                <img src={c.image_url} alt={c.name} className="w-full h-32 object-cover" />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      {c.tag && <Badge variant="secondary" className="text-xs">{c.tag}</Badge>}
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>}
                  </div>
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-primary">{formatIDR(c.combo_price)}</span>
                  {c.original_price > c.combo_price && (
                    <>
                      <span className="text-sm text-muted-foreground line-through">{formatIDR(c.original_price)}</span>
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        <Percent className="h-2.5 w-2.5 mr-0.5" />{c.discount_pct}% OFF
                      </Badge>
                    </>
                  )}
                </div>

                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  {expandedId === c.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {(c.items ?? []).length} item dalam paket
                </button>

                {expandedId === c.id && (
                  <ul className="space-y-1 text-xs text-muted-foreground border-t border-border pt-2">
                    {(c.items ?? []).map(i => (
                      <li key={i.item_id} className="flex justify-between">
                        <span>{i.quantity}× {i.item_name}</span>
                        <span>{formatIDR(i.item_price * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(c)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" disabled={deleting === c.id} onClick={() => del(c.id)}>
                    {deleting === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editing ? "Edit Paket Combo" : "Buat Paket Combo Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Paket <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Paket Hemat Siang, Set Sarapan, dll." />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tag (opsional)</Label>
                <Input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="BESTSELLER, BARU, dll." />
              </div>
              <div className="space-y-1.5">
                <Label>Foto Combo (opsional)</Label>
                <UploadableImage
                  value={form.image_url || null}
                  onChange={(url) => setForm(f => ({ ...f, image_url: url ?? "" }))}
                  bucket="shop-images"
                  pathPrefix={`${shop?.id ?? ""}/combo`}
                  hint="Foto kombo/paket, JPG/PNG/WebP maks 5 MB"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Paket hemat untuk 1 orang..." />
            </div>

            {/* Item picker */}
            <div className="space-y-2">
              <Label>Item dalam Paket <span className="text-destructive">*</span> (min. 2)</Label>
              <Input
                placeholder="Cari menu..."
                value={searchItem}
                onChange={e => setSearchItem(e.target.value)}
                className="mb-1"
              />
              {searchItem && (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border">
                  {filtered.slice(0, 8).map(m => (
                    <button key={m.id} onClick={() => addItem(m)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left">
                      <span>{m.name}</span>
                      <span className="text-muted-foreground">{formatIDR(m.price)}</span>
                    </button>
                  ))}
                </div>
              )}
              {comboItems.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-border p-3">
                  {comboItems.map(ci => (
                    <div key={ci.item_id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{ci.item_name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => changeQty(ci.item_id, ci.quantity - 1)}
                          className="h-6 w-6 rounded border border-border flex items-center justify-center text-xs hover:bg-accent">−</button>
                        <span className="w-6 text-center text-xs font-medium">{ci.quantity}</span>
                        <button onClick={() => changeQty(ci.item_id, ci.quantity + 1)}
                          className="h-6 w-6 rounded border border-border flex items-center justify-center text-xs hover:bg-accent">+</button>
                      </div>
                      <span className="w-20 text-right text-xs text-muted-foreground">{formatIDR(ci.item_price * ci.quantity)}</span>
                      <button onClick={() => removeItem(ci.item_id)} className="text-destructive hover:opacity-70">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-border pt-1.5 text-sm flex justify-between text-muted-foreground">
                    <span>Total normal:</span>
                    <span>{formatIDR(originalPrice)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Harga Paket (Rp) <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} value={form.combo_price}
                onChange={e => setForm(f => ({ ...f, combo_price: e.target.value }))}
                placeholder="Harga spesial paket" />
              {comboPrice > 0 && originalPrice > 0 && (
                <p className="text-xs text-green-700">
                  <Zap className="inline h-3 w-3 mr-0.5" />
                  Hemat {formatIDR(originalPrice - comboPrice)} ({discountPct}%) dari harga normal
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Aktif (tampil di menu pelanggan)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              {editing ? "Simpan Perubahan" : "Buat Paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
