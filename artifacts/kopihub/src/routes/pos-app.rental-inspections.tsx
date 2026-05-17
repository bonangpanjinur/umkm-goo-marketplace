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
import { ClipboardCheck, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/rental-inspections")({
  head: () => ({ meta: [{ title: "Inspeksi Unit — Rental" }] }),
  component: Page,
});

type Row = {
  id: string; booking_id: string; kind: string; photos: string[];
  condition_score: number | null; notes: string | null; recorded_at: string;
};
type Booking = { id: string; customer_name: string | null; start_date: string | null };

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    booking_id: "", kind: "before", condition_score: "", notes: "", photos: [] as string[],
  });

  async function load() {
    if (!shop) return;
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      supabase.from("rental_inspections").select("*").eq("shop_id", shop.id).order("recorded_at", { ascending: false }),
      supabase.from("rental_bookings").select("id,customer_name,start_date").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setItems((d1 ?? []) as Row[]);
    setBookings((d2 ?? []) as Booking[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() {
    setEditing(null);
    setForm({ booking_id: "", kind: "before", condition_score: "", notes: "", photos: [] });
    setOpenForm(true);
  }
  function startEdit(r: Row) {
    setEditing(r);
    setForm({
      booking_id: r.booking_id, kind: r.kind,
      condition_score: r.condition_score?.toString() ?? "",
      notes: r.notes ?? "", photos: r.photos ?? [],
    });
    setOpenForm(true);
  }
  function addPhoto(url: string | null) { if (url) setForm({ ...form, photos: [...form.photos, url] }); }
  function delPhoto(i: number) { setForm({ ...form, photos: form.photos.filter((_, x) => x !== i) }); }

  async function save() {
    if (!shop) return;
    if (!form.booking_id) { toast.error("Pilih booking"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, booking_id: form.booking_id, kind: form.kind,
      photos: form.photos, condition_score: form.condition_score ? Number(form.condition_score) : null,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("rental_inspections").update(payload).eq("id", editing.id)
      : await supabase.from("rental_inspections").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpenForm(false); void load();
  }
  async function del(r: Row) {
    if (!confirm("Hapus inspeksi?")) return;
    const { error } = await supabase.from("rental_inspections").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" />Inspeksi Unit</h1>
          <p className="text-sm text-muted-foreground">Foto kondisi unit sebelum & sesudah disewa</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Inspeksi Baru</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada inspeksi.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map(r => {
            const b = bookings.find(x => x.id === r.booking_id);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant={r.kind === "before" ? "default" : "secondary"}>{r.kind === "before" ? "Sebelum" : "Sesudah"}</Badge>
                    <p className="font-medium mt-2">{b?.customer_name ?? r.booking_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleString("id-ID")}</p>
                  </div>
                  {r.condition_score && <div className="text-2xl font-bold">{r.condition_score}/10</div>}
                </div>
                {r.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 mt-3">
                    {r.photos.slice(0, 6).map((p, i) => <img key={i} src={p} className="aspect-square object-cover rounded" />)}
                  </div>
                )}
                {r.notes && <p className="text-xs text-muted-foreground mt-2">{r.notes}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Inspeksi" : "Inspeksi Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Booking</Label>
              <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.map(b => <SelectItem key={b.id} value={b.id}>{b.customer_name ?? b.id.slice(0, 8)} · {b.start_date ?? "—"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Sebelum sewa</SelectItem>
                    <SelectItem value="after">Setelah dikembalikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Skor Kondisi (1-10)</Label><Input type="number" min={1} max={10} value={form.condition_score} onChange={(e) => setForm({ ...form, condition_score: e.target.value })} /></div>
            </div>
            <div>
              <Label>Foto Kondisi</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {form.photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} className="w-20 h-20 object-cover rounded" />
                    <button onClick={() => delPhoto(i)} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button>
                  </div>
                ))}
                <div className="w-20 h-20">
                  <UploadableImage value={null} onChange={addPhoto} bucket="rental-inspections" pathPrefix={`${shop?.id ?? ""}/${form.kind}`} />
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
