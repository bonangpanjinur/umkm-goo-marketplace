import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Image, Plus, Trash2, Edit3, Save, X, ToggleLeft, ToggleRight,
  GripVertical, ExternalLink, Eye, EyeOff, RefreshCw, Upload,
} from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banner Promosi — Admin" }] }),
  component: AdminBannersPage,
});

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  bg_color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const DEMO_BANNERS: Banner[] = [
  { id: "demo-1", title: "Belanja Produk Lokal Terbaik", subtitle: "Ribuan toko UMKM Indonesia hadir di satu platform", cta_text: "Jelajahi Sekarang", cta_link: "/", bg_color: "from-primary to-emerald-600", image_url: null, sort_order: 1, is_active: true, created_at: new Date().toISOString() },
  { id: "demo-2", title: "Flash Sale Setiap Hari", subtitle: "Diskon hingga 70% untuk produk pilihan — terbatas!", cta_text: "Lihat Promo", cta_link: "/promo", bg_color: "from-rose-500 to-orange-500", image_url: null, sort_order: 2, is_active: true, created_at: new Date().toISOString() },
  { id: "demo-3", title: "Buka Toko Gratis Sekarang", subtitle: "Bergabunglah dengan ribuan pemilik UMKM sukses di UMKMgo", cta_text: "Daftar Gratis", cta_link: "/signup", bg_color: "from-violet-600 to-blue-600", image_url: null, sort_order: 3, is_active: true, created_at: new Date().toISOString() },
];

