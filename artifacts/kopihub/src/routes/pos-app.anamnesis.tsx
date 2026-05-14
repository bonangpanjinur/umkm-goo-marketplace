import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
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
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Eye, ChevronDown, CheckCircle2, Search, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/pos-app/anamnesis")({
  head: () => ({ meta: [{ title: "Anamnesis Digital" }] }),
  component: AnamnesisPage,
});

type AnamnesisForm = {
  id: string;
  patient_name: string;
  booking_id: string | null;
  chief_complaint: string;
  history: string;
  allergies: string;
  current_medications: string;
  vital_notes: string;
  submitted_at: string;
  reviewed: boolean;
};

type FormTemplate = {
  id: string;
  title: string;
  is_active: boolean;
  fields: { id: string; label: string; type: string; required: boolean }[];
};

const DEFAULT_FIELDS = [
  { id: "f1", label: "Keluhan Utama", type: "textarea", required: true },
  { id: "f2", label: "Riwayat Penyakit", type: "textarea", required: false },
  { id: "f3", label: "Alergi", type: "text", required: false },
  { id: "f4", label: "Obat yang Sedang Dikonsumsi", type: "text", required: false },
  { id: "f5", label: "Tekanan Darah / Catatan Vital", type: "text", required: false },
];

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.anamnesis_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  chief_complaint text NOT NULL,
  history text,
  allergies text,
  current_medications text,
  vital_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed boolean NOT NULL DEFAULT false
);`;

function fmtDT(d: string) { return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

export default function AnamnesisPage() {
  const { shop } = useCurrentShop();
  const [forms, setForms] = useState<AnamnesisForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AnamnesisForm | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_name: "", chief_complaint: "", history: "", allergies: "", current_medications: "", vital_notes: "" });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("anamnesis_forms").select("*").eq("shop_id", shopId)
      .order("submitted_at", { ascending: false }).limit(100);
    if (error?.message?.includes("exist")) setShowSql(true);
    setForms((data ?? []) as AnamnesisForm[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !form.patient_name.trim() || !form.chief_complaint.trim()) {
      toast.error("Nama pasien & keluhan wajib diisi"); return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("anamnesis_forms").insert({ shop_id: shop.id, ...form });
      if (error) throw error;
      toast.success("Anamnesis disimpan");
      setAdding(false);
      setForm({ patient_name: "", chief_complaint: "", history: "", allergies: "", current_medications: "", vital_notes: "" });
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const markReviewed = async (id: string) => {
    await (supabase as any).from("anamnesis_forms").update({ reviewed: true }).eq("id", id);
    setForms(prev => prev.map(f => f.id === id ? { ...f, reviewed: true } : f));
    if (selected?.id === id) setSelected(s => s ? { ...s, reviewed: true } : s);
    toast.success("Ditandai sudah diperiksa");
  };

  const filtered = forms.filter(f =>
    !search.trim() || f.patient_name.toLowerCase().includes(search.toLowerCase()) || f.chief_complaint.toLowerCase().includes(search.toLowerCase())
  );

  const unreviewed = forms.filter(f => !f.reviewed).length;

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ClipboardList className="h-5 w-5 text-primary" /> Anamnesis Digital</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Form keluhan pasien sebelum konsultasi — dapat diisi via link sebelum tiba.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(shop.id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button onClick={() => setAdding(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Manual</Button>
        </div>
      </div>

      {unreviewed > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
          <ClipboardList className="h-4 w-4 shrink-0 mt-0.5" />
          <span><strong>{unreviewed} form</strong> belum diperiksa dokter/terapis.</span>
        </div>
      )}
      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel anamnesis belum ada:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama pasien atau keluhan..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada form anamnesis. Pasien bisa mengisi via link sebelum kunjungan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <button key={f.id} onClick={() => setSelected(f)}
              className={`w-full text-left rounded-xl border p-4 hover:bg-accent/20 transition ${!f.reviewed ? "border-amber-200 bg-amber-50/40" : "bg-card"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{f.patient_name}</span>
                    {!f.reviewed && <Badge className="bg-amber-100 text-amber-700 text-xs">Belum Diperiksa</Badge>}
                    {f.reviewed && <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Sudah Diperiksa</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Keluhan: {f.chief_complaint}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmtDT(f.submitted_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Anamnesis — {selected.patient_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg bg-muted/30 border p-3 space-y-2">
                {[
                  { label: "Keluhan Utama", val: selected.chief_complaint },
                  { label: "Riwayat Penyakit", val: selected.history },
                  { label: "Alergi", val: selected.allergies },
                  { label: "Obat Dikonsumsi", val: selected.current_medications },
                  { label: "Catatan Vital", val: selected.vital_notes },
                ].map(item => item.val && (
                  <div key={item.label}>
                    <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                    <p>{item.val}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Diisi: {fmtDT(selected.submitted_at)}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Tutup</Button>
              {!selected.reviewed && (
                <Button onClick={() => { markReviewed(selected.id); setSelected(null); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Tandai Diperiksa
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add manual dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tambah Anamnesis Manual</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: "patient_name", label: "Nama Pasien *", placeholder: "Nama lengkap" },
              { key: "chief_complaint", label: "Keluhan Utama *", placeholder: "Sakit kepala, demam, dll.", multiline: true },
              { key: "history", label: "Riwayat Penyakit", placeholder: "Diabetes, hipertensi, dll.", multiline: true },
              { key: "allergies", label: "Alergi", placeholder: "Penisilin, seafood, dll." },
              { key: "current_medications", label: "Obat Sedang Dikonsumsi", placeholder: "Nama obat, dosis" },
              { key: "vital_notes", label: "Catatan Vital", placeholder: "TD: 120/80, HR: 80" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                {f.multiline
                  ? <Textarea rows={2} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  : <Input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                }
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
