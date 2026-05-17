import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Grid3x3, Loader2, Wand2, Save, Trash2 } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/variant-matrix")({
  head: () => ({ meta: [{ title: "Matrix Varian — Merchant" }] }),
  component: Page,
});

type MenuItem = { id: string; name: string; price: number };
type Variant = {
  id: string; menu_item_id: string; name: string; sku: string | null;
  price: number; stock: number | null; is_available: boolean; attributes: Record<string, string>;
};

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemId, setItemId] = useState<string>("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [axis1Name, setAxis1Name] = useState("Size");
  const [axis1Vals, setAxis1Vals] = useState("S, M, L, XL");
  const [axis2Name, setAxis2Name] = useState("Color");
  const [axis2Vals, setAxis2Vals] = useState("Hitam, Putih");
  const [basePrice, setBasePrice] = useState("");
  const [baseStock, setBaseStock] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (shop) loadItems(); }, [shop?.id]);
  useEffect(() => { if (itemId) loadVariants(); }, [itemId]);

  async function loadItems() {
    if (!shop) return;
    const { data } = await supabase.from("menu_items").select("id, name, price").eq("shop_id", shop.id).order("name");
    const list = (data ?? []) as MenuItem[];
    setItems(list);
    if (!itemId && list.length) setItemId(list[0].id);
  }
  async function loadVariants() {
    const { data } = await (supabase as any).from("menu_item_variants")
      .select("id, menu_item_id, name, sku, price, stock, is_available, attributes")
      .eq("menu_item_id", itemId).order("sort_order");
    setVariants((data ?? []) as Variant[]);
    const sel = items.find(i => i.id === itemId);
    if (sel && !basePrice) setBasePrice(String(sel.price));
  }

  const axis1 = useMemo(() => axis1Vals.split(",").map(s => s.trim()).filter(Boolean), [axis1Vals]);
  const axis2 = useMemo(() => axis2Vals.split(",").map(s => s.trim()).filter(Boolean), [axis2Vals]);

  async function generate() {
    if (!shop || !itemId) return;
    if (axis1.length === 0) { toast.error("Isi nilai axis 1"); return; }
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const price = Number(basePrice) || item.price;
    const stock = Number(baseStock) || 0;
    setBusy(true);

    const existing = new Set(variants.map(v => JSON.stringify(v.attributes)));
    const newRows: any[] = [];
    const combos = axis2.length > 0
      ? axis1.flatMap(a => axis2.map(b => ({ [axis1Name]: a, [axis2Name]: b })))
      : axis1.map(a => ({ [axis1Name]: a }));

    let idx = variants.length;
    for (const attrs of combos) {
      if (existing.has(JSON.stringify(attrs))) continue;
      const label = Object.values(attrs).join(" / ");
      const slug = Object.values(attrs).join("-").toUpperCase().replace(/\s+/g, "");
      newRows.push({
        shop_id: shop.id, menu_item_id: itemId,
        name: label, sku: `${item.name.slice(0, 3).toUpperCase()}-${slug}`,
        price, stock, is_available: true, attributes: attrs, sort_order: idx++,
      });
    }
    if (newRows.length === 0) { toast.info("Semua kombinasi sudah ada"); setBusy(false); return; }
    const { error } = await (supabase as any).from("menu_item_variants").insert(newRows);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${newRows.length} varian dibuat`);
    loadVariants();
  }

  async function updateVariant(v: Variant, patch: Partial<Variant>) {
    const { error } = await (supabase as any).from("menu_item_variants").update(patch).eq("id", v.id);
    if (error) toast.error(error.message);
    else loadVariants();
  }
  async function removeVariant(id: string) {
    if (!confirm("Hapus varian?")) return;
    await (supabase as any).from("menu_item_variants").delete().eq("id", id);
    loadVariants();
  }

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Grid3x3 className="h-6 w-6 text-primary" /> Matrix Varian</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate kombinasi varian Size × Color × Material dengan stok & SKU per kombinasi.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div><Label>Produk</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
            <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Axis 1 — nama</Label><Input value={axis1Name} onChange={e => setAxis1Name(e.target.value)} />
            <Label className="mt-2 block">Nilai (pisah koma)</Label><Input value={axis1Vals} onChange={e => setAxis1Vals(e.target.value)} />
          </div>
          <div>
            <Label>Axis 2 — nama (opsional)</Label><Input value={axis2Name} onChange={e => setAxis2Name(e.target.value)} />
            <Label className="mt-2 block">Nilai (pisah koma)</Label><Input value={axis2Vals} onChange={e => setAxis2Vals(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Harga default</Label><Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} /></div>
          <div><Label>Stok awal per SKU</Label><Input type="number" value={baseStock} onChange={e => setBaseStock(e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={generate} disabled={busy || !itemId}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Generate {axis1.length} × {axis2.length || 1} = {axis1.length * (axis2.length || 1)} SKU
          </Button>
        </div>
      </Card>

      {variants.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Kombinasi</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-right">Harga</th>
                <th className="px-3 py-2 text-right">Stok</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(v.attributes ?? {}).map(([k, val]) => (
                        <Badge key={k} variant="secondary" className="text-[10px]">{k}: {val}</Badge>
                      ))}
                      {Object.keys(v.attributes ?? {}).length === 0 && <span className="text-muted-foreground text-xs">{v.name}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Input className="h-7" defaultValue={v.sku ?? ""} onBlur={e => e.target.value !== (v.sku ?? "") && updateVariant(v, { sku: e.target.value || null } as any)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input className="h-7 w-28 ml-auto text-right" type="number" defaultValue={v.price} onBlur={e => Number(e.target.value) !== v.price && updateVariant(v, { price: Number(e.target.value) } as any)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input className="h-7 w-20 ml-auto text-right" type="number" defaultValue={v.stock ?? 0} onBlur={e => Number(e.target.value) !== (v.stock ?? 0) && updateVariant(v, { stock: Number(e.target.value) } as any)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => removeVariant(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 text-xs text-muted-foreground border-t flex items-center gap-1"><Save className="h-3 w-3" /> Perubahan disimpan saat klik di luar kolom.</div>
        </Card>
      )}
    </div>
  );
}
