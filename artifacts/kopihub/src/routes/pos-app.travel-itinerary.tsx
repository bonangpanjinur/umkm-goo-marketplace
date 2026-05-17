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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";
import { CalendarDays, Plus, Pencil, Trash2, MapPin, Clock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/pos-app/travel-itinerary")({
  head: () => ({ meta: [{ title: "Itinerary Harian — Merchant" }] }),
  component: Page,
});

type Pkg = { id: string; name: string; duration_days: number | null };
type Row = {
  id: string; package_id: string; day_number: number; time_label: string | null;
  title: string; description: string | null; location: string | null; image_url: string | null;
  sort_order: number;
};

const empty = { day_number: "1", time_label: "", title: "", description: "", location: "", image_url: "", sort_order: "0" };

function Page() {
  const { shop, loading } = useCurrentShop();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (shop) loadPackages(); }, [shop?.id]);
  useEffect(() => { if (selectedPkg) loadRows(); else setRows([]); }, [selectedPkg]);

  async function loadPackages() {
    if (!shop) return;
    const { data } = await supabase.from("umroh_packages").select("id, name, duration_days").eq("shop_id", shop.id).order("name");
    const list = (data ?? []) as Pkg[];
    setPackages(list);
    if (list.length > 0 && !selectedPkg) setSelectedPkg(list[0].id);
  }

  async function loadRows() {
    const { data } = await (supabase as any).from("travel_itineraries")
      .select("*").eq("package_id", selectedPkg)
      .order("day_number").order("sort_order");
    setRows((data ?? []) as Row[]);
  }

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      day_number: String(r.day_number), time_label: r.time_label ?? "", title: r.title,
      description: r.description ?? "", location: r.location ?? "", image_url: r.image_url ?? "",
      sort_order: String(r.sort_order),
    });
    setOpen(true);
  }

  async function save() {
    if (!shop || !selectedPkg) return;
    if (!form.title.trim()) { toast.error("Judul wajib"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id, package_id: selectedPkg,
      day_number: Number(form.day_number) || 1,
      time_label: form.time_label.trim() || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      image_url: form.image_url.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    };
    const q = editing
      ? (supabase as any).from("travel_itineraries").update(payload).eq("id", editing.id)
      : (supabase as any).from("travel_itineraries").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Diperbarui" : "Ditambahkan");
    setOpen(false); loadRows();
  }

  async function remove(id: string) {
    if (!confirm("Hapus item itinerary?")) return;
    const { error } = await (supabase as any).from("travel_itineraries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); loadRows();
  }

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  const grouped = rows.reduce<Record<number, Row[]>>((acc, r) => {
    (acc[r.day_number] ??= []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> Itinerary Harian</h1>
          <p className="text-sm text-muted-foreground mt-1">Atur rundown hari-per-hari untuk paket travel/umroh.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPkg} onValueChange={setSelectedPkg}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Pilih paket" /></SelectTrigger>
            <SelectContent>
              {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.duration_days ? ` · ${p.duration_days} hari` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} disabled={!selectedPkg}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </div>
      </div>

      {packages.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Buat paket travel/umroh dulu di menu "Paket Umroh".</Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada itinerary. Klik <strong>Tambah</strong>.</Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
            <Card key={day} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-sm">Hari {day}</Badge>
                <span className="text-xs text-muted-foreground">{items.length} kegiatan</span>
              </div>
              <div className="space-y-2">
                {items.map(r => (
                  <div key={r.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                    {r.image_url && <img src={r.image_url} alt="" className="h-16 w-16 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {r.time_label && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.time_label}</span>}
                        {r.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>}
                      </div>
                      <div className="font-medium mt-0.5">{r.title}</div>
                      {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Kegiatan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Hari ke-</Label><Input type="number" min="1" value={form.day_number} onChange={e => setForm({ ...form, day_number: e.target.value })} /></div>
              <div><Label>Jam (opsional)</Label><Input placeholder="08:00" value={form.time_label} onChange={e => setForm({ ...form, time_label: e.target.value })} /></div>
            </div>
            <div><Label>Judul *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tawaf Qudum" /></div>
            <div><Label>Lokasi</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Masjidil Haram" /></div>
            <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Foto</Label><UploadableImage bucket="shop-images" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url ?? "" })} /></div>
            <div><Label>Urutan</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
