import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Layers, Plus, Trash2, Loader2, Pencil, PackageSearch, Tag } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/bulk-pricing")({
  head: () => ({ meta: [{ title: "Harga Grosir / Bulk — Merchant" }] }),
  component: BulkPricingPage,
});

type MenuItem = { id: string; name: string; price: number };
type BulkRule = {
  id: string;
  menu_item_id: string;
  min_qty: number;
  max_qty: number | null;
  price: number;
  label: string | null;
  sort_order: number;
};

const defaultForm = () => ({
  menu_item_id: "",
  min_qty: 1,
  max_qty: "" as number | "",
  price: 0,
  label: "",
});

function BulkPricingPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
const [menuItems, setMenuItems]     = useState<MenuItem[]>([]);
  const [rules, setRules]             = useState<BulkRule[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [showDialog, setShowDialog]   = useState(false);
  const [editRule, setEditRule]       = useState<BulkRule | null>(null);
  const [form, setForm]               = useState(defaultForm());
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);
  

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
await Promise.all([loadMenuItems(), loadRules()]);
    })();
  }, [shop?.id]);

  async function loadMenuItems() {
    if (!shop?.id) return;
    const { data } = await supabase
      .from("menu_items" as any)
      .select("id, name, price")
      .eq("shop_id" as any, shop.id)
      .eq("is_available" as any, true)
      .order("name" as any)
      .limit(200) as any;
    setMenuItems((data ?? []) as MenuItem[]);
  }

  async function loadRules() {
    if (!shop?.id) return;
    const { data, error } = await (supabase as any)
      .from("bulk_pricing_rules")
      .select("id, menu_item_id, min_qty, max_qty, price, label, sort_order")
      .eq("shop_id", shop.id)
      .order("menu_item_id")
      .order("min_qty");
    if (error) toast.error(error.message);
    setRules((data ?? []) as BulkRule[]);
    setLoading(false);
  }

  function openAdd(menuItemId?: string) {
    setEditRule(null);
    setForm({ ...defaultForm(), menu_item_id: menuItemId ?? "", price: menuItems.find(m => m.id === menuItemId)?.price ?? 0 });
    setShowDialog(true);
  }

  function openEdit(r: BulkRule) {
    setEditRule(r);
    setForm({
      menu_item_id: r.menu_item_id,
      min_qty: r.min_qty,
      max_qty: r.max_qty ?? "",
      price: r.price,
      label: r.label ?? "",
    });
    setShowDialog(true);
  }

  async function save() {
    if (!form.menu_item_id) { toast.error("Pilih produk."); return; }
    if (form.min_qty < 1) { toast.error("Minimum qty harus ≥ 1."); return; }
    if (form.price <= 0) { toast.error("Harga harus > 0."); return; }
    if (!shop?.id) return;
    setSaving(true);
    try {
      const existingRules = rules.filter(r => r.menu_item_id === form.menu_item_id && (!editRule || r.id !== editRule.id));
      const conflict = existingRules.find(r => {
        const rMax = r.max_qty ?? Infinity;
        const fMax = form.max_qty !== "" ? Number(form.max_qty) : Infinity;
        return form.min_qty <= rMax && Number(fMax) >= r.min_qty;
      });
      if (conflict) {
        toast.error(`Rentang qty bertabrakan dengan tier yang sudah ada (min: ${conflict.min_qty}${conflict.max_qty ? `–${conflict.max_qty}` : "+"})`);
        setSaving(false);
        return;
      }

      const payload = {
        menu_item_id: form.menu_item_id,
        shop_id: shop.id,
        min_qty: Number(form.min_qty),
        max_qty: form.max_qty !== "" ? Number(form.max_qty) : null,
        price: Number(form.price),
        label: form.label.trim() || null,
        sort_order: Number(form.min_qty),
      };
      if (editRule) {
        const { error } = await (supabase as any).from("bulk_pricing_rules").update(payload).eq("id", editRule.id);
        if (error) throw error;
        toast.success("Tier harga diperbarui!");
      } else {
        const { error } = await (supabase as any).from("bulk_pricing_rules").insert(payload);
        if (error) throw error;
        toast.success("Tier harga ditambahkan!");
      }
      setShowDialog(false);
      await loadRules();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: string) {
    setDeleting(id);
    const { error } = await (supabase as any).from("bulk_pricing_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Tier dihapus"); await loadRules(); }
    setDeleting(null);
  }

  if (shopLoading || loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  const groupedByItem = rules.reduce<Record<string, BulkRule[]>>((acc, r) => {
    (acc[r.menu_item_id] ||= []).push(r);
    return acc;
  }, {});

  const filteredItemIds = selectedItemId === "all"
    ? Object.keys(groupedByItem)
    : groupedByItem[selectedItemId] ? [selectedItemId] : [];

  const itemsWithRules = menuItems.filter(m => groupedByItem[m.id]);
  const itemsWithoutRules = menuItems.filter(m => !groupedByItem[m.id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Harga Grosir / Bulk Pricing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur harga bertingkat berdasarkan jumlah pembelian. Tampil otomatis di halaman produk.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => openAdd()}>
          <Plus className="h-4 w-4" /> Tambah Tier
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{Object.keys(groupedByItem).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Produk dengan harga grosir</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{rules.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total tier harga</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{itemsWithoutRules.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Produk belum diatur</p>
        </div>
      </div>

      {/* Filter by product */}
      {itemsWithRules.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedItemId("all")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedItemId === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
          >Semua Produk</button>
          {itemsWithRules.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedItemId(m.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedItemId === m.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
            >{m.name}</button>
          ))}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Belum ada tier harga grosir</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contoh: beli 1–4 pcs Rp 50.000 · beli 5–9 pcs Rp 45.000 · beli 10+ pcs Rp 40.000
          </p>
          <Button className="mt-4 gap-1.5" onClick={() => openAdd()}>
            <Plus className="h-4 w-4" /> Buat Tier Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredItemIds.map(itemId => {
            const item = menuItems.find(m => m.id === itemId);
            const tiers = (groupedByItem[itemId] ?? []).sort((a, b) => a.min_qty - b.min_qty);
            const maxDiscount = item
              ? Math.round((1 - Math.min(...tiers.map(t => t.price)) / item.price) * 100)
              : 0;
            return (
              <div key={itemId} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-sm">{item?.name ?? itemId}</span>
                      {item && (
                        <span className="ml-2 text-xs text-muted-foreground">Harga normal: {formatIDR(item.price)}</span>
                      )}
                    </div>
                    {maxDiscount > 0 && (
                      <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                        Hemat s.d. {maxDiscount}%
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7 shrink-0" onClick={() => openAdd(itemId)}>
                    <Plus className="h-3 w-3" /> Tambah Tier
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {tiers.map((tier, idx) => {
                    const normalPrice = item?.price ?? tier.price;
                    const discount = Math.round((1 - tier.price / normalPrice) * 100);
                    return (
                      <div key={tier.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          T{idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm">
                              {tier.min_qty}{tier.max_qty ? `–${tier.max_qty}` : "+"} pcs
                            </span>
                            <span className="font-bold text-primary">{formatIDR(tier.price)} / pcs</span>
                            {discount > 0 && (
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 rounded-full px-1.5 py-0.5">
                                -{discount}%
                              </span>
                            )}
                          </div>
                          {tier.label && (
                            <p className="text-xs text-muted-foreground mt-0.5">{tier.label}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                            onClick={() => openEdit(tier)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors"
                            onClick={() => deleteRule(tier.id)}
                            disabled={deleting === tier.id}
                            title="Hapus"
                          >
                            {deleting === tier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-add for products without rules */}
      {itemsWithoutRules.length > 0 && rules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <PackageSearch className="h-4 w-4" /> Produk Belum Ada Harga Grosir
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {itemsWithoutRules.slice(0, 12).map(m => (
              <button
                key={m.id}
                onClick={() => openAdd(m.id)}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group"
              >
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatIDR(m.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRule ? "Edit Tier Harga" : "Tambah Tier Harga Grosir"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Produk</Label>
              <Select
                value={form.menu_item_id}
                onValueChange={v => {
                  const m = menuItems.find(x => x.id === v);
                  setForm(f => ({ ...f, menu_item_id: v, price: m?.price ?? f.price }));
                }}
                disabled={!!editRule}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih produk…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {menuItems.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {formatIDR(m.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.menu_item_id && menuItems.find(m => m.id === form.menu_item_id) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Harga normal: <strong>{formatIDR(menuItems.find(m => m.id === form.menu_item_id)!.price)}</strong>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qty Minimum</Label>
                <Input
                  type="number"
                  className="mt-1"
                  min={1}
                  value={form.min_qty}
                  onChange={e => setForm(f => ({ ...f, min_qty: Number(e.target.value) }))}
                  placeholder="Contoh: 5"
                />
              </div>
              <div>
                <Label>Qty Maksimum <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                  type="number"
                  className="mt-1"
                  min={form.min_qty}
                  value={form.max_qty}
                  onChange={e => setForm(f => ({ ...f, max_qty: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="Kosong = tak terbatas"
                />
              </div>
            </div>
            <div>
              <Label>Harga per Pcs (Rp)</Label>
              <Input
                type="number"
                className="mt-1"
                min={0}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                placeholder="Contoh: 45000"
              />
              {form.price > 0 && form.menu_item_id && (() => {
                const base = menuItems.find(m => m.id === form.menu_item_id)?.price ?? 0;
                const disc = base > 0 ? Math.round((1 - form.price / base) * 100) : 0;
                return disc > 0 ? (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">Diskon {disc}% dari harga normal</p>
                ) : disc < 0 ? (
                  <p className="mt-1 text-xs text-amber-600">Harga lebih tinggi dari harga normal</p>
                ) : null;
              })()}
            </div>
            <div>
              <Label>Label Tier <span className="text-muted-foreground">(opsional)</span></Label>
              <Input
                className="mt-1"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Contoh: Harga Grosir, Harga Paket Reseller…"
              />
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong>Preview:</strong>{" "}
              {form.min_qty}{form.max_qty !== "" ? `–${form.max_qty}` : "+"} pcs →{" "}
              {form.price > 0 ? formatIDR(form.price) : "—"} / pcs
              {form.label ? ` (${form.label})` : ""}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || !form.menu_item_id}>
              {saving ? "Menyimpan…" : editRule ? "Simpan Perubahan" : "Tambah Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
