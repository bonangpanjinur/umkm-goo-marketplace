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
import { Plane, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/umroh-packages")({
  head: () => ({ meta: [{ title: "Paket Umroh — Merchant" }] }),
  component: Page,
});

type Pkg = {
  id: string; name: string; description: string | null;
  departure_date: string | null; return_date: string | null; duration_days: number | null;
  hotel_makkah: string | null; hotel_madinah: string | null; airline: string | null;
  price_quad: number | null; price_triple: number | null; price_double: number | null;
  cover_image_url: string | null; quota_total: number | null; quota_filled: number;
  is_active: boolean; sort_order: number;
};

const empty = {
  name: "", description: "", departure_date: "", return_date: "", duration_days: "",
  hotel_makkah: "", hotel_madinah: "", airline: "",
  price_quad: "", price_triple: "", price_double: "",
  cover_image_url: "", quota_total: "", is_active: true,
};

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Pkg[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("umroh_packages").select("*").eq("shop_id", shop.id).order("sort_order");
    setItems((data ?? []) as Pkg[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() { setEditing(null); setForm(empty); setOpenForm(true); }
  function startEdit(p: Pkg) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "",
      departure_date: p.departure_date ?? "", return_date: p.return_date ?? "",
      duration_days: p.duration_days?.toString() ?? "",
      hotel_makkah: p.hotel_makkah ?? "", hotel_madinah: p.hotel_madinah ?? "", airline: p.airline ?? "",
      price_quad: p.price_quad?.toString() ?? "", price_triple: p.price_triple?.toString() ?? "", price_double: p.price_double?.toString() ?? "",
      cover_image_url: p.cover_image_url ?? "", quota_total: p.quota_total?.toString() ?? "", is_active: p.is_active,
    });
    setOpenForm(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.name.trim()) { toast.error("Nama paket wajib"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      name: form.name.trim(),
      description: form.description || null,
      departure_date: form.departure_date || null,
      return_date: form.return_date || null,
      duration_days: form.duration_days ? Number(form.duration_days) : null,
      hotel_makkah: form.hotel_makkah || null,
      hotel_madinah: form.hotel_madinah || null,
      airline: form.airline || null,
      price_quad: form.price_quad ? Number(form.price_quad) : null,
      price_triple: form.price_triple ? Number(form.price_triple) : null,
      price_double: form.price_double ? Number(form.price_double) : null,
      cover_image_url: form.cover_image_url || null,
      quota_total: form.quota_total ? Number(form.quota_total) : null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("umroh_packages").update(payload).eq("id", editing.id)
      : await supabase.from("umroh_packages").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setOpenForm(false);
    void load();
  }

  async function del(p: Pkg) {
    if (!confirm(`Hapus paket "${p.name}"?`)) return;
    const { error } = await supabase.from("umroh_packages").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus");
    void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Plane className="h-6 w-6" />Paket Umroh</h1>
          <p className="text-sm text-muted-foreground">Kelola paket perjalanan umroh & jamaah</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Paket Baru</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada paket. Klik "Paket Baru" untuk mulai.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.cover_image_url && <img src={p.cover_image_url} alt={p.name} className="h-36 w-full object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                {p.departure_date && <p className="text-xs text-muted-foreground mt-1">{new Date(p.departure_date).toLocaleDateString("id-ID")}{p.duration_days && ` · ${p.duration_days} hari`}</p>}
                {p.price_quad && <p className="text-sm mt-2 font-medium">{formatIDR(p.price_quad)} <span className="text-xs text-muted-foreground">/ quad</span></p>}
                {p.quota_total && <p className="text-xs text-muted-foreground">Kuota: {p.quota_filled}/{p.quota_total}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(p)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => del(p)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Paket Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Paket</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Berangkat</Label><Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} /></div>
              <div><Label>Pulang</Label><Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></div>
              <div><Label>Durasi (hari)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
              <div><Label>Maskapai</Label><Input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} /></div>
              <div><Label>Hotel Mekkah</Label><Input value={form.hotel_makkah} onChange={(e) => setForm({ ...form, hotel_makkah: e.target.value })} /></div>
              <div><Label>Hotel Madinah</Label><Input value={form.hotel_madinah} onChange={(e) => setForm({ ...form, hotel_madinah: e.target.value })} /></div>
              <div><Label>Harga Quad</Label><Input type="number" value={form.price_quad} onChange={(e) => setForm({ ...form, price_quad: e.target.value })} /></div>
              <div><Label>Harga Triple</Label><Input type="number" value={form.price_triple} onChange={(e) => setForm({ ...form, price_triple: e.target.value })} /></div>
              <div><Label>Harga Double</Label><Input type="number" value={form.price_double} onChange={(e) => setForm({ ...form, price_double: e.target.value })} /></div>
              <div><Label>Kuota Total</Label><Input type="number" value={form.quota_total} onChange={(e) => setForm({ ...form, quota_total: e.target.value })} /></div>
            </div>
            <div><Label>URL Gambar Cover</Label><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." /></div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><span className="text-sm">Aktif (tampilkan di storefront)</span></label>
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
