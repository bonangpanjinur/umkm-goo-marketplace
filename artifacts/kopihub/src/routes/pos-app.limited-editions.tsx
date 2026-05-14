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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Crown, Plus, Pencil, Trash2, Loader2, RefreshCw, Minus, Tag } from "lucide-react";

export const Route = createFileRoute("/pos-app/limited-editions")({
  head: () => ({ meta: [{ title: "Edisi Terbatas" }] }),
  component: LimitedEditionsPage,
});

type LimitedItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_total: number;
  stock_sold: number;
  image_url: string | null;
  launch_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.limited_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL,
  stock_total int NOT NULL,
  stock_sold int NOT NULL DEFAULT 0,
  image_url text,
  launch_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

export default function LimitedEditionsPage() {
  const { shop } = useCurrentShop();
  const [items, setItems] = useState<LimitedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LimitedItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", stock_total: "", image_url: "", launch_date: "", end_date: "", is_active: true });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("limited_editions").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setItems((data ?? []) as LimitedItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", price: "", stock_total: "", image_url: "", launch_date: "", end_date: "", is_active: true }); setOpen(true); };
  const openEdit = (item: LimitedItem) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? "", price: String(item.price), stock_total: String(item.stock_total), image_url: item.image_url ?? "", launch_date: item.launch_date ?? "", end_date: item.end_date ?? "", is_active: item.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.name.trim() || !form.price || !form.stock_total) { toast.error("Nama, harga, dan stok wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = { shop_id: shop.id, name: form.name, description: form.description || null, price: Number(form.price), stock_total: Number(form.stock_total), image_url: form.image_url || null, launch_date: form.launch_date || null, end_date: form.end_date || null, is_active: form.is_active };
      if (editing) { await (supabase as any).from("limited_editions").update(payload).eq("id", editing.id); }
      else { await (supabase as any).from("limited_editions").insert(payload); }
      toast.success(editing ? "Edisi terbatas diperbarui" : "Edisi terbatas dibuat");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("limited_editions").delete().eq("id", id);
    setItems(prev => prev.filter(x => x.id !== id));
    toast.success("Dihapus");
  };

  const updateSold = async (item: LimitedItem, delta: number) => {
    const newSold = Math.min(item.stock_total, Math.max(0, item.stock_sold + delta));
    await (supabase as any).from("limited_editions").update({ stock_sold: newSold }).eq("id", item.id);
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, stock_sold: newSold } : x));
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Crown className="h-5 w-5 text-primary" /> Edisi Terbatas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kelola produk limited edition dengan counter stok — ciptakan urgensi pembelian.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Edisi</Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Crown className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada produk edisi terbatas</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Tambah Sekarang</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(item => {
            const remaining = item.stock_total - item.stock_sold;
            const soldPct = Math.round((item.stock_sold / item.stock_total) * 100);
            const isSoldOut = remaining === 0;
            const isLow = remaining > 0 && remaining <= 5;
            return (
              <div key={item.id} className={`rounded-xl border bg-card overflow-hidden ${!item.is_active ? "opacity-60" : ""}`}>
                {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover" />}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="font-bold text-primary text-lg">{formatIDR(item.price)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Terjual</span>
                      <span className="font-bold">{item.stock_sold} / {item.stock_total}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isSoldOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${soldPct}%` }} />
                    </div>
                    <div className="flex items-center gap-2">
                      {isSoldOut && <Badge className="bg-red-100 text-red-700 text-xs">HABIS TERJUAL</Badge>}
                      {isLow && !isSoldOut && <Badge className="bg-amber-100 text-amber-700 text-xs">Tersisa {remaining}!</Badge>}
                      {!isSoldOut && !isLow && <Badge variant="secondary" className="text-xs">{remaining} tersisa</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7" onClick={() => updateSold(item, -1)} disabled={item.stock_sold === 0}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground flex-1 text-center">Terjual: {item.stock_sold}</span>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => updateSold(item, 1)} disabled={isSoldOut}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Edisi Terbatas" : "Tambah Edisi Terbatas"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Batik Anniversary Series" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Harga (Rp) *</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Total Stok *</Label><Input type="number" value={form.stock_total} onChange={e => setForm(f => ({ ...f, stock_total: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Tanggal Rilis</Label><Input type="date" value={form.launch_date} onChange={e => setForm(f => ({ ...f, launch_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Berakhir</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>URL Foto</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Aktif & tampil</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
