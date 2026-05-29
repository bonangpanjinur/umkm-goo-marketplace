import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Pencil, RefreshCw, GripVertical, Info } from "lucide-react";

export const Route = createFileRoute("/pos-app/atribut")({
  head: () => ({ meta: [{ title: "Atribut Produk — Merchant" }] }), component: AtributProduk });

type Category = { id: string; name: string };
type AttributeDef = {
  id: string;
  category_id: string | null;
  name: string;
  key: string;
  field_type: "text" | "number" | "select" | "boolean" | "url";
  options: string[];
  is_required: boolean;
  placeholder: string | null;
  unit: string | null;
  sort_order: number;
};

const FIELD_TYPES = [
  { value: "text",    label: "Teks" },
  { value: "number",  label: "Angka" },
  { value: "select",  label: "Pilihan" },
  { value: "boolean", label: "Ya / Tidak" },
  { value: "url",     label: "URL / Link" },
];

const FIELD_TYPE_BADGE: Record<string, string> = {
  text:    "bg-blue-100 text-blue-700",
  number:  "bg-purple-100 text-purple-700",
  select:  "bg-amber-100 text-amber-700",
  boolean: "bg-green-100 text-green-700",
  url:     "bg-pink-100 text-pink-700",
};

const PRESETS = [
  { label: "Kecantikan", attrs: [
    { name: "No. BPOM", key: "bpom_number", field_type: "text", placeholder: "cth: NA18220XXXXXX" },
    { name: "Kandungan Utama", key: "main_ingredient", field_type: "text" },
    { name: "Ukuran (ml/gr)", key: "size_ml", field_type: "number", unit: "ml" },
  ]},
  { label: "Buku", attrs: [
    { name: "ISBN", key: "isbn", field_type: "text", placeholder: "978-602-XXXXXXXX" },
    { name: "Penulis", key: "author", field_type: "text" },
    { name: "Penerbit", key: "publisher", field_type: "text" },
    { name: "Tahun Terbit", key: "year", field_type: "number" },
    { name: "Jumlah Halaman", key: "pages", field_type: "number", unit: "hal" },
  ]},
  { label: "Elektronik", attrs: [
    { name: "Garansi", key: "warranty", field_type: "select", options: ["6 Bulan", "1 Tahun", "2 Tahun", "Tanpa Garansi"] },
    { name: "Merk", key: "brand", field_type: "text" },
    { name: "Tegangan", key: "voltage", field_type: "text", placeholder: "220V / 5V DC" },
  ]},
  { label: "Fashion", attrs: [
    { name: "Ukuran", key: "size", field_type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
    { name: "Bahan", key: "material", field_type: "text" },
    { name: "Warna", key: "color", field_type: "text" },
  ]},
];

const EMPTY_ATTR: Omit<AttributeDef, "id" | "sort_order"> = {
  category_id: null,
  name: "",
  key: "",
  field_type: "text",
  options: [],
  is_required: false,
  placeholder: null,
  unit: null,
};

function AtributProduk() {
  const { shop } = useShop();
  const [categories, setCategories] = useState<Category[]>([]);
  const [attrs, setAttrs] = useState<AttributeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [selCat, setSelCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeDef | null>(null);
  const [form, setForm] = useState<Omit<AttributeDef, "id" | "sort_order"> & { optionsRaw: string }>({
    ...EMPTY_ATTR, optionsRaw: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const [cats, adefs] = await Promise.all([
      supabase.from("categories").select("id, name").eq("shop_id", shop.id).order("sort_order"),
      supabase.from("product_attribute_defs" as any).select("*").eq("shop_id" as any, shop.id).order("sort_order"),
    ]);
    setCategories((cats.data as Category[]) ?? []);
    setAttrs(((adefs.data as any[]) ?? []).map((a) => ({
      ...a,
      options: Array.isArray(a.options) ? a.options : [],
    })));
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  const openNew = (preset?: { name: string; key: string; field_type: string; placeholder?: string; unit?: string; options?: string[] }) => {
    setEditing(null);
    setForm({
      ...EMPTY_ATTR,
      name: preset?.name ?? "",
      key: preset?.key ?? "",
      field_type: (preset?.field_type as any) ?? "text",
      placeholder: preset?.placeholder ?? null,
      unit: preset?.unit ?? null,
      options: preset?.options ?? [],
      optionsRaw: preset?.options?.join(", ") ?? "",
    });
    setOpen(true);
  };

  const openEdit = (a: AttributeDef) => {
    setEditing(a);
    setForm({ ...a, optionsRaw: a.options.join(", ") });
    setOpen(true);
  };

  const autoKey = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const save = async () => {
    if (!shop?.id) return;
    if (!form.name.trim()) { toast.error("Nama atribut wajib diisi"); return; }
    if (!form.key.trim()) { toast.error("Key atribut wajib diisi"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id,
      name: form.name.trim(),
      key: form.key.trim(),
      field_type: form.field_type,
      category_id: form.category_id || null,
      options: form.field_type === "select"
        ? form.optionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      is_required: form.is_required,
      placeholder: form.placeholder?.trim() || null,
      unit: form.unit?.trim() || null,
    };
    let error: any;
    if (editing) {
      ({ error } = await supabase.from("product_attribute_defs" as any).update(payload).eq("id", editing.id));
    } else {
      payload.sort_order = attrs.length;
      ({ error } = await supabase.from("product_attribute_defs" as any).insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Atribut diperbarui" : "Atribut ditambahkan");
    setOpen(false);
    load();
  };

  const del = async (a: AttributeDef) => {
    if (!confirm(`Hapus atribut "${a.name}"?`)) return;
    setDeleting(a.id);
    const { error } = await supabase.from("product_attribute_defs" as any).delete().eq("id", a.id);
    setDeleting(null);
    if (error) toast.error(error.message);
    else { toast.success("Atribut dihapus"); load(); }
  };

  const visible = attrs.filter((a) => selCat === "all" || a.category_id === selCat || a.category_id === null);
  const getCatName = (id: string | null) => {
    if (!id) return "Semua Kategori";
    return categories.find((c) => c.id === id)?.name ?? "—";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" /> Atribut Produk per Kategori
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tambahkan field khusus per kategori — BPOM, ISBN, ukuran, garansi, dll
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Atribut
          </Button>
        </div>
      </div>

      <Card className="p-4 border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-2 text-blue-800 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Atribut yang Anda buat di sini akan muncul sebagai field tambahan saat membuat/mengedit produk
            pada kategori tersebut. Pembeli juga bisa melihatnya di halaman detail produk.
          </p>
        </div>
      </Card>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preset Cepat</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <div key={p.label} className="rounded-lg border border-border bg-card p-3 min-w-[160px]">
              <p className="text-xs font-semibold mb-2">{p.label}</p>
              <div className="space-y-1">
                {p.attrs.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => openNew(a as any)}
                    className="block w-full rounded-md border border-border/50 bg-muted/50 px-2 py-1 text-left text-xs hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  >
                    <span className="font-medium">{a.name}</span>
                    <span className="ml-1 text-muted-foreground">({a.field_type})</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm font-medium">Filter kategori:</p>
        <div className="flex flex-wrap gap-1">
          {[{ id: "all", name: "Semua" }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelCat(c.id)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selCat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          <Tag className="mx-auto h-8 w-8 mb-2 opacity-40" />
          Belum ada atribut — tambahkan dari preset di atas atau tombol "Tambah Atribut"
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <Card key={a.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{a.key}</code>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${FIELD_TYPE_BADGE[a.field_type]}`}>
                      {FIELD_TYPES.find((t) => t.value === a.field_type)?.label}
                    </span>
                    {a.is_required && <Badge variant="destructive" className="text-[10px]">Wajib</Badge>}
                    <Badge variant="outline" className="text-[10px]">{getCatName(a.category_id)}</Badge>
                  </div>
                  {a.field_type === "select" && a.options.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opsi: {a.options.join(" · ")}
                    </p>
                  )}
                  {(a.placeholder || a.unit) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.placeholder && <>Placeholder: "{a.placeholder}"</>}
                      {a.placeholder && a.unit && "  ·  "}
                      {a.unit && <>Satuan: {a.unit}</>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => del(a)}
                    disabled={deleting === a.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Atribut" : "Tambah Atribut"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nama Atribut *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const n = e.target.value;
                    setForm((f) => ({ ...f, name: n, key: editing ? f.key : autoKey(n) }));
                  }}
                  placeholder="cth: No. BPOM"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Key (unik) *</Label>
                <Input
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="bpom_number"
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipe Field</Label>
                <Select value={form.field_type} onValueChange={(v: any) => setForm((f) => ({ ...f, field_type: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Berlaku untuk Kategori</Label>
                <Select
                  value={form.category_id ?? "all"}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "all" ? null : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.field_type === "select" && (
              <div>
                <Label>Opsi (pisahkan dengan koma)</Label>
                <Input
                  value={form.optionsRaw}
                  onChange={(e) => setForm((f) => ({ ...f, optionsRaw: e.target.value }))}
                  placeholder="S, M, L, XL"
                  className="mt-1"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Placeholder</Label>
                <Input
                  value={form.placeholder ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))}
                  placeholder="Teks petunjuk"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Satuan (unit)</Label>
                <Input
                  value={form.unit ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="ml, gr, cm, pcs…"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm((f) => ({ ...f, is_required: e.target.checked }))}
                className="rounded"
              />
              <Label>Wajib diisi saat tambah produk</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
