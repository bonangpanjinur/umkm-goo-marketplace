import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pill, Plus, Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/medications")({
  head: () => ({ meta: [{ title: "Stok Obat — Klinik" }] }),
  component: Page,
});

type Row = {
  id: string; name: string; generic_name: string | null; dose: string | null; unit: string | null;
  form: string | null; stock: number; low_stock_threshold: number; expiry_date: string | null;
  price: number | null; manufacturer: string | null; notes: string | null; is_active: boolean;
};

const empty = {
  name: "", generic_name: "", dose: "", unit: "", form: "", stock: "0",
  low_stock_threshold: "10", expiry_date: "", price: "", manufacturer: "", notes: "", is_active: true,
};

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("medications").select("*").eq("shop_id", shop.id).order("name");
    setItems((data ?? []) as Row[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() { setEditing(null); setForm(empty); setOpenForm(true); }
  function startEdit(r: Row) {
    setEditing(r);
    setForm({
      name: r.name, generic_name: r.generic_name ?? "", dose: r.dose ?? "", unit: r.unit ?? "",
      form: r.form ?? "", stock: String(r.stock), low_stock_threshold: String(r.low_stock_threshold),
      expiry_date: r.expiry_date ?? "", price: r.price?.toString() ?? "",
      manufacturer: r.manufacturer ?? "", notes: r.notes ?? "", is_active: r.is_active,
    });
    setOpenForm(true);
  }
  async function save() {
    if (!shop) return;
    if (!form.name.trim()) { toast.error("Nama obat wajib"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, name: form.name.trim(),
      generic_name: form.generic_name || null, dose: form.dose || null, unit: form.unit || null,
      form: form.form || null, stock: Number(form.stock || 0),
      low_stock_threshold: Number(form.low_stock_threshold || 10),
      expiry_date: form.expiry_date || null, price: form.price ? Number(form.price) : null,
      manufacturer: form.manufacturer || null, notes: form.notes || null, is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("medications").update(payload).eq("id", editing.id)
      : await supabase.from("medications").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpenForm(false); void load();
  }
  async function del(r: Row) {
    if (!confirm(`Hapus "${r.name}"?`)) return;
    const { error } = await supabase.from("medications").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const filtered = items.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.generic_name?.toLowerCase().includes(q.toLowerCase())));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Pill className="h-6 w-6" />Stok Obat</h1>
          <p className="text-sm text-muted-foreground">Inventori obat klinik dengan peringatan stok & kedaluwarsa</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Cari obat..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Obat Baru</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada obat.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Nama</th><th className="p-3">Dosis</th><th className="p-3">Bentuk</th>
                <th className="p-3 text-right">Stok</th><th className="p-3">ED</th>
                <th className="p-3 text-right">Harga</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const lowStock = r.stock <= r.low_stock_threshold;
                const expSoon = r.expiry_date && r.expiry_date <= today;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.name}</div>
                      {r.generic_name && <div className="text-xs text-muted-foreground">{r.generic_name}</div>}
                    </td>
                    <td className="p-3">{r.dose ?? "—"}</td>
                    <td className="p-3">{r.form ?? "—"}</td>
                    <td className="p-3 text-right">
                      <span className={lowStock ? "text-destructive font-semibold" : ""}>{r.stock} {r.unit}</span>
                      {lowStock && <AlertTriangle className="h-3 w-3 inline ml-1 text-destructive" />}
                    </td>
                    <td className="p-3">
                      {r.expiry_date ? <span className={expSoon ? "text-destructive" : ""}>{r.expiry_date}</span> : "—"}
                    </td>
                    <td className="p-3 text-right">{r.price ? formatIDR(r.price) : "—"}</td>
                    <td className="p-3"><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Aktif" : "Nonaktif"}</Badge></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" className="ml-1" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Obat" : "Obat Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Obat</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Generik</Label><Input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} /></div>
              <div><Label>Produsen</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
              <div><Label>Dosis</Label><Input placeholder="500 mg" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></div>
              <div><Label>Bentuk</Label><Input placeholder="tablet, sirup, kapsul" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} /></div>
              <div><Label>Stok</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div><Label>Satuan</Label><Input placeholder="strip, botol" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div><Label>Batas Stok Rendah</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
              <div><Label>Tgl Kedaluwarsa</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div><Label>Harga (Rp)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            </div>
            <div><Label>Catatan</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><span className="text-sm">Aktif</span></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