type EditState = Partial<Banner> & { id: string };

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const newIdRef = useRef(0);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("banners").select("*").order("sort_order");
      if (error || !data) throw new Error();
      setBanners(data as Banner[]);
    } catch {
      setBanners(DEMO_BANNERS);
      setUsingDemo(true);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveBanner(b: EditState) {
    setSaving(true);
    try {
      if (usingDemo) {
        if (b.id.startsWith("new-")) {
          const newB: Banner = { ...DEMO_BANNERS[0], ...b, id: `demo-${Date.now()}`, created_at: new Date().toISOString() } as Banner;
          setBanners(p => [...p, newB].sort((a, z) => a.sort_order - z.sort_order));
        } else {
          setBanners(p => p.map(x => x.id === b.id ? { ...x, ...b } as Banner : x));
        }
        toast.success("Banner disimpan (mode demo).");
      } else {
        if (b.id.startsWith("new-")) {
          const { error } = await (supabase as any).from("banners").insert([{ ...b, id: undefined }]);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from("banners").update({ ...b }).eq("id", b.id);
          if (error) throw error;
        }
        toast.success("Banner disimpan.");
        await load();
      }
    } catch {
      toast.error("Gagal menyimpan banner.");
    }
    setSaving(false);
    setEditing(null);
    setShowForm(false);
  }

  async function toggleActive(b: Banner) {
    if (usingDemo) {
      setBanners(p => p.map(x => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
      return;
    }
    await (supabase as any).from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    load();
  }

  async function deleteBanner(id: string) {
    if (!confirm("Hapus banner ini?")) return;
    if (usingDemo) { setBanners(p => p.filter(x => x.id !== id)); return; }
    await (supabase as any).from("banners").delete().eq("id", id);
    load();
  }

  function startNew() {
    newIdRef.current++;
    setEditing({ id: `new-${newIdRef.current}`, title: "", subtitle: "", cta_text: "Lihat Sekarang", cta_link: "/", bg_color: "from-primary to-emerald-600", image_url: "", sort_order: (banners.length + 1) * 10, is_active: true });
    setShowForm(true);
  }

  const BG_OPTIONS = [
    { label: "Hijau (Default)", value: "from-primary to-emerald-600" },
    { label: "Merah-Orange", value: "from-rose-500 to-orange-500" },
    { label: "Ungu-Biru", value: "from-violet-600 to-blue-600" },
    { label: "Biru-Cyan", value: "from-blue-600 to-cyan-500" },
    { label: "Amber-Orange", value: "from-amber-500 to-orange-500" },
    { label: "Abu-Abu Gelap", value: "from-slate-700 to-slate-900" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banner Carousel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola banner hero yang tampil di halaman utama marketplace.
            {usingDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Mode Demo — tabel `banners` belum dibuat</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={startNew}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Banner
          </Button>
        </div>
      </div>

      {/* Preview strip */}
      {banners.filter(b => b.is_active).length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Preview — Banner Aktif ({banners.filter(b => b.is_active).length})
          </div>
          <div className={`relative h-36 overflow-hidden bg-gradient-to-r ${banners.find(b => b.is_active)?.bg_color ?? "from-primary to-emerald-600"}`}>
            {banners.find(b => b.is_active)?.image_url && (
              <img src={banners.find(b => b.is_active)!.image_url!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
            )}
            <div className="relative flex h-full items-center px-8 text-white">
              <div>
                <p className="text-xl font-bold">{banners.find(b => b.is_active)?.title}</p>
                <p className="mt-1 text-sm opacity-80">{banners.find(b => b.is_active)?.subtitle}</p>
                {banners.find(b => b.is_active)?.cta_text && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                    {banners.find(b => b.is_active)?.cta_text}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-3 right-4 flex gap-1">
              {banners.filter(b => b.is_active).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full bg-white ${i === 0 ? "w-5 opacity-100" : "w-1.5 opacity-50"}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form edit / tambah */}
      {showForm && editing && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editing.id.startsWith("new-") ? "Tambah Banner Baru" : "Edit Banner"}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowForm(false); setEditing(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Judul *</Label>
              <Input className="mt-1.5" value={editing.title ?? ""} onChange={e => setEditing(p => ({ ...p!, title: e.target.value }))} placeholder="Belanja Produk Lokal Terbaik" />
            </div>
            <div>
              <Label>Subjudul</Label>
              <Input className="mt-1.5" value={editing.subtitle ?? ""} onChange={e => setEditing(p => ({ ...p!, subtitle: e.target.value }))} placeholder="Deskripsi singkat banner" />
            </div>
            <div>
              <Label>Teks Tombol CTA</Label>
              <Input className="mt-1.5" value={editing.cta_text ?? ""} onChange={e => setEditing(p => ({ ...p!, cta_text: e.target.value }))} placeholder="Jelajahi Sekarang" />
            </div>
            <div>
              <Label>Link Tombol CTA</Label>
              <Input className="mt-1.5" value={editing.cta_link ?? ""} onChange={e => setEditing(p => ({ ...p!, cta_link: e.target.value }))} placeholder="/search atau https://..." />
            </div>
            <div>
              <Label>Gambar Latar Banner (opsional)</Label>
              <div className="mt-1.5">
                <UploadableImage value={editing.image_url || null} onChange={(url) => setEditing(p => ({ ...p!, image_url: url }))} bucket="admin-banners" pathPrefix={`banners/${editing.id || "new"}`} />
              </div>
            </div>
            <div>
              <Label>Urutan Tampil</Label>
              <Input className="mt-1.5" type="number" min={1} value={editing.sort_order ?? 10} onChange={e => setEditing(p => ({ ...p!, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Warna Latar Gradien</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditing(p => ({ ...p!, bg_color: opt.value }))}
                    className={`relative h-10 w-24 rounded-lg bg-gradient-to-r ${opt.value} transition ${editing.bg_color === opt.value ? "ring-2 ring-offset-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
                    title={opt.label}
                  >
                    {editing.bg_color === opt.value && <div className="absolute inset-0 flex items-center justify-center"><div className="h-2.5 w-2.5 rounded-full bg-white shadow" /></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => saveBanner(editing)} disabled={saving || !editing.title}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan…" : "Simpan Banner"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Batal</Button>
          </div>
        </div>
      )}

      {/* List banner */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Image className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Belum ada banner</p>
            <p className="mt-1 text-sm text-muted-foreground">Tambahkan banner pertama untuk ditampilkan di homepage.</p>
            <Button className="mt-4" size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Tambah Banner</Button>
          </div>
        ) : banners.map(b => (
          <div key={b.id} className={`flex items-center gap-3 rounded-xl border p-4 transition ${b.is_active ? "border-border bg-card" : "border-dashed bg-muted/20 opacity-60"}`}>
            <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground/40 cursor-grab" />
            <div className={`h-12 w-20 shrink-0 rounded-lg bg-gradient-to-r ${b.bg_color ?? "from-primary to-emerald-600"} relative overflow-hidden`}>
              {b.image_url && <img src={b.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{b.title}</span>
                {b.is_active ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Aktif</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Nonaktif</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{b.subtitle ?? "—"}</p>
              {b.cta_link && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <ExternalLink className="h-3 w-3" /> {b.cta_link}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title={b.is_active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleActive(b)}>
                {b.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(b); setShowForm(true); }}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteBanner(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* SQL hint */}
      {usingDemo && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Untuk menyimpan banner ke database, buat tabel ini di Supabase:</p>
          <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-3 text-xs leading-relaxed">{`create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_text text,
  cta_link text,
  image_url text,
  bg_color text default 'from-primary to-emerald-600',
  sort_order int default 10,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table banners enable row level security;
create policy "Admin full access" on banners using (true) with check (true);`}
          </pre>
        </div>
      )}
    </div>
  );
}
