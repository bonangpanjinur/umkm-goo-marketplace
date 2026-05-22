import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { UploadableImage } from "@/components/UploadableImage";
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
import { Images, Plus, Trash2, Pencil, Loader2, Eye, EyeOff, Upload, X, Tag, User } from "lucide-react";

export const Route = createFileRoute("/pos-app/lookbook")({
  head: () => ({ meta: [{ title: "Lookbook & Foto Model" }] }),
  component: LookbookPage,
});

type LookItem = {
  id: string;
  title: string | null;
  model_name: string | null;
  tags: string[];
  image_url: string;
  is_published: boolean;
  sort_order: number;
  linked_product_ids: string[];
};

export default function LookbookPage() {
  const { shop } = useCurrentShop();
  const [items, setItems] = useState<LookItem[]>([]);
  const [loading, setLoading] = useState(true);
const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LookItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", model_name: "", tags: "", image_url: "", is_published: true });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shop_lookbook").select("*").eq("shop_id", shopId).order("sort_order").order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setItems((data ?? []) as LookItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => { setEditing(null); setForm({ title: "", model_name: "", tags: "", image_url: "", is_published: true }); setOpen(true); };
  const openEdit = (item: LookItem) => {
    setEditing(item);
    setForm({ title: item.title ?? "", model_name: item.model_name ?? "", tags: (item.tags ?? []).join(", "), image_url: item.image_url, is_published: item.is_published });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.image_url.trim()) { toast.error("URL foto wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = {
        shop_id: shop.id,
        title: form.title.trim() || null,
        model_name: form.model_name.trim() || null,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        image_url: form.image_url.trim(),
        is_published: form.is_published,
        sort_order: editing?.sort_order ?? items.length,
      };
      if (editing) {
        await (supabase as any).from("shop_lookbook").update(payload).eq("id", editing.id);
      } else {
        await (supabase as any).from("shop_lookbook").insert(payload);
      }
      toast.success(editing ? "Lookbook diperbarui" : "Foto ditambahkan ke lookbook");
      setOpen(false);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("shop_lookbook").delete().eq("id", id);
    setItems(prev => prev.filter(x => x.id !== id));
    toast.success("Foto dihapus");
  };

  const toggle = async (item: LookItem) => {
    await (supabase as any).from("shop_lookbook").update({ is_published: !item.is_published }).eq("id", item.id);
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, is_published: !item.is_published } : x));
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Images className="h-5 w-5 text-primary" /> Lookbook & Foto Model</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Foto model yang memakai produk Anda — tampil di halaman toko publik.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Foto</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Images className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada foto lookbook</p>
          <p className="text-sm mt-1">Tambah foto model/OOTD untuk meningkatkan konversi produk fashion.</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Tambah Foto Pertama</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <div key={item.id} className={`rounded-xl border bg-card overflow-hidden ${!item.is_published ? "opacity-60" : ""}`}>
              <div className="relative aspect-[3/4]">
                <img src={item.image_url} alt={item.title ?? ""} className="h-full w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => toggle(item)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
                    {item.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {item.title && <p className="text-sm font-semibold">{item.title}</p>}
                {item.model_name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> {item.model_name}
                  </p>
                )}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(item)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => del(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Foto Lookbook" : "Tambah Foto Lookbook"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Foto Lookbook <span className="text-destructive">*</span></Label>
              <UploadableImage
                value={form.image_url || null}
                onChange={(url) => setForm(f => ({ ...f, image_url: url ?? "" }))}
                bucket="shop-images"
                pathPrefix={`${shop?.id ?? ""}/lookbook`}
                hint="Foto model / OOTD — JPG/PNG/WebP maks 5 MB"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Judul (opsional)</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="OOTD Casual, Look #3, dll." />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Model (opsional)</Label>
                <Input value={form.model_name} onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))} placeholder="Siti, @username, dll." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tag (pisah koma)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="casual, hijab, batik, formal" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
              <Label>Tampilkan di halaman toko publik</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Images className="h-4 w-4 mr-2" />}
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
