import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Images, Plus, Trash2, GripVertical, Copy, Check, Loader2, Upload, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/portfolio")({
  head: () => ({ meta: [{ title: "Portofolio / Galeri — Merchant" }] }),
  component: PortfolioPage,
});

const PORTFOLIO_SQL = `-- Jalankan di Supabase SQL Editor:
create table if not exists public.shop_portfolio (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.coffee_shops(id) on delete cascade,
  image_url text not null,
  caption text,
  category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_portfolio_shop on public.shop_portfolio(shop_id, sort_order);
alter table public.shop_portfolio enable row level security;
create policy "owner_all_portfolio" on public.shop_portfolio
  using (shop_id in (select id from coffee_shops where owner_id = auth.uid()))
  with check (shop_id in (select id from coffee_shops where owner_id = auth.uid()));
create policy "public_read_portfolio" on public.shop_portfolio
  for select using (true);`;

type PortfolioItem = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string | null;
  sort_order: number;
  before_image_url?: string | null;
  after_image_url?: string | null;
  is_before_after?: boolean | null;
};

function PortfolioPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [items, setItems]   = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [imgUrl, setImgUrl]     = useState("");
  const [caption, setCaption]   = useState("");
  const [category, setCategory] = useState("");
  const [isBA, setIsBA]         = useState(false);
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"main"|"before"|"after">("main");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { error } = await (supabase as any).from("shop_portfolio").select("id").limit(1);
      if (error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
        setTableExists(false);
        setLoading(false);
        return;
      }
      setTableExists(true);
      await loadItems();
    })();
  }, [shop?.id]);

  async function loadItems() {
    if (!shop?.id) return;
    const { data, error } = await (supabase as any)
      .from("shop_portfolio")
      .select("id, image_url, caption, category, sort_order")
      .eq("shop_id", shop.id)
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems((data ?? []) as PortfolioItem[]);
    setLoading(false);
  }

  async function handleUpload(file: File) {
    if (!shop?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File terlalu besar (maks 5 MB)"); return; }
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `portfolio/${shop.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("shop-assets").getPublicUrl(path);
      setImgUrl(urlData.publicUrl);
      toast.success("Gambar berhasil diunggah");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  function openAdd() {
    setEditItem(null);
    setImgUrl(""); setCaption(""); setCategory("");
    setShowAdd(true);
  }

  function openEdit(item: PortfolioItem) {
    setEditItem(item);
    setImgUrl(item.image_url);
    setCaption(item.caption ?? "");
    setCategory(item.category ?? "");
    setShowAdd(true);
  }

  async function save() {
    if (!imgUrl.trim()) { toast.error("Masukkan URL gambar atau unggah foto."); return; }
    if (!shop?.id) return;
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await (supabase as any)
          .from("shop_portfolio")
          .update({ image_url: imgUrl.trim(), caption: caption.trim() || null, category: category.trim() || null })
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("Portofolio diperbarui!");
      } else {
        const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
        const { error } = await (supabase as any)
          .from("shop_portfolio")
          .insert({ shop_id: shop.id, image_url: imgUrl.trim(), caption: caption.trim() || null, category: category.trim() || null, sort_order: maxSort });
        if (error) throw error;
        toast.success("Foto berhasil ditambahkan!");
      }
      setShowAdd(false);
      await loadItems();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    setDeleting(id);
    const { error } = await (supabase as any).from("shop_portfolio").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Foto dihapus"); await loadItems(); }
    setDeleting(null);
  }

  if (shopLoading || loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  if (tableExists === false) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Portofolio / Galeri</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">Tabel portofolio belum ada. Jalankan SQL ini di Supabase:</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-border p-3 text-[11px] whitespace-pre-wrap">{PORTFOLIO_SQL}</pre>
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => { navigator.clipboard.writeText(PORTFOLIO_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          >
            {copied ? <><Check className="h-3.5 w-3.5" /> Disalin!</> : <><Copy className="h-3.5 w-3.5" /> Salin SQL</>}
          </Button>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Portofolio / Galeri</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tampilkan karya terbaikmu kepada calon pembeli.</p>
        </div>
        <Button className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Tambah Foto
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Images className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Belum ada foto portofolio</p>
          <p className="mt-1 text-xs text-muted-foreground">Tambahkan foto produk, proses pembuatan, atau hasil karya untuk menarik lebih banyak pembeli.</p>
          <Button className="mt-4 gap-1.5" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Tambah Foto Pertama
          </Button>
        </div>
      ) : (
        <>
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap text-xs">
              {categories.map(c => (
                <span key={c} className="rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">{c}</span>
              ))}
            </div>
          )}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map(item => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
                <div className="aspect-square w-full bg-muted overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.caption ?? "Portofolio"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=Foto"; }}
                  />
                </div>
                <div className="p-2">
                  {item.category && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">{item.category}</span>
                  )}
                  {item.caption && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground shadow hover:bg-white"
                    onClick={() => openEdit(item)}
                    title="Edit"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-destructive shadow hover:bg-white"
                    onClick={() => deleteItem(item.id)}
                    disabled={deleting === item.id}
                    title="Hapus"
                  >
                    {deleting === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Foto" : "Tambah Foto Portofolio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Foto</Label>
              {imgUrl && (
                <div className="relative mt-1 mb-2 w-full aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={imgUrl} alt="preview" className="h-full w-full object-cover" />
                  <button className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white" onClick={() => setImgUrl("")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <Input
                  value={imgUrl}
                  onChange={e => setImgUrl(e.target.value)}
                  placeholder="https://…"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  title="Unggah dari perangkat"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
            </div>
            <div>
              <Label>Keterangan (opsional)</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={2}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Deskripsi singkat foto ini…"
              />
            </div>
            <div>
              <Label>Kategori (opsional)</Label>
              <Input
                className="mt-1"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Contoh: Kopi, Makanan, Suasana…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || !imgUrl.trim()}>
              {saving ? "Menyimpan…" : editItem ? "Simpan Perubahan" : "Tambah Foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
