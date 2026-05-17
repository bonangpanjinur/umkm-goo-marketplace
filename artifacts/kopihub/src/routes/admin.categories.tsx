import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Search, GripVertical, Copy, Check, Info, Tags, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

const CATEGORIES_SQL = `-- Jalankan di Supabase SQL Editor:
create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  parent_code text,
  booking_enabled boolean not null default false,
  booking_type text check (booking_type in ('sesi','rental','reservasi','kelas','jasa','konsultasi')),
  features jsonb not null default '[]',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_biz_cat_slug on public.business_categories(slug);
create index if not exists idx_biz_cat_active on public.business_categories(is_active, sort_order);

alter table public.business_categories enable row level security;
create policy "admin_all_biz_cat" on public.business_categories
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'));
create policy "public_read_biz_cat" on public.business_categories
  for select using (is_active = true);`;

type Category = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_code: string | null;
  booking_enabled: boolean;
  booking_type: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM = {
  code: "", name: "", slug: "", description: "", icon: "", parent_code: "",
  booking_enabled: false, booking_type: "", features: "", is_active: true, sort_order: 0,
};

function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error?.code === "42P01") { setTablesMissing(true); setLoading(false); return; }
    setCats((data ?? []) as Category[]);
    setLoading(false);
  }

  function openAdd() {
    setEditCat(null);
    setForm({ ...EMPTY_FORM, sort_order: cats.length });
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditCat(c);
    setForm({
      code: c.code, name: c.name, slug: c.slug, description: c.description ?? "",
      icon: c.icon ?? "", parent_code: c.parent_code ?? "",
      booking_enabled: c.booking_enabled, booking_type: c.booking_type ?? "",
      features: (c.features ?? []).join(", "), is_active: c.is_active, sort_order: c.sort_order,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim() || !form.slug.trim()) {
      toast.error("Kode, nama, dan slug wajib diisi");
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      description: form.description || null,
      icon: form.icon || null,
      parent_code: form.parent_code || null,
      booking_enabled: form.booking_enabled,
      booking_type: form.booking_type || null,
      features: form.features.split(",").map(s => s.trim()).filter(Boolean),
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
      updated_at: new Date().toISOString(),
    };
    const { error } = editCat
      ? await (supabase as any).from("business_categories").update(payload).eq("id", editCat.id)
      : await (supabase as any).from("business_categories").insert(payload);
    if (error) { toast.error(error.message); } else { toast.success(editCat ? "Kategori diperbarui" : "Kategori ditambahkan"); setShowForm(false); load(); }
    setSaving(false);
  }

  async function deleteCat(id: string, name: string) {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    const { error } = await (supabase as any).from("business_categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Kategori dihapus"); load(); }
  }

  async function toggleActive(c: Category) {
    await (supabase as any).from("business_categories").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  }

  async function moveOrder(id: string, dir: "up" | "down") {
    const idx = cats.findIndex(c => c.id === id);
    if (idx < 0) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) return;
    const a = cats[idx];
    const b = cats[swapIdx];
    await Promise.all([
      (supabase as any).from("business_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      (supabase as any).from("business_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  const filtered = cats.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6 text-primary" /> Manajemen Kategori Usaha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">CRUD kategori bisnis. Perubahan langsung tampil di marketplace tanpa deploy ulang.</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      {tablesMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-sm">
            <Info className="h-4 w-4 shrink-0" /> Tabel belum dibuat
          </div>
          <p className="text-sm text-muted-foreground">Jalankan SQL berikut di Supabase SQL Editor untuk mengaktifkan manajemen kategori.</p>
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-64 select-all">{CATEGORIES_SQL}</pre>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(CATEGORIES_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("SQL disalin"); }} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Disalin" : "Salin SQL"}
          </Button>
        </div>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari kategori…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-9" />
          </div>

          <div className="text-xs text-muted-foreground">{filtered.length} kategori</div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Tags className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">{q ? "Kategori tidak ditemukan." : "Belum ada kategori. Klik 'Tambah Kategori' untuk memulai."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c, idx) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                      <button onClick={() => moveOrder(c.id, "up")} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <button onClick={() => moveOrder(c.id, "down")} disabled={idx === filtered.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.icon && <span className="text-base">{c.icon}</span>}
                        <span className="font-semibold text-sm">{c.name}</span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.code}</span>
                        <Badge className={`text-[10px] px-2 py-0 ${c.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {c.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                        {c.booking_enabled && (
                          <Badge className="text-[10px] px-2 py-0 bg-blue-100 text-blue-800">Booking {c.booking_type ? `(${c.booking_type})` : ""}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">/kategori/{c.slug}</p>
                      {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description}</p>}
                      {c.features && c.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.features.slice(0, 5).map(f => <span key={f} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{f}</span>)}
                          {c.features.length > 5 && <span className="text-[10px] text-muted-foreground">+{c.features.length - 5}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} className="scale-75" />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => deleteCat(c.id, c.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode *</Label>
                <Input placeholder="fnb_cafe" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Icon (emoji)</Label>
                <Input placeholder="☕" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Kategori *</Label>
              <Input placeholder="Kafe & Restoran" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL) *</Label>
              <Input placeholder="kafe-kedai-kopi" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori Induk (kode)</Label>
              <Input placeholder="fnb (opsional)" value={form.parent_code} onChange={e => setForm(f => ({ ...f, parent_code: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea placeholder="Deskripsi singkat kategori…" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fitur Tambahan (pisah koma)</Label>
              <Input placeholder="POS, KDS, Booking, QR Order…" value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Sistem Booking</p>
                <p className="text-xs text-muted-foreground">Apakah kategori ini menggunakan booking?</p>
              </div>
              <Switch checked={form.booking_enabled} onCheckedChange={v => setForm(f => ({ ...f, booking_enabled: v }))} />
            </div>
            {form.booking_enabled && (
              <div className="space-y-1.5">
                <Label className="text-xs">Jenis Booking</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.booking_type} onChange={e => setForm(f => ({ ...f, booking_type: e.target.value }))}>
                  <option value="">Pilih tipe…</option>
                  <option value="sesi">Sesi (barbershop, salon, pijat)</option>
                  <option value="rental">Rental (mobil, alat camping)</option>
                  <option value="reservasi">Reservasi Tempat (restoran, villa)</option>
                  <option value="kelas">Kelas (yoga, les privat)</option>
                  <option value="jasa">Jasa (EO, fotografer)</option>
                  <option value="konsultasi">Konsultasi (klinik, dokter)</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Urutan</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label className="text-sm">Aktif</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editCat ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
