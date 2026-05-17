import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Images, Plus, Pencil, Trash2, Loader2, Copy, Upload } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/studio-gallery")({
  head: () => ({ meta: [{ title: "Galeri Klien — Studio" }] }),
  component: Page,
});

type Gal = {
  id: string; title: string; client_name: string | null; client_email: string | null;
  share_token: string; expires_at: string | null; watermark_enabled: boolean;
  max_selections: number | null; status: string; created_at: string;
};
type Photo = { id: string; gallery_id: string; photo_url: string; is_selected: boolean; customer_note: string | null; sort_order: number };

const STATUS = ["draft","sent","reviewed","closed"];

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Gal[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Gal | null>(null);
  const [saving, setSaving] = useState(false);
  const [openPhotos, setOpenPhotos] = useState<Gal | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [form, setForm] = useState({
    title: "", client_name: "", client_email: "", expires_at: "",
    watermark_enabled: true, max_selections: "", status: "draft",
  });

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("studio_galleries").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setItems((data ?? []) as Gal[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  async function loadPhotos(galId: string) {
    const { data } = await supabase.from("studio_gallery_photos").select("*").eq("gallery_id", galId).order("sort_order");
    setPhotos((data ?? []) as Photo[]);
  }

  function startNew() {
    setEditing(null);
    setForm({ title: "", client_name: "", client_email: "", expires_at: "", watermark_enabled: true, max_selections: "", status: "draft" });
    setOpenForm(true);
  }
  function startEdit(g: Gal) {
    setEditing(g);
    setForm({
      title: g.title, client_name: g.client_name ?? "", client_email: g.client_email ?? "",
      expires_at: g.expires_at ? g.expires_at.slice(0, 10) : "",
      watermark_enabled: g.watermark_enabled, max_selections: g.max_selections?.toString() ?? "",
      status: g.status,
    });
    setOpenForm(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.title.trim()) { toast.error("Judul wajib"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, title: form.title.trim(),
      client_name: form.client_name || null, client_email: form.client_email || null,
      expires_at: form.expires_at || null, watermark_enabled: form.watermark_enabled,
      max_selections: form.max_selections ? Number(form.max_selections) : null,
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("studio_galleries").update(payload).eq("id", editing.id)
      : await supabase.from("studio_galleries").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpenForm(false); void load();
  }

  async function del(g: Gal) {
    if (!confirm(`Hapus galeri "${g.title}"?`)) return;
    const { error } = await supabase.from("studio_galleries").delete().eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  async function addPhoto(galId: string, url: string | null) {
    if (!url) return;
    const { error } = await supabase.from("studio_gallery_photos").insert({
      gallery_id: galId, photo_url: url, sort_order: photos.length,
    });
    if (error) { toast.error(error.message); return; }
    void loadPhotos(galId);
  }
  async function delPhoto(p: Photo) {
    const { error } = await supabase.from("studio_gallery_photos").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    void loadPhotos(p.gallery_id);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/g/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link disalin");
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Images className="h-6 w-6" />Galeri Klien</h1>
          <p className="text-sm text-muted-foreground">Bagikan link galeri ke klien — mereka memilih foto favorit</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Galeri Baru</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada galeri.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map(g => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="text-xs text-muted-foreground">{g.client_name ?? "—"}</p>
                </div>
                <Badge>{g.status}</Badge>
              </div>
              {g.expires_at && <p className="text-xs mt-1">Berakhir: {g.expires_at.slice(0, 10)}</p>}
              {g.max_selections && <p className="text-xs">Maks pilih: {g.max_selections}</p>}
              <div className="flex gap-1 mt-3 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { setOpenPhotos(g); void loadPhotos(g.id); }}><Upload className="h-3 w-3 mr-1" />Foto</Button>
                <Button size="sm" variant="outline" onClick={() => copyLink(g.share_token)}><Copy className="h-3 w-3 mr-1" />Link</Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(g)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => del(g)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Galeri" : "Galeri Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Klien</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
              <div><Label>Email Klien</Label><Input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></div>
              <div><Label>Berakhir Pada</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              <div><Label>Maks Pilihan</Label><Input type="number" value={form.max_selections} onChange={(e) => setForm({ ...form, max_selections: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.watermark_enabled} onChange={(e) => setForm({ ...form, watermark_enabled: e.target.checked })} /><span className="text-sm">Watermark pada preview klien</span></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openPhotos} onOpenChange={(o) => !o && setOpenPhotos(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Foto · {openPhotos?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map(p => (
                <div key={p.id} className="relative aspect-square">
                  <img src={p.photo_url} className="w-full h-full object-cover rounded" />
                  {p.is_selected && <Badge className="absolute top-1 left-1">Dipilih</Badge>}
                  <button onClick={() => delPhoto(p)} className="absolute top-1 right-1 bg-destructive text-white rounded-full w-6 h-6 text-xs">×</button>
                </div>
              ))}
              {openPhotos && (
                <div className="aspect-square">
                  <UploadableImage value={null} onChange={(url) => addPhoto(openPhotos.id, url)} bucket="studio-galleries" pathPrefix={`${shop?.id ?? ""}/${openPhotos.id}`} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPhotos(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
