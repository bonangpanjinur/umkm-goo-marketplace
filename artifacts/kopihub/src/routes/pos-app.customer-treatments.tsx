import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/customer-treatments")({
  head: () => ({ meta: [{ title: "Riwayat Treatment — Salon" }] }),
  component: Page,
});

type Row = {
  id: string; customer_name: string; customer_phone: string | null; service_name: string;
  staff_name: string | null; formula: string | null; allergies_noted: string | null;
  before_photos: string[]; after_photos: string[]; notes: string | null; performed_at: string;
};

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", service_name: "", staff_name: "",
    formula: "", allergies_noted: "", before_photos: [] as string[], after_photos: [] as string[],
    notes: "", performed_at: new Date().toISOString().slice(0, 16),
  });

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("customer_treatments").select("*").eq("shop_id", shop.id).order("performed_at", { ascending: false });
    setItems((data ?? []) as Row[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() {
    setEditing(null);
    setForm({
      customer_name: "", customer_phone: "", service_name: "", staff_name: "",
      formula: "", allergies_noted: "", before_photos: [], after_photos: [], notes: "",
      performed_at: new Date().toISOString().slice(0, 16),
    });
    setOpenForm(true);
  }
  function startEdit(r: Row) {
    setEditing(r);
    setForm({
      customer_name: r.customer_name, customer_phone: r.customer_phone ?? "",
      service_name: r.service_name, staff_name: r.staff_name ?? "",
      formula: r.formula ?? "", allergies_noted: r.allergies_noted ?? "",
      before_photos: r.before_photos ?? [], after_photos: r.after_photos ?? [],
      notes: r.notes ?? "", performed_at: r.performed_at.slice(0, 16),
    });
    setOpenForm(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.customer_name.trim() || !form.service_name.trim()) { toast.error("Nama & layanan wajib"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone || null, service_name: form.service_name.trim(),
      staff_name: form.staff_name || null, formula: form.formula || null,
      allergies_noted: form.allergies_noted || null,
      before_photos: form.before_photos, after_photos: form.after_photos,
      notes: form.notes || null,
      performed_at: new Date(form.performed_at).toISOString(),
    };
    const { error } = editing
      ? await supabase.from("customer_treatments").update(payload).eq("id", editing.id)
      : await supabase.from("customer_treatments").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpenForm(false); void load();
  }
  async function del(r: Row) {
    if (!confirm("Hapus riwayat ini?")) return;
    const { error } = await supabase.from("customer_treatments").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  function addPhoto(kind: "before" | "after", url: string | null) {
    if (!url) return;
    const key = kind === "before" ? "before_photos" : "after_photos";
    setForm({ ...form, [key]: [...form[key], url] });
  }
  function delPhoto(kind: "before" | "after", idx: number) {
    const key = kind === "before" ? "before_photos" : "after_photos";
    setForm({ ...form, [key]: form[key].filter((_, i) => i !== idx) });
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const filtered = items.filter(i => !q || i.customer_name.toLowerCase().includes(q.toLowerCase()) || (i.customer_phone?.includes(q)));

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6" />Riwayat Treatment</h1>
          <p className="text-sm text-muted-foreground">Catat treatment salon: formula, alergi, before/after photo</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Cari pelanggan..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Treatment Baru</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada riwayat treatment.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{r.customer_name}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(r.performed_at).toLocaleString("id-ID")} · {r.staff_name ?? "—"}</p>
                </div>
              </div>
              <p className="text-sm mt-2"><strong>{r.service_name}</strong></p>
              {r.formula && <p className="text-xs text-muted-foreground mt-1">Formula: {r.formula}</p>}
              {r.allergies_noted && <p className="text-xs text-destructive mt-1">⚠ {r.allergies_noted}</p>}
              {(r.before_photos.length > 0 || r.after_photos.length > 0) && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-xs font-medium mb-1">Sebelum</p>
                    <div className="flex gap-1 flex-wrap">{r.before_photos.map((p, i) => <img key={i} src={p} className="w-16 h-16 object-cover rounded" />)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Sesudah</p>
                    <div className="flex gap-1 flex-wrap">{r.after_photos.map((p, i) => <img key={i} src={p} className="w-16 h-16 object-cover rounded" />)}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Treatment Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Pelanggan</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>No. HP</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>Layanan</Label><Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} /></div>
              <div><Label>Staf Pelaksana</Label><Input value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} /></div>
              <div><Label>Tanggal & Jam</Label><Input type="datetime-local" value={form.performed_at} onChange={(e) => setForm({ ...form, performed_at: e.target.value })} /></div>
            </div>
            <div><Label>Formula / Produk Yang Dipakai</Label><Textarea placeholder="mis. Warna L'Oreal 7.4 + developer 20vol" value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} /></div>
            <div><Label>Alergi / Sensitivitas</Label><Textarea value={form.allergies_noted} onChange={(e) => setForm({ ...form, allergies_noted: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Foto Sebelum</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.before_photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} className="w-20 h-20 object-cover rounded" />
                      <button onClick={() => delPhoto("before", i)} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                  ))}
                  <div className="w-20 h-20">
                    <UploadableImage value={null} onChange={(url) => addPhoto("before", url)} bucket="treatment-photos" pathPrefix={`${shop?.id ?? ""}/before`} />
                  </div>
                </div>
              </div>
              <div>
                <Label>Foto Sesudah</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.after_photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} className="w-20 h-20 object-cover rounded" />
                      <button onClick={() => delPhoto("after", i)} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                  ))}
                  <div className="w-20 h-20">
                    <UploadableImage value={null} onChange={(url) => addPhoto("after", url)} bucket="treatment-photos" pathPrefix={`${shop?.id ?? ""}/after`} />
                  </div>
                </div>
              </div>
            </div>
            <div><Label>Catatan</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
