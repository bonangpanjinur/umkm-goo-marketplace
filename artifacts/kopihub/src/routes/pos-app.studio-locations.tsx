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
import { MapPin, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Building2, Trees, Home } from "lucide-react";

export const Route = createFileRoute("/pos-app/studio-locations")({
  head: () => ({ meta: [{ title: "Lokasi Sesi Foto" }] }),
  component: StudioLocationsPage,
});

type Loc = {
  id: string;
  name: string;
  location_type: "studio" | "outdoor" | "client";
  address: string | null;
  description: string | null;
  extra_fee: number;
  travel_radius_km: number | null;
  is_active: boolean;
  sort_order: number;
};

const TYPE_META: Record<Loc["location_type"], { label: string; icon: typeof Building2; color: string }> = {
  studio:  { label: "Di studio",       icon: Building2, color: "text-blue-600 bg-blue-50" },
  outdoor: { label: "Outdoor",         icon: Trees,     color: "text-emerald-600 bg-emerald-50" },
  client:  { label: "Lokasi klien",    icon: Home,      color: "text-amber-600 bg-amber-50" },
};

const EMPTY = {
  name: "",
  location_type: "studio" as Loc["location_type"],
  address: "",
  description: "",
  extra_fee: "0",
  travel_radius_km: "",
  is_active: true,
};

function StudioLocationsPage() {
  const { shop } = useCurrentShop();
  const [items, setItems] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Loc | null>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("studio_locations")
      .select("*")
      .eq("shop_id", shopId)
      .order("sort_order");
    setItems((data ?? []) as Loc[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (l: Loc) => {
    setEditing(l);
    setForm({
      name: l.name,
      location_type: l.location_type,
      address: l.address ?? "",
      description: l.description ?? "",
      extra_fee: String(l.extra_fee ?? 0),
      travel_radius_km: l.travel_radius_km ? String(l.travel_radius_km) : "",
      is_active: l.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.name.trim()) { toast.error("Nama lokasi wajib diisi"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      name: form.name.trim(),
      location_type: form.location_type,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      extra_fee: Number(form.extra_fee) || 0,
      travel_radius_km: form.travel_radius_km ? Number(form.travel_radius_km) : null,
      is_active: form.is_active,
      sort_order: editing?.sort_order ?? items.length,
    };
    try {
      if (editing) {
        const { error } = await (supabase as any).from("studio_locations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Lokasi diperbarui");
      } else {
        const { error } = await (supabase as any).from("studio_locations").insert(payload);
        if (error) throw error;
        toast.success("Lokasi ditambahkan");
      }
      setOpen(false);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const toggle = async (l: Loc) => {
    await (supabase as any).from("studio_locations").update({ is_active: !l.is_active }).eq("id", l.id);
    setItems(prev => prev.map(p => p.id === l.id ? { ...p, is_active: !p.is_active } : p));
  };
  const remove = async (l: Loc) => {
    if (!confirm(`Hapus lokasi "${l.name}"?`)) return;
    await (supabase as any).from("studio_locations").delete().eq("id", l.id);
    setItems(prev => prev.filter(p => p.id !== l.id));
    toast.success("Lokasi dihapus");
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MapPin className="h-5 w-5 text-primary" /> Lokasi Sesi Foto
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Klien bisa pilih lokasi sesi: di studio, outdoor, atau di lokasi klien — dengan biaya tambahan opsional.
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Lokasi</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <MapPin className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada lokasi</p>
          <p className="text-sm mt-1">Tambahkan opsi lokasi sesi (studio / outdoor / lokasi klien)</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Tambah Lokasi</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(l => {
            const meta = TYPE_META[l.location_type];
            const Icon = meta.icon;
            return (
              <div key={l.id} className={`rounded-xl border bg-card p-4 ${!l.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`rounded-lg p-2 ${meta.color}`}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{l.name}</span>
                        <Badge variant="secondary" className="text-xs">{meta.label}</Badge>
                        {!l.is_active && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                      </div>
                      {l.address && <p className="text-xs text-muted-foreground mt-1">{l.address}</p>}
                      {l.description && <p className="text-xs text-muted-foreground mt-1">{l.description}</p>}
                      {(l.extra_fee > 0 || l.travel_radius_km) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {l.extra_fee > 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">+{formatIDR(l.extra_fee)}</span>}
                          {l.travel_radius_km && <span className="bg-muted px-2 py-0.5 rounded-full">Radius {l.travel_radius_km} km</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle(l)}>
                      {l.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Tips:</strong> Opsi lokasi tampil di halaman booking <code className="bg-blue-100 px-1 rounded">/toko/[slug]/booking</code>.
        Biaya tambahan akan otomatis ditambahkan ke total.
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Lokasi" : "Tambah Lokasi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipe Lokasi <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_META) as Loc["location_type"][]).map(t => {
                  const m = TYPE_META[t]; const Ic = m.icon;
                  const active = form.location_type === t;
                  return (
                    <button
                      key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, location_type: t }))}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition ${active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      <Ic className="h-4 w-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Lokasi <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Studio Utama / Pantai Sanur / Rumah klien" />
            </div>

            <div className="space-y-1.5">
              <Label>Alamat (opsional)</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. Raya Kuta No. 123" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Biaya Tambahan (Rp)</Label>
                <Input type="number" min={0} value={form.extra_fee} onChange={e => setForm(f => ({ ...f, extra_fee: e.target.value }))} />
              </div>
              {form.location_type === "client" && (
                <div className="space-y-1.5">
                  <Label>Radius Maks. (km)</Label>
                  <Input type="number" min={0} value={form.travel_radius_km} onChange={e => setForm(f => ({ ...f, travel_radius_km: e.target.value }))} placeholder="20" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Studio dengan pencahayaan natural..." />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded" />
              <Label htmlFor="active" className="cursor-pointer">Aktif (tampil di booking)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
