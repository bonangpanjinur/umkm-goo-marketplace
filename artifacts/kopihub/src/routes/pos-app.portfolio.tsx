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
import { Images, Plus, Trash2, GripVertical, Copy, Check, Loader2, Upload, X, ArrowLeftRight, AlertTriangle } from "lucide-react";
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
  const [dims, setDims] = useState<{ before?: { w: number; h: number }; after?: { w: number; h: number } }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
  const MAX_BYTES = 5 * 1024 * 1024;
  const MIN_DIM = 400;

  function readImageMeta(file: File): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { reject(new Error("File gambar tidak valid")); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { error } = await supabase.from("shop_portfolio").select("id").limit(1);
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
    const { data, error } = await supabase
      .from("shop_portfolio")
      .select("id, image_url, caption, category, sort_order, before_image_url, after_image_url, is_before_after")
      .eq("shop_id", shop.id)
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems((data ?? []) as PortfolioItem[]);
    setLoading(false);
  }

  async function handleUpload(file: File) {
    if (!shop?.id) return;
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error("Format tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > MAX_BYTES) { toast.error("File terlalu besar (maks 5 MB)"); return; }
    setUploading(true);
    try {
      const meta = await readImageMeta(file);
      if (meta.w < MIN_DIM || meta.h < MIN_DIM) {
        toast.error(`Resolusi terlalu kecil (${meta.w}×${meta.h}). Minimal ${MIN_DIM}×${MIN_DIM} px.`);
        setUploading(false);
        return;
      }
      if (uploadTarget === "before" || uploadTarget === "after") {
        const other = uploadTarget === "before" ? dims.after : dims.before;
        if (other) {
          const ar1 = meta.w / meta.h;
          const ar2 = other.w / other.h;
          const diff = Math.abs(ar1 - ar2) / Math.max(ar1, ar2);
          if (diff > 0.2) {
            toast.warning("Aspek rasio Sebelum & Sesudah berbeda jauh — slider mungkin terpotong.");
          }
        }
      }
      const ext  = file.name.split(".").pop();
      const path = `portfolio/${shop.id}/${Date.now()}-${uploadTarget}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("shop-assets").getPublicUrl(path);
      if (uploadTarget === "before") { setBeforeUrl(urlData.publicUrl); setDims(d => ({ ...d, before: meta })); }
      else if (uploadTarget === "after") { setAfterUrl(urlData.publicUrl); setDims(d => ({ ...d, after: meta })); }
      else setImgUrl(urlData.publicUrl);
      toast.success("Gambar berhasil diunggah");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  function swapBeforeAfter() {
    const b = beforeUrl;
    setBeforeUrl(afterUrl);
    setAfterUrl(b);
    setDims(d => ({ before: d.after, after: d.before }));
  }

  function openAdd() {
    setEditItem(null);
    setImgUrl(""); setCaption(""); setCategory("");
    setIsBA(false); setBeforeUrl(""); setAfterUrl("");
    setDims({});
    setShowAdd(true);
  }

  function openEdit(item: PortfolioItem) {
    setEditItem(item);
    setImgUrl(item.image_url);
    setCaption(item.caption ?? "");
    setCategory(item.category ?? "");
    setIsBA(Boolean(item.is_before_after));
    setBeforeUrl(item.before_image_url ?? "");
    setAfterUrl(item.after_image_url ?? "");
    setDims({});
    setShowAdd(true);
  }

  async function save() {
    if (isBA && (!beforeUrl.trim() || !afterUrl.trim())) {
      toast.error("Foto Sebelum & Sesudah wajib diisi.");
      return;
    }
    if (!isBA && !imgUrl.trim()) { toast.error("Masukkan URL gambar atau unggah foto."); return; }
    if (!shop?.id) return;
    setSaving(true);
    const baseImg = isBA ? (afterUrl.trim() || beforeUrl.trim()) : imgUrl.trim();
    const payload = {
      image_url: baseImg,
      caption: caption.trim() || null,
      category: category.trim() || null,
      is_before_after: isBA,
      before_image_url: isBA ? beforeUrl.trim() : null,
      after_image_url: isBA ? afterUrl.trim() : null,
    };
    try {
      if (editItem) {
        const { error } = await supabase.from("shop_portfolio").update(payload).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Portofolio diperbarui!");
      } else {
        const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
        const { error } = await supabase.from("shop_portfolio").insert({ shop_id: shop.id, sort_order: maxSort, ...payload });
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
    const { error } = await supabase.from("shop_portfolio").delete().eq("id", id);
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
                {item.is_before_after && item.before_image_url && item.after_image_url ? (
                  <div className="aspect-square w-full">
                    <BeforeAfterSlider beforeUrl={item.before_image_url} afterUrl={item.after_image_url} className="aspect-square" />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-muted overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.caption ?? "Portofolio"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=Foto"; }}
                    />
                  </div>
                )}
                <div className="p-2">
                  {item.is_before_after && (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mr-1">Before/After</span>
                  )}
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
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Mode Before / After</div>
                <div className="text-xs text-muted-foreground">Tampilkan slider perbandingan dua foto.</div>
              </div>
              <Switch checked={isBA} onCheckedChange={setIsBA} />
            </div>

            {isBA ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    Format JPG/PNG/WebP, maks 5 MB, min 400×400 px. Pakai aspek rasio dan sudut pengambilan yang sama agar slider tampil rapi. Urutan: <strong>Sebelum</strong> di kiri, <strong>Sesudah</strong> di kanan.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["before","after"] as const).map(side => {
                    const url = side === "before" ? beforeUrl : afterUrl;
                    const setUrl = side === "before" ? setBeforeUrl : setAfterUrl;
                    const meta = side === "before" ? dims.before : dims.after;
                    return (
                      <div key={side}>
                        <Label className="capitalize">{side === "before" ? "Sebelum" : "Sesudah"}</Label>
                        {url && (
                          <div className="relative mt-1 mb-2 aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={side} className="h-full w-full object-cover" />
                            <span className="absolute top-1 left-1 rounded-full bg-black/60 text-white px-1.5 py-0.5 text-[9px] font-medium">
                              {side === "before" ? "Sebelum" : "Sesudah"}{meta ? ` · ${meta.w}×${meta.h}` : ""}
                            </span>
                            <button className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white" onClick={() => { setUrl(""); setDims(d => ({ ...d, [side]: undefined })); }}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1 mt-1">
                          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL…" className="flex-1 text-xs" />
                          <Button variant="outline" size="icon" disabled={uploading}
                            onClick={() => { setUploadTarget(side); fileRef.current?.click(); }}>
                            {uploading && uploadTarget === side ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {beforeUrl && afterUrl && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Pratinjau slider</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={swapBeforeAfter}>
                        <ArrowLeftRight className="h-3 w-3" /> Tukar urutan
                      </Button>
                    </div>
                    <BeforeAfterSlider beforeUrl={beforeUrl} afterUrl={afterUrl} className="aspect-video mt-1" />
                    {dims.before && dims.after && (() => {
                      const ar1 = dims.before.w / dims.before.h;
                      const ar2 = dims.after.w / dims.after.h;
                      const diff = Math.abs(ar1 - ar2) / Math.max(ar1, ar2);
                      if (diff > 0.2) return <p className="mt-1 text-[11px] text-amber-700">⚠️ Aspek rasio kedua foto berbeda jauh ({Math.round(diff*100)}%) — slider mungkin terpotong.</p>;
                      return null;
                    })()}
                  </div>
                )}
              </div>
            ) : (
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
                  <Input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="https://…" className="flex-1" />
                  <Button variant="outline" size="icon" disabled={uploading}
                    onClick={() => { setUploadTarget("main"); fileRef.current?.click(); }}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />

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
            <Button onClick={save} disabled={saving || (isBA ? (!beforeUrl.trim() || !afterUrl.trim()) : !imgUrl.trim())}>
              {saving ? "Menyimpan…" : editItem ? "Simpan Perubahan" : "Tambah Foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
