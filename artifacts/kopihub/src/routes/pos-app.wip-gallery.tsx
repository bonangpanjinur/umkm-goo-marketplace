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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Plus, Trash2, Loader2, Eye, EyeOff, RefreshCw, Clock } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";

export const Route = createFileRoute("/pos-app/wip-gallery")({
  head: () => ({ meta: [{ title: "Galeri Proses Pembuatan" }] }),
  component: WipGalleryPage,
});

type WipPost = {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
  stage: string;
  is_published: boolean;
  linked_product_name: string | null;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.wip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  caption text,
  image_url text NOT NULL,
  stage text NOT NULL DEFAULT 'sketsa',
  is_published boolean NOT NULL DEFAULT true,
  linked_product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const STAGES = [
  { value: "sketsa",    label: "Sketsa / Desain Awal" },
  { value: "bahan",     label: "Persiapan Bahan" },
  { value: "proses",    label: "Proses Pengerjaan" },
  { value: "detail",    label: "Detail & Finishing" },
  { value: "selesai",   label: "Hampir Jadi" },
];

function fmtDate(d: string) { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }); }

export default function WipGalleryPage() {
  const { shop } = useCurrentShop();
  const [posts, setPosts] = useState<WipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", caption: "", image_url: "", stage: "proses", is_published: true, linked_product_name: "" });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("wip_gallery").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setPosts((data ?? []) as WipPost[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !form.image_url.trim() || !form.title.trim()) { toast.error("Judul & URL foto wajib diisi"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("wip_gallery").insert({
        shop_id: shop.id, title: form.title, caption: form.caption || null, image_url: form.image_url,
        stage: form.stage, is_published: form.is_published,
        linked_product_name: form.linked_product_name.trim() || null,
      });
      if (error) throw error;
      toast.success("Foto WIP diunggah");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("wip_gallery").delete().eq("id", id);
    setPosts(prev => prev.filter(x => x.id !== id));
    toast.success("Dihapus");
  };

  const toggle = async (p: WipPost) => {
    await (supabase as any).from("wip_gallery").update({ is_published: !p.is_published }).eq("id", p.id);
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, is_published: !p.is_published } : x));
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Palette className="h-5 w-5 text-primary" /> Galeri Proses Pembuatan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Bagikan behind-the-scenes proses pembuatan karya — bangun koneksi dengan pembeli.</p>
        </div>
        <Button onClick={() => { setForm({ title: "", caption: "", image_url: "", stage: "proses", is_published: true, linked_product_name: "" }); setOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Upload WIP
        </Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Palette className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada foto proses pembuatan</p>
          <p className="text-sm mt-1">Bagikan proses pengerjaan — pembeli suka lihat karya dibuat dengan tangan!</p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Upload Foto WIP</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(p => {
            const stg = STAGES.find(s => s.value === p.stage);
            return (
              <div key={p.id} className={`rounded-xl border bg-card overflow-hidden ${!p.is_published ? "opacity-60" : ""}`}>
                <div className="relative aspect-square">
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-black/60 text-white text-xs border-0">{stg?.label ?? p.stage}</Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => toggle(p)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
                      {p.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => del(p.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600/70">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-sm">{p.title}</p>
                  {p.caption && <p className="text-xs text-muted-foreground line-clamp-2">{p.caption}</p>}
                  {p.linked_product_name && (
                    <p className="text-xs text-primary">📌 {p.linked_product_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtDate(p.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Foto Proses Pembuatan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Proses sketsa, pewarnaan natural, dll." />
            </div>
            <div className="space-y-1.5">
              <Label>Foto Proses *</Label>
              <UploadableImage value={form.image_url || null} onChange={url => setForm(f => ({ ...f, image_url: url ?? "" }))} bucket="shop-images" pathPrefix={`${shop?.id ?? ""}/wip`} />
            </div>
            <div className="space-y-1.5">
              <Label>Tahap Proses</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Caption (opsional)</Label>
              <Textarea rows={2} value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Proses batik tulis tangan menggunakan malam panas..." />
            </div>
            <div className="space-y-1.5">
              <Label>Terkait Produk (opsional)</Label>
              <Input value={form.linked_product_name} onChange={e => setForm(f => ({ ...f, linked_product_name: e.target.value }))} placeholder="Nama produk yang dibuat ini" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
              <Label>Tampilkan di halaman toko</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Palette className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
