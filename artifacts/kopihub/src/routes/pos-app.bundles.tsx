import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Package,
  ImageIcon,
  X,
  GripVertical,
  Tag,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/bundles")({
  head: () => ({ meta: [{ title: "Paket Produk — Merchant" }] }),
  component: BundlesPage,
});

type SimpleMenuItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  item_type: string;
  category_id: string | null;
};

type BundleComponent = {
  component_id: string;
  quantity: number;
  component_name: string;
  component_price: number;
  component_image: string | null;
};

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  components: BundleComponent[];
};

function BundlesPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<SimpleMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Component picker state
  const [components, setComponents] = useState<Array<{ component_id: string; quantity: number }>>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);

    const [bundlesRes, menuRes] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, is_available")
        .eq("shop_id", shop.id)
        .eq("item_type", "bundle")
        .order("name"),
      supabase
        .from("menu_items")
        .select("id, name, price, image_url, item_type, category_id")
        .eq("shop_id", shop.id)
        .eq("item_type", "regular")
        .order("name"),
    ]);

    const bundleList = (bundlesRes.data ?? []) as Omit<Bundle, "components">[];
    setAllMenuItems((menuRes.data ?? []) as SimpleMenuItem[]);

    if (bundleList.length > 0) {
      const { data: compsData } = await supabase
        .from("bundle_items")
        .select(`
          bundle_id,
          component_id,
          quantity,
          menu_items!bundle_items_component_id_fkey ( name, price, image_url )
        `)
        .in("bundle_id", bundleList.map((b) => b.id));

      const compsByBundle: Record<string, BundleComponent[]> = {};
      for (const row of (compsData ?? []) as any[]) {
        const bc: BundleComponent = {
          component_id: row.component_id,
          quantity: row.quantity,
          component_name: row.menu_items?.name ?? "",
          component_price: row.menu_items?.price ?? 0,
          component_image: row.menu_items?.image_url ?? null,
        };
        if (!compsByBundle[row.bundle_id]) compsByBundle[row.bundle_id] = [];
        compsByBundle[row.bundle_id].push(bc);
      }

      setBundles(
        bundleList.map((b) => ({
          ...b,
          components: compsByBundle[b.id] ?? [],
        })),
      );
    } else {
      setBundles([]);
    }

    setLoading(false);
  }, [shop?.id]);

  useEffect(() => {
    if (shop?.id) load();
  }, [shop?.id, load]);

  function openNew() {
    setEditing(null);
    setName("");
    setDesc("");
    setPrice("");
    setAvailable(true);
    setImageUrl(null);
    setComponents([]);
    setOpen(true);
  }

  function openEdit(b: Bundle) {
    setEditing(b);
    setName(b.name);
    setDesc(b.description ?? "");
    setPrice(String(b.price));
    setAvailable(b.is_available);
    setImageUrl(b.image_url);
    setComponents(b.components.map((c) => ({ component_id: c.component_id, quantity: c.quantity })));
    setOpen(true);
  }

  async function save() {
    if (!shop || !name.trim()) {
      toast.error("Nama bundle wajib diisi");
      return;
    }
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Harga tidak valid");
      return;
    }
    if (components.length < 2) {
      toast.error("Bundle harus memiliki minimal 2 produk komponen");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        shop_id: shop.id,
        name: name.trim(),
        description: desc.trim() || null,
        price: priceNum,
        image_url: imageUrl,
        is_available: available,
        item_type: "bundle",
      };

      let bundleId: string;

      if (editing) {
        const { error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        bundleId = editing.id;
      } else {
        const { data, error } = await supabase
          .from("menu_items")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        bundleId = data.id;
      }

      // Upsert bundle components: delete then re-insert
      await supabase.from("bundle_items").delete().eq("bundle_id", bundleId);
      const rows = components.map((c) => ({
        bundle_id: bundleId,
        component_id: c.component_id,
        quantity: c.quantity,
      }));
      const { error: compErr } = await supabase.from("bundle_items").insert(rows);
      if (compErr) throw compErr;

      toast.success(editing ? "Bundle diperbarui" : "Bundle dibuat");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: Bundle) {
    if (!confirm(`Hapus bundle "${b.name}"?`)) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", b.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Bundle dihapus");
      load();
    }
  }

  function addComponent(item: SimpleMenuItem) {
    const exists = components.some((c) => c.component_id === item.id);
    if (exists) {
      toast.info(`${item.name} sudah ada di bundle`);
      return;
    }
    setComponents((prev) => [...prev, { component_id: item.id, quantity: 1 }]);
    setPickerOpen(false);
    setPickerSearch("");
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.component_id !== id));
  }

  function updateComponentQty(id: string, qty: number) {
    setComponents((prev) =>
      prev.map((c) => (c.component_id === id ? { ...c, quantity: Math.max(1, qty) } : c)),
    );
  }

  // Resolve component details for the form
  const componentDetails = components.map((c) => {
    const item = allMenuItems.find((m) => m.id === c.component_id);
    return { ...c, name: item?.name ?? "?", price: item?.price ?? 0, image_url: item?.image_url ?? null };
  });

  const componentTotalValue = componentDetails.reduce((s, c) => s + c.price * c.quantity, 0);
  const priceNum = Number(price) || 0;
  const savings = componentTotalValue - priceNum;
  const savingsPct = componentTotalValue > 0 ? Math.round((savings / componentTotalValue) * 100) : 0;

  const filteredPicker = allMenuItems.filter(
    (m) =>
      m.name.toLowerCase().includes(pickerSearch.toLowerCase()) &&
      !components.some((c) => c.component_id === m.id),
  );

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Bundle / Paket Produk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gabungkan beberapa produk menjadi satu paket harga spesial. Stok tiap komponen berkurang otomatis saat bundle dipesan.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Buat Bundle
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada bundle</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Buat paket seperti "Produk A + Produk B = harga spesial"
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Buat Bundle Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bundles.map((b) => {
            const totalValue = b.components.reduce((s, c) => s + c.component_price * c.quantity, 0);
            const pctOff = totalValue > 0 ? Math.round(((totalValue - b.price) / totalValue) * 100) : 0;
            return (
              <div
                key={b.id}
                className="flex flex-col rounded-xl border bg-card overflow-hidden hover:border-primary/40 transition-colors"
              >
                {/* Image */}
                <div className="relative aspect-video bg-muted">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2">PAKET</Badge>
                    {pctOff > 0 && (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-2">
                        Hemat {pctOff}%
                      </Badge>
                    )}
                    {!b.is_available && (
                      <Badge variant="secondary" className="text-[10px] px-2">Non-aktif</Badge>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-tight">{b.name}</p>
                      <p className="mt-0.5 text-lg font-bold text-primary">{formatIDR(b.price)}</p>
                      {totalValue > b.price && (
                        <p className="text-xs text-muted-foreground line-through">{formatIDR(totalValue)}</p>
                      )}
                    </div>
                  </div>

                  {/* Components */}
                  <div className="space-y-1">
                    {b.components.map((c) => (
                      <div key={c.component_id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 text-[10px] font-bold">
                          ×{c.quantity}
                        </span>
                        <span className="truncate">{c.component_name}</span>
                        <span className="ml-auto shrink-0">{formatIDR(c.component_price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(b)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bundle" : "Buat Bundle Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nama Bundle</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mis. Paket Hemat Pagi"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Deskripsi (opsional)</Label>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Paket favoritmu…"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Paket (Rp)</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                />
                {componentTotalValue > 0 && priceNum > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {savings > 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-600 font-medium">
                          Hemat {formatIDR(savings)} ({savingsPct}%) dari total komponen
                        </span>
                      </>
                    ) : savings < 0 ? (
                      <span className="text-destructive">Harga bundle lebih mahal dari total komponen</span>
                    ) : (
                      <span className="text-muted-foreground">Sama dengan total komponen (tidak ada diskon)</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={available} onCheckedChange={setAvailable} id="bundle-avail" />
                <Label htmlFor="bundle-avail">Tersedia di POS</Label>
              </div>
            </div>

            {/* Components */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Komponen Bundle</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setPickerOpen(true); setPickerSearch(""); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Produk
                </Button>
              </div>

              {components.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-center">
                  <div>
                    <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Belum ada komponen. Tambah minimal 2 produk.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {componentDetails.map((c) => (
                    <div
                      key={c.component_id}
                      className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded overflow-hidden bg-muted">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{formatIDR(c.price)} / pcs</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateComponentQty(c.component_id, c.quantity - 1)}
                        >
                          <span className="text-sm font-bold">-</span>
                        </Button>
                        <span className="w-5 text-center text-sm font-semibold">{c.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateComponentQty(c.component_id, c.quantity + 1)}
                        >
                          <span className="text-sm font-bold">+</span>
                        </Button>
                      </div>
                      <span className="text-xs font-medium shrink-0 w-20 text-right">
                        {formatIDR(c.price * c.quantity)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeComponent(c.component_id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {/* Subtotal */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Total nilai komponen</span>
                    <span className="font-semibold">{formatIDR(componentTotalValue)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Simpan Perubahan" : "Buat Bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pilih Produk Komponen</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <Input
              placeholder="Cari produk..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              {filteredPicker.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada produk</p>
              ) : (
                <ul className="divide-y">
                  {filteredPicker.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 py-2.5 hover:bg-muted/50 transition-colors rounded"
                        onClick={() => addComponent(item)}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded overflow-hidden bg-muted">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatIDR(item.price)}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
