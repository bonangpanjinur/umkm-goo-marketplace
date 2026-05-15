import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Package, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/service-bundles")({
  component: ServiceBundlesPage,
});

type Bundle = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  total_price_idr: number;
  original_price_idr: number;
  duration_min: number;
  max_uses: number | null;
  validity_days: number | null;
  is_active: boolean;
  cover_url: string | null;
  sort_order: number;
};

type Item = {
  id?: string;
  bundle_id?: string;
  service_name: string;
  qty: number;
  unit_price_idr: number;
  sort_order: number;
};

function ServiceBundlesPage() {
  const { shop } = useCurrentShop();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const { data } = await supabase
      .from("service_bundles" as any)
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order");
    setBundles((data as any[]) ?? []);
    setLoading(false);
  }, [shop]);

  useEffect(() => { reload(); }, [reload]);

  const openNew = () => {
    setEditing({
      id: "", shop_id: shop?.id ?? "", name: "", description: "",
      total_price_idr: 0, original_price_idr: 0, duration_min: 60,
      max_uses: null, validity_days: 30, is_active: true,
      cover_url: null, sort_order: bundles.length,
    });
    setItems([{ service_name: "", qty: 1, unit_price_idr: 0, sort_order: 0 }]);
  };

  const openEdit = async (b: Bundle) => {
    setEditing(b);
    const { data } = await supabase
      .from("service_bundle_items" as any)
      .select("*").eq("bundle_id", b.id).order("sort_order");
    setItems(((data as any[]) ?? []).map((x: any) => ({
      id: x.id, bundle_id: x.bundle_id, service_name: x.service_name,
      qty: x.qty, unit_price_idr: x.unit_price_idr, sort_order: x.sort_order,
    })));
  };

  const save = async () => {
    if (!editing || !shop) return;
    if (!editing.name.trim()) { toast.error("Nama paket wajib diisi"); return; }
    setBusy(true);
    try {
      let bundleId = editing.id;
      const payload = {
        shop_id: shop.id,
        name: editing.name,
        description: editing.description,
        total_price_idr: editing.total_price_idr,
        original_price_idr: editing.original_price_idr || editing.total_price_idr,
        duration_min: editing.duration_min,
        max_uses: editing.max_uses,
        validity_days: editing.validity_days,
        is_active: editing.is_active,
        cover_url: editing.cover_url,
        sort_order: editing.sort_order,
      };
      if (!bundleId) {
        const { data, error } = await supabase
          .from("service_bundles" as any).insert(payload).select("id").single();
        if (error) throw error;
        bundleId = (data as any).id;
      } else {
        const { error } = await supabase
          .from("service_bundles" as any).update(payload).eq("id", bundleId);
        if (error) throw error;
        await supabase.from("service_bundle_items" as any).delete().eq("bundle_id", bundleId);
      }
      const cleanItems = items.filter((i) => i.service_name.trim()).map((i, idx) => ({
        bundle_id: bundleId,
        service_name: i.service_name,
        qty: i.qty,
        unit_price_idr: i.unit_price_idr,
        sort_order: idx,
      }));
      if (cleanItems.length > 0) {
        const { error } = await supabase.from("service_bundle_items" as any).insert(cleanItems);
        if (error) throw error;
      }
      toast.success("Paket layanan tersimpan");
      setEditing(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const remove = async (b: Bundle) => {
    if (!confirm(`Hapus paket "${b.name}"?`)) return;
    const { error } = await supabase.from("service_bundles" as any).delete().eq("id", b.id);
    if (error) toast.error(error.message);
    else { toast.success("Paket dihapus"); reload(); }
  };

  const toggleActive = async (b: Bundle) => {
    const { error } = await supabase
      .from("service_bundles" as any)
      .update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) toast.error(error.message); else reload();
  };

  const addItem = () => {
    setItems([...items, { service_name: "", qty: 1, unit_price_idr: 0, sort_order: items.length }]);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const sumItems = items.reduce((s, i) => s + i.qty * i.unit_price_idr, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" /> Paket Layanan Booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat bundle layanan jasa (mis. paket cuci+wax, atau spa+pijat) dengan harga lebih murah.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Buat Paket Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : bundles.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada paket layanan. Klik "Buat Paket Baru".
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bundles.map((b) => {
            const discount = b.original_price_idr > b.total_price_idr
              ? Math.round((1 - b.total_price_idr / b.original_price_idr) * 100) : 0;
            return (
              <Card key={b.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{b.name}</div>
                      {b.is_active ? <Badge>Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                    </div>
                    {b.description && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{b.description}</div>}
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="text-2xl font-bold tabular-nums">{formatIDR(b.total_price_idr)}</div>
                  {discount > 0 && (
                    <>
                      <div className="text-sm line-through text-muted-foreground">{formatIDR(b.original_price_idr)}</div>
                      <Badge className="bg-red-500">-{discount}%</Badge>
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>⏱ {b.duration_min} menit</span>
                  {b.validity_days && <span>📅 berlaku {b.validity_days} hari</span>}
                  {b.max_uses && <span>🎟 max {b.max_uses}× pakai</span>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(b)}>
                    {b.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 ml-auto" onClick={() => remove(b)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Paket" : "Paket Layanan Baru"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Nama Paket</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Contoh: Paket Hemat Spa + Pijat" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Detail layanan yang termasuk dalam paket ini" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Harga Asli (Rp)</Label>
                  <Input type="number" value={editing.original_price_idr || ""} onChange={(e) => setEditing({ ...editing, original_price_idr: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Harga Paket (Rp)</Label>
                  <Input type="number" value={editing.total_price_idr || ""} onChange={(e) => setEditing({ ...editing, total_price_idr: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Durasi (menit)</Label>
                  <Input type="number" value={editing.duration_min} onChange={(e) => setEditing({ ...editing, duration_min: parseInt(e.target.value) || 60 })} />
                </div>
                <div>
                  <Label>Berlaku (hari)</Label>
                  <Input type="number" value={editing.validity_days ?? ""} onChange={(e) => setEditing({ ...editing, validity_days: parseInt(e.target.value) || null })} />
                </div>
                <div>
                  <Label>Max Pemakaian</Label>
                  <Input type="number" value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: parseInt(e.target.value) || null })} placeholder="Kosong = unlimited" />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <Label>Tampilkan di toko</Label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> Layanan dalam paket</Label>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Tambah</Button>
                </div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input value={it.service_name} onChange={(e) => updateItem(idx, { service_name: e.target.value })}
                        placeholder="Nama layanan" className="flex-1" />
                      <Input type="number" value={it.qty} onChange={(e) => updateItem(idx, { qty: parseInt(e.target.value) || 1 })}
                        className="w-16" placeholder="Qty" />
                      <Input type="number" value={it.unit_price_idr} onChange={(e) => updateItem(idx, { unit_price_idr: parseInt(e.target.value) || 0 })}
                        className="w-32" placeholder="Harga" />
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                {items.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Total nilai layanan: <b>{formatIDR(sumItems)}</b>
                    {sumItems > editing.total_price_idr && (
                      <span className="text-green-600"> · Hemat {formatIDR(sumItems - editing.total_price_idr)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}