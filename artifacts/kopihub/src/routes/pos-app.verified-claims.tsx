import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Plus, Pencil, Trash2, Loader2, CheckCircle2, Upload, Info, RefreshCw, Award, X } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";

export const Route = createFileRoute("/pos-app/verified-claims")({
  head: () => ({ meta: [{ title: "Klaim Verifikasi Produk" }] }),
  component: VerifiedClaimsPage,
});

type Claim = {
  id: string;
  label: string;
  badge_type: string;
  evidence_url: string | null;
  description: string | null;
  is_verified: boolean;
  is_active: boolean;
  linked_product_ids: string[];
};

const BADGE_TYPES = [
  { value: "dermatologist", label: "Dermatologically Tested", color: "bg-blue-100 text-blue-800", icon: "🔬" },
  { value: "hypoallergenic", label: "Hypoallergenic", color: "bg-green-100 text-green-800", icon: "🌿" },
  { value: "bpom", label: "BPOM Registered", color: "bg-amber-100 text-amber-800", icon: "✅" },
  { value: "halal", label: "Halal Certified", color: "bg-emerald-100 text-emerald-800", icon: "☪️" },
  { value: "cruelty_free", label: "Cruelty Free", color: "bg-pink-100 text-pink-800", icon: "🐰" },
  { value: "organic", label: "Organic / Natural", color: "bg-lime-100 text-lime-800", icon: "🌱" },
  { value: "custom", label: "Custom Claim", color: "bg-purple-100 text-purple-800", icon: "🏷️" },
];

export default function VerifiedClaimsPage() {
  const { shop } = useCurrentShop();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Claim | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", badge_type: "dermatologist", evidence_url: "", description: "", is_active: true });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shop_product_claims").select("*").eq("shop_id", shopId).order("created_at");
    if (error?.message?.includes("exist")) setShowSql(true);
    setClaims((data ?? []) as Claim[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => { setEditing(null); setForm({ label: "", badge_type: "dermatologist", evidence_url: "", description: "", is_active: true }); setOpen(true); };
  const openEdit = (c: Claim) => { setEditing(c); setForm({ label: c.label, badge_type: c.badge_type, evidence_url: c.evidence_url ?? "", description: c.description ?? "", is_active: c.is_active }); setOpen(true); };

  const save = async () => {
    if (!shop || !form.label.trim()) { toast.error("Label wajib diisi"); return; }
    setSaving(true);
    try {
      const bt = BADGE_TYPES.find(b => b.value === form.badge_type);
      const payload = {
        shop_id: shop.id,
        label: form.label.trim() || bt?.label || form.badge_type,
        badge_type: form.badge_type,
        evidence_url: form.evidence_url.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (editing) { await (supabase as any).from("shop_product_claims").update(payload).eq("id", editing.id); }
      else { await (supabase as any).from("shop_product_claims").insert(payload); }
      toast.success("Klaim disimpan — menunggu verifikasi admin");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("shop_product_claims").delete().eq("id", id);
    setClaims(prev => prev.filter(x => x.id !== id));
    toast.success("Klaim dihapus");
  };

  const toggle = async (c: Claim) => {
    await (supabase as any).from("shop_product_claims").update({ is_active: !c.is_active }).eq("id", c.id);
    setClaims(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> Klaim Verifikasi Produk</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Tambah badge klaim terverifikasi — tampil di halaman produk untuk meningkatkan kepercayaan pembeli.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Klaim</Button>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2 text-xs text-blue-800">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>Klaim yang membutuhkan verifikasi (mis. BPOM, Halal, Dermatologist) akan ditinjau oleh admin platform sebelum tampil dengan badge <strong>✓ Terverifikasi</strong>.</span>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : claims.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada klaim verifikasi</p>
          <p className="text-sm mt-1">Tambah klaim "Dermatologically Tested", "BPOM", dll. untuk meningkatkan konversi.</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Tambah Klaim Pertama</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map(c => {
            const bt = BADGE_TYPES.find(b => b.value === c.badge_type);
            return (
              <div key={c.id} className={`rounded-xl border bg-card p-4 ${!c.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${bt?.color ?? "bg-gray-100 text-gray-700"}`}>
                      {bt?.icon ?? "🏷️"} {c.label}
                    </span>
                    {c.is_verified && (
                      <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Terverifikasi</Badge>
                    )}
                    {!c.is_verified && (
                      <Badge variant="secondary" className="text-xs">Menunggu Verifikasi</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {c.description && <p className="text-xs text-muted-foreground mt-2">{c.description}</p>}
                {c.evidence_url && (
                  <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                    Lihat Bukti Dokumen →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Klaim" : "Tambah Klaim Verifikasi"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipe Klaim</Label>
              <div className="grid grid-cols-2 gap-2">
                {BADGE_TYPES.map(b => (
                  <button key={b.value} onClick={() => setForm(f => ({ ...f, badge_type: b.value, label: b.label }))}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition ${form.badge_type === b.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                    <span>{b.icon}</span>
                    <span className="text-xs font-medium">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Label Kustom (opsional)</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Misal: Clinically Tested" />
            </div>
            <div className="space-y-1.5">
              <Label>Bukti / Sertifikat (opsional)</Label>
              <UploadableImage value={form.evidence_url || null} onChange={(url) => setForm(f => ({ ...f, evidence_url: url ?? "" }))} bucket="shop-images" pathPrefix={`${shop?.id ?? ""}/claims`} hint="Foto sertifikat/bukti, JPG/PNG/WebP maks 5 MB" />
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan Tambahan (opsional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Teruji oleh lab XYZ tahun 2024" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Tampilkan di produk</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Simpan Klaim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
