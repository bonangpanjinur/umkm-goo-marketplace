import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  Plus, Pencil, Trash2, Loader2, Search, Tags,
  ArrowUp, ArrowDown, Layers, X,
} from "lucide-react";
import { toast } from "sonner";
import { FEATURE_KEYS, FEATURE_LABEL, FLOW_TYPE_LABEL, type FeatureKey, type FlowType } from "@/lib/feature-keys";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

type Subtype = { slug: string; label: string; icon?: string };

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  sort_order: number;
  is_active: boolean;
  enabled_features: string[];
  flow_types: string[];
  booking_enabled: boolean;
  booking_type: string | null;
  recommended_theme_key: string | null;
  subtypes: Subtype[];
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  description: "",
  icon_url: "",
  banner_url: "",
  sort_order: 0,
  is_active: true,
  enabled_features: [] as string[],
  flow_types: [] as string[],
  booking_enabled: false,
  booking_type: "",
  recommended_theme_key: "",
  subtypes: [] as Subtype[],
};

const FLOWS: FlowType[] = ["T1", "T2", "T3", "T4", "T5"];

function autoSlug(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [subInput, setSubInput] = useState({ slug: "", label: "", icon: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) {
      toast.error(error.message);
    } else {
      setCats((data ?? []).map((c: any) => ({
        ...c,
        enabled_features: c.enabled_features ?? [],
        flow_types: c.flow_types ?? [],
        subtypes: Array.isArray(c.subtypes) ? c.subtypes : [],
      })));
    }
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
      slug: c.slug,
      name: c.name,
      description: c.description ?? "",
      icon_url: c.icon_url ?? "",
      banner_url: c.banner_url ?? "",
      sort_order: c.sort_order,
      is_active: c.is_active,
      enabled_features: [...(c.enabled_features ?? [])],
      flow_types: [...(c.flow_types ?? [])],
      booking_enabled: c.booking_enabled,
      booking_type: c.booking_type ?? "",
      recommended_theme_key: c.recommended_theme_key ?? "",
      subtypes: [...(c.subtypes ?? [])],
    });
    setShowForm(true);
  }

  function toggleFeature(k: string) {
    setForm(f => ({
      ...f,
      enabled_features: f.enabled_features.includes(k)
        ? f.enabled_features.filter(x => x !== k)
        : [...f.enabled_features, k],
    }));
  }

  function toggleFlow(k: string) {
    setForm(f => ({
      ...f,
      flow_types: f.flow_types.includes(k)
        ? f.flow_types.filter(x => x !== k)
        : [...f.flow_types, k],
    }));
  }

  function addSubtype() {
    const label = subInput.label.trim();
    if (!label) return;
    const slug = subInput.slug.trim() || autoSlug(label);
    if (form.subtypes.some(s => s.slug === slug)) {
      toast.error("Slug subtype sudah ada");
      return;
    }
    setForm(f => ({
      ...f,
      subtypes: [...f.subtypes, { slug, label, icon: subInput.icon || undefined }],
    }));
    setSubInput({ slug: "", label: "", icon: "" });
  }

  function removeSubtype(slug: string) {
    setForm(f => ({ ...f, subtypes: f.subtypes.filter(s => s.slug !== slug) }));
  }

  async function save() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nama dan slug wajib diisi");
      return;
    }
    setSaving(true);
    const payload: any = {
      slug: form.slug.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description || null,
      icon_url: form.icon_url || null,
      banner_url: form.banner_url || null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
      enabled_features: form.enabled_features,
      flow_types: form.flow_types,
      booking_enabled: form.booking_enabled,
      booking_type: form.booking_enabled ? (form.booking_type || null) : null,
      recommended_theme_key: form.recommended_theme_key || null,
      subtypes: form.subtypes,
      updated_at: new Date().toISOString(),
    };
    const { error } = editCat
      ? await (supabase as any).from("business_categories").update(payload).eq("id", editCat.id)
      : await (supabase as any).from("business_categories").insert(payload);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editCat ? "Kategori diperbarui" : "Kategori ditambahkan");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function deleteCat(c: Category) {
    if (!confirm(`Hapus kategori "${c.name}"? Toko yang memakai kategori ini akan kehilangan referensi.`)) return;
    const { error } = await (supabase as any).from("business_categories").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Kategori dihapus"); load(); }
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
    const a = cats[idx], b = cats[swapIdx];
    await Promise.all([
      (supabase as any).from("business_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      (supabase as any).from("business_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  }

  const filtered = useMemo(
    () => cats.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.toLowerCase().includes(q.toLowerCase())),
    [cats, q],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6 text-primary" /> Manajemen Kategori Usaha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur kategori, subtype, fitur, dan tema rekomendasi. Perubahan langsung tampil di onboarding & marketplace.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

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
          <p className="text-sm text-muted-foreground">{q ? "Kategori tidak ditemukan." : "Belum ada kategori."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, idx) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                  <button onClick={() => moveOrder(c.id, "up")} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <span className="text-[10px] text-muted-foreground text-center">{c.sort_order}</span>
                  <button onClick={() => moveOrder(c.id, "down")} disabled={idx === filtered.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.icon_url && <img src={c.icon_url} alt="" className="h-5 w-5 rounded" />}
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.slug}</span>
                    <Badge className={`text-[10px] px-2 py-0 ${c.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {c.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    {c.booking_enabled && (
                      <Badge className="text-[10px] px-2 py-0 bg-blue-100 text-blue-800">Booking{c.booking_type ? ` · ${c.booking_type}` : ""}</Badge>
                    )}
                    {c.recommended_theme_key && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0">tema: {c.recommended_theme_key}</Badge>
                    )}
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.flow_types ?? []).map(f => (
                      <span key={f} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{f}</span>
                    ))}
                    {(c.enabled_features ?? []).slice(0, 8).map(f => (
                      <span key={f} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{f}</span>
                    ))}
                    {(c.enabled_features ?? []).length > 8 && (
                      <span className="text-[10px] text-muted-foreground">+{(c.enabled_features).length - 8}</span>
                    )}
                  </div>
                  {c.subtypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 items-center">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      {c.subtypes.map(s => (
                        <span key={s.slug} className="text-[10px] bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          {s.icon ? `${s.icon} ` : ""}{s.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} className="scale-75" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => deleteCat(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama *</Label>
                <Input placeholder="F&B / Kuliner" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug *</Label>
                <Input placeholder="fnb" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: autoSlug(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">URL Icon</Label>
                <Input placeholder="https://…/icon.svg" value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL Banner</Label>
                <Input placeholder="https://…/banner.jpg" value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tema Rekomendasi</Label>
                <Input placeholder="kuliner-warm / retail-bold / …" value={form.recommended_theme_key} onChange={e => setForm(f => ({ ...f, recommended_theme_key: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Urutan</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sistem Booking</p>
                  <p className="text-xs text-muted-foreground">Aktifkan untuk kategori yang butuh jadwal/booking.</p>
                </div>
                <Switch checked={form.booking_enabled} onCheckedChange={v => setForm(f => ({ ...f, booking_enabled: v }))} />
              </div>
              {form.booking_enabled && (
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.booking_type} onChange={e => setForm(f => ({ ...f, booking_type: e.target.value }))}>
                  <option value="">Pilih tipe…</option>
                  <option value="session">Sesi (salon, klinik, kelas)</option>
                  <option value="rental">Rental (mobil, alat)</option>
                  <option value="both">Keduanya</option>
                </select>
              )}
            </div>

            {/* Flow types */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipe Alur (Flow Types)</Label>
              <div className="flex flex-wrap gap-2">
                {FLOWS.map(f => {
                  const on = form.flow_types.includes(f);
                  return (
                    <button key={f} type="button" onClick={() => toggleFlow(f)}
                      className={`text-xs px-2.5 py-1 rounded border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
                      {f} · {FLOW_TYPE_LABEL[f]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Fitur Aktif ({form.enabled_features.length})</Label>
                <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setForm(f => ({ ...f, enabled_features: [] }))}>Kosongkan</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-60 overflow-y-auto p-2 rounded border border-border bg-muted/30">
                {FEATURE_KEYS.map(k => {
                  const on = form.enabled_features.includes(k);
                  return (
                    <label key={k} className={`flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded cursor-pointer ${on ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleFeature(k)} className="h-3 w-3" />
                      <span className="truncate" title={k}>{FEATURE_LABEL[k as FeatureKey] ?? k}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Subtypes */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Subtype</Label>
              <div className="flex flex-wrap gap-1.5">
                {form.subtypes.map(s => (
                  <span key={s.slug} className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded">
                    {s.icon} {s.label} <span className="text-muted-foreground">({s.slug})</span>
                    <button type="button" onClick={() => removeSubtype(s.slug)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {form.subtypes.length === 0 && <span className="text-[11px] text-muted-foreground">Belum ada subtype.</span>}
              </div>
              <div className="grid grid-cols-12 gap-2 pt-1">
                <Input className="col-span-2 h-8 text-xs" placeholder="🍱" value={subInput.icon} onChange={e => setSubInput(s => ({ ...s, icon: e.target.value }))} />
                <Input className="col-span-5 h-8 text-xs" placeholder="Label (mis. Cloud Kitchen)" value={subInput.label}
                  onChange={e => setSubInput(s => ({ ...s, label: e.target.value, slug: s.slug || autoSlug(e.target.value) }))} />
                <Input className="col-span-3 h-8 text-xs" placeholder="slug" value={subInput.slug}
                  onChange={e => setSubInput(s => ({ ...s, slug: autoSlug(e.target.value) }))} />
                <Button type="button" size="sm" className="col-span-2 h-8" onClick={addSubtype}>Tambah</Button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-sm">Aktif</Label>
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
