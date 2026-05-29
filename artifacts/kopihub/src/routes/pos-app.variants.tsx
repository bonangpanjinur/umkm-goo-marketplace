import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/variants")({
  head: () => ({ meta: [{ title: "Varian Produk — Merchant" }] }),
  component: VariantsPage,
});

type MenuItem = { id: string; name: string; price: number; image_url: string | null; category_name?: string };
type Variant = {
  id: string;
  menu_item_id: string;
  shop_id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number | null;
  is_available: boolean;
  sort_order: number;
};

const NO_ITEM = "__none__";

function VariantsPage() {
  const { shop, loading: shopLoading } = useCurrentShop();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [variantsByItem, setVariantsByItem] = useState<Record<string, Variant[]>>({});
  const [loading, setLoading] = useState(true);
const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [filterItem, setFilterItem] = useState<string>("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [dialogItemId, setDialogItemId] = useState<string>(NO_ITEM);
  const [varName, setVarName] = useState("");
  const [varSku, setVarSku] = useState("");
  const [varPrice, setVarPrice] = useState<string>("");
  const [varStock, setVarStock] = useState<string>("");
  const [varAvailable, setVarAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchVariants = async (shopId: string) => {
    return await supabase
      .from("menu_item_variants" as any)
      .select("id, menu_item_id, shop_id, name, sku, price, stock, is_available, sort_order")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true });
  };

  const load = async () => {
    if (!shop) return;
    setLoading(true);

    // First load menu items
    const { data: menuData } = await supabase
      .from("menu_items")
      .select("id, name, price, image_url")
      .eq("shop_id", shop.id)
      .order("name");
    setItems((menuData as MenuItem[]) ?? []);

    // Try to load variants — auto-reload schema cache on PGRST205 then retry
    let { data: varData, error } = await fetchVariants(shop.id);

    if (error) {
      const code = (error as any).code;
      const msg = error.message.toLowerCase();
      const isSchemaCacheMiss =
        code === "PGRST205" ||
        msg.includes("schema cache") ||
        msg.includes("could not find the table");

      if (isSchemaCacheMiss) {
        // Auto reload PostgREST schema cache & retry once
        await supabase.rpc("reload_postgrest_schema" as any);
        await new Promise(r => setTimeout(r, 800));
        const retry = await fetchVariants(shop.id);
        varData = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("could not find the table")) {
} else {
        toast.error(error.message);
}
    } else {
const map: Record<string, Variant[]> = {};
      ((varData ?? []) as unknown as Variant[]).forEach(v => {
        if (!map[v.menu_item_id]) map[v.menu_item_id] = [];
        map[v.menu_item_id].push(v);
      });
      setVariantsByItem(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (shop) load(); }, [shop?.id]);

  function openNew(itemId?: string) {
    setEditing(null);
    setDialogItemId(itemId ?? NO_ITEM);
    setVarName("");
    setVarSku("");
    setVarPrice(itemId ? String(items.find(i => i.id === itemId)?.price ?? "") : "");
    setVarStock("");
    setVarAvailable(true);
    setDialogOpen(true);
  }

  function openEdit(v: Variant) {
    setEditing(v);
    setDialogItemId(v.menu_item_id);
    setVarName(v.name);
    setVarSku(v.sku ?? "");
    setVarPrice(String(v.price));
    setVarStock(v.stock != null ? String(v.stock) : "");
    setVarAvailable(v.is_available);
    setDialogOpen(true);
  }

  async function save() {
    if (!shop || !varName.trim() || dialogItemId === NO_ITEM) return;
    const priceNum = Number(varPrice);
    if (isNaN(priceNum) || priceNum < 0) { toast.error("Harga tidak valid"); return; }
    setSaving(true);

    const existingCount = variantsByItem[dialogItemId]?.length ?? 0;
    const payload = {
      shop_id: shop.id,
      menu_item_id: dialogItemId,
      name: varName.trim(),
      sku: varSku.trim() || null,
      price: priceNum,
      stock: varStock.trim() === "" ? null : Number(varStock),
      is_available: varAvailable,
      sort_order: editing ? editing.sort_order : existingCount,
    };

    let err;
    if (editing) {
      ({ error: err } = await supabase.from("menu_item_variants" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("menu_item_variants" as any).insert(payload));
    }

    if (err) {
      toast.error(err.message);
    } else {
      toast.success(editing ? "Varian diperbarui" : "Varian ditambahkan");
      setDialogOpen(false);
      load();
    }
    setSaving(false);
  }

  async function remove(v: Variant) {
    if (!confirm(`Hapus varian "${v.name}"?`)) return;
    const { error } = await supabase.from("menu_item_variants" as any).delete().eq("id", v.id);
    if (error) toast.error(error.message);
    else { toast.success("Varian dihapus"); load(); }
  }

  const filteredItems = filterItem === "all"
    ? items
    : items.filter(i => i.id === filterItem);

  if (shopLoading || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Table missing — show migration instructions

  const totalVariants = Object.values(variantsByItem).reduce((s, arr) => s + arr.length, 0);
  const itemsWithVariants = Object.keys(variantsByItem).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Varian Produk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola ukuran, warna, atau varian lain per produk. Setiap varian punya harga dan stok sendiri.
          </p>
        </div>
        <Button onClick={() => openNew()} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Varian
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Produk", value: items.length },
          { label: "Produk Dengan Varian", value: itemsWithVariants },
          { label: "Total Varian", value: totalVariants },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterItem} onValueChange={setFilterItem}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter produk..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua produk</SelectItem>
            {items.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filteredItems.length} produk</p>
      </div>

      {/* Product list with variants */}
      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Belum ada produk. Tambahkan dulu dari halaman Menu.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const variants = variantsByItem[item.id] ?? [];
            const isOpen = expandedItem === item.id || filterItem === item.id;
            return (
              <Card key={item.id} className="overflow-hidden">
                {/* Product row */}
                <button
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
                  onClick={() => setExpandedItem(isOpen && filterItem === "all" ? null : item.id)}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Harga dasar {formatIDR(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 mr-1">
                    <Badge variant={variants.length > 0 ? "default" : "secondary"} className="text-xs">
                      {variants.length} varian
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={e => { e.stopPropagation(); openNew(item.id); }}
                    >
                      <Plus className="h-3 w-3" /> Tambah
                    </Button>
                    {filterItem === "all" && (
                      isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Variants list */}
                {isOpen && (
                  <div className="border-t border-border bg-muted/20">
                    {variants.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground italic">
                        Belum ada varian. Klik "+ Tambah" untuk mulai.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {variants.map(v => (
                          <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 text-sm">
                              <div>
                                <p className="font-medium truncate">{v.name}</p>
                                {v.sku && <p className="text-xs text-muted-foreground font-mono">SKU: {v.sku}</p>}
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-primary">{formatIDR(v.price)}</p>
                              </div>
                              <div className="text-right">
                                {v.stock != null ? (
                                  <p className={`font-medium ${v.stock <= 5 ? "text-destructive" : "text-foreground"}`}>
                                    Stok: {v.stock}
                                  </p>
                                ) : (
                                  <p className="text-muted-foreground text-xs">Stok: ∞</p>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.is_available ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                  {v.is_available ? "Aktif" : "Off"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(v)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => remove(v)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Varian" : "Varian Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="v-item">Produk *</Label>
              <Select value={dialogItemId} onValueChange={setDialogItemId} disabled={!!editing}>
                <SelectTrigger id="v-item" className="mt-1.5">
                  <SelectValue placeholder="Pilih produk..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name} — {formatIDR(i.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="v-name">Nama Varian *</Label>
                <Input id="v-name" className="mt-1.5" value={varName}
                  onChange={e => setVarName(e.target.value)}
                  placeholder="mis. Ukuran L, Warna Merah" />
              </div>
              <div>
                <Label htmlFor="v-sku">SKU <span className="text-muted-foreground">(opsional)</span></Label>
                <Input id="v-sku" className="mt-1.5 font-mono text-sm" value={varSku}
                  onChange={e => setVarSku(e.target.value)}
                  placeholder="mis. KP-L-RED" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="v-price">Harga (Rp) *</Label>
                <Input id="v-price" className="mt-1.5" type="number" min="0" value={varPrice}
                  onChange={e => setVarPrice(e.target.value)}
                  placeholder="0" />
              </div>
              <div>
                <Label htmlFor="v-stock">Stok <span className="text-muted-foreground">(kosong = ∞)</span></Label>
                <Input id="v-stock" className="mt-1.5" type="number" min="0" value={varStock}
                  onChange={e => setVarStock(e.target.value)}
                  placeholder="Kosong = tidak terbatas" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Tersedia untuk dijual</p>
                <p className="text-xs text-muted-foreground">Varian muncul di POS dan etalase</p>
              </div>
              <Switch checked={varAvailable} onCheckedChange={setVarAvailable} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={save} disabled={saving || !varName.trim() || dialogItemId === NO_ITEM}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Simpan" : "Tambah Varian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
