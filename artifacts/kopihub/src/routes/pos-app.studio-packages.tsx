import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Camera, Plus, Pencil, Loader2, Trash2, Clock, Users, CheckCircle2,
  GripVertical, Eye, EyeOff,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/studio-packages")({
  head: () => ({ meta: [{ title: "Paket Sesi Foto" }] }),
  component: StudioPackagesPage,
});

type StudioPackage = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string;
  includes: string[];
  max_capacity: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.studio_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  price numeric(12,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  includes text[] NOT NULL DEFAULT '{}',
  max_capacity int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const EMPTY_FORM = {
  name: "",
  duration_minutes: "60",
  price: "",
  description: "",
  includes_raw: "",
  max_capacity: "1",
  is_active: true,
};

function fmtDuration(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export default function StudioPackagesPage() {
  const { shop } = useCurrentShop();
  const [packages, setPackages] = useState<StudioPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StudioPackage | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("studio_packages")
      .select("*")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true });
    if (error?.message?.includes("exist")) setShowSql(true);
    setPackages((data ?? []) as StudioPackage[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (pkg: StudioPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      duration_minutes: String(pkg.duration_minutes),
      price: String(pkg.price),
      description: pkg.description,
      includes_raw: pkg.includes.join("\n"),
      max_capacity: String(pkg.max_capacity),
      is_active: pkg.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.name.trim() || !form.price) {
      toast.error("Nama paket & harga wajib diisi");
      return;
    }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      name: form.name.trim(),
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
      description: form.description.trim(),
      includes: form.includes_raw.split("\n").map(s => s.trim()).filter(Boolean),
      max_capacity: Number(form.max_capacity),
      is_active: form.is_active,
      sort_order: editing?.sort_order ?? packages.length,
    };
    try {
      if (editing) {
        const { error } = await (supabase as any)
          .from("studio_packages").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Paket diperbarui");
      } else {
        const { error } = await (supabase as any)
          .from("studio_packages").insert(payload);
        if (error) throw error;
        toast.success("Paket baru ditambahkan");
      }
      setOpen(false);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pkg: StudioPackage) => {
    await (supabase as any)
      .from("studio_packages")
      .update({ is_active: !pkg.is_active })
      .eq("id", pkg.id);
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p));
    toast.success(pkg.is_active ? "Paket disembunyikan" : "Paket diaktifkan");
  };

  const remove = async (pkg: StudioPackage) => {
    if (!confirm(`Hapus paket "${pkg.name}"?`)) return;
    await (supabase as any).from("studio_packages").delete().eq("id", pkg.id);
    setPackages(prev => prev.filter(p => p.id !== pkg.id));
    toast.success("Paket dihapus");
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Camera className="h-5 w-5 text-primary" /> Paket Sesi Foto
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Buat paket sesi (Basic, Standard, Premium) — tampil di halaman booking klien.
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada — jalankan SQL berikut di Supabase:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Camera className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada paket sesi</p>
          <p className="text-sm mt-1">Tambahkan paket Basic, Standard, atau Premium untuk klienmu</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}>
            <Plus className="h-4 w-4" /> Tambah Paket Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className={`rounded-xl border bg-card overflow-hidden transition-opacity ${!pkg.is_active ? "opacity-60" : ""}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0 cursor-grab" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{pkg.name}</span>
                        {!pkg.is_active && (
                          <Badge variant="secondary" className="text-xs">Tidak aktif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtDuration(pkg.duration_minutes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> Maks {pkg.max_capacity} orang
                        </span>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                      )}
                      {pkg.includes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pkg.includes.map((item, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="h-2.5 w-2.5" /> {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-lg">{formatIDR(pkg.price)}</p>
                    <div className="flex gap-1 mt-2 justify-end">
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleActive(pkg)}
                        title={pkg.is_active ? "Sembunyikan" : "Aktifkan"}
                      >
                        {pkg.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(pkg)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => remove(pkg)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Tips:</strong> Paket akan tampil di halaman booking klien <code className="bg-blue-100 px-1 rounded">/toko/[slug]/booking</code>.
        Kamu bisa buat 3 tier: <strong>Basic</strong> (1 jam, foto standar),{" "}
        <strong>Standard</strong> (2 jam + editing), <strong>Premium</strong> (full day + album).
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              {editing ? "Edit Paket" : "Tambah Paket Sesi"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Paket <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Basic 1 Jam, Standard, Premium Full Day"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Harga (Rp) <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min={0}
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Durasi (menit)</Label>
                <Input
                  type="number" min={15} step={15}
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="60"
                />
                {Number(form.duration_minutes) > 0 && (
                  <p className="text-xs text-muted-foreground">{fmtDuration(Number(form.duration_minutes))}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Maks. Orang per Sesi</Label>
              <Input
                type="number" min={1}
                value={form.max_capacity}
                onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi Singkat</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Cocok untuk foto keluarga, couple, atau individu dengan 2 outfit…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Yang Termasuk (satu per baris)</Label>
              <Textarea
                rows={4}
                value={form.includes_raw}
                onChange={e => setForm(f => ({ ...f, includes_raw: e.target.value }))}
                placeholder={"1 outfit\n10 foto retouched\nSoft file resolusi penuh\nMakeup tidak termasuk"}
              />
              <p className="text-xs text-muted-foreground">Setiap baris akan tampil sebagai item ✓ di halaman booking</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Aktif (tampil di halaman booking)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              {editing ? "Simpan Perubahan" : "Tambah Paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
