import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Stethoscope, Plus, Pencil, Trash2, Loader2, Search, FileText, Calendar, ChevronLeft, ShieldCheck } from "lucide-react";
import { Icd10Picker } from "@/components/Icd10Picker";

export const Route = createFileRoute("/pos-app/patient-records")({
  head: () => ({ meta: [{ title: "Rekam Medis Pasien" }] }),
  component: PatientRecordsPage,
});

type Patient = {
  id: string;
  patient_name: string;
  patient_contact: string | null;
  birth_date: string | null;
  gender: "L" | "P" | "other" | null;
  blood_type: string | null;
  allergies: string | null;
  medical_history: string | null;
  notes: string | null;
  nik: string | null;
  bpjs_number: string | null;
  payer_type: "umum" | "bpjs" | "asuransi" | null;
  created_at: string;
};

type Visit = {
  id: string;
  visit_date: string;
  complaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  icd10_code: string | null;
  icd10_label: string | null;
};

const EMPTY_PATIENT = {
  patient_name: "", patient_contact: "", birth_date: "",
  gender: "" as "" | "L" | "P" | "other", blood_type: "",
  allergies: "", medical_history: "", notes: "",
  nik: "", bpjs_number: "", payer_type: "" as "" | "umum" | "bpjs" | "asuransi",
};
const EMPTY_VISIT = {
  visit_date: new Date().toISOString().slice(0, 16),
  complaint: "", diagnosis: "", treatment: "", prescription: "", notes: "",
  icd10_code: "", icd10_label: "",
};

function PatientRecordsPage() {
  const { shop } = useCurrentShop();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const [pOpen, setPOpen] = useState(false);
  const [pForm, setPForm] = useState(EMPTY_PATIENT);
  const [editingP, setEditingP] = useState<Patient | null>(null);
  const [savingP, setSavingP] = useState(false);

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState(EMPTY_VISIT);
  const [savingV, setSavingV] = useState(false);
  const [editingV, setEditingV] = useState<Visit | null>(null);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("patient_records")
      .select("*")
      .eq("shop_id", shopId)
      .order("patient_name");
    setPatients((data ?? []) as Patient[]);
    setLoading(false);
  }, []);

  const loadVisits = useCallback(async (patientId: string) => {
    setLoadingVisits(true);
    const { data } = await (supabase as any)
      .from("patient_visits")
      .select("*")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false });
    setVisits((data ?? []) as Visit[]);
    setLoadingVisits(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);
  useEffect(() => { if (selected?.id) loadVisits(selected.id); }, [selected?.id, loadVisits]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return patients;
    return patients.filter(p =>
      p.patient_name.toLowerCase().includes(k) || (p.patient_contact ?? "").toLowerCase().includes(k)
    );
  }, [patients, q]);

  const openNewP = () => { setEditingP(null); setPForm(EMPTY_PATIENT); setPOpen(true); };
  const openEditP = (p: Patient) => {
    setEditingP(p);
    setPForm({
      patient_name: p.patient_name,
      patient_contact: p.patient_contact ?? "",
      birth_date: p.birth_date ?? "",
      gender: p.gender ?? "",
      blood_type: p.blood_type ?? "",
      allergies: p.allergies ?? "",
      medical_history: p.medical_history ?? "",
      notes: p.notes ?? "",
      nik: p.nik ?? "",
      bpjs_number: p.bpjs_number ?? "",
      payer_type: p.payer_type ?? "",
    });
    setPOpen(true);
  };

  const saveP = async () => {
    if (!shop || !pForm.patient_name.trim()) { toast.error("Nama pasien wajib diisi"); return; }
    setSavingP(true);
    const payload = {
      shop_id: shop.id,
      patient_name: pForm.patient_name.trim(),
      patient_contact: pForm.patient_contact.trim() || null,
      birth_date: pForm.birth_date || null,
      gender: pForm.gender || null,
      blood_type: pForm.blood_type.trim() || null,
      allergies: pForm.allergies.trim() || null,
      medical_history: pForm.medical_history.trim() || null,
      notes: pForm.notes.trim() || null,
      nik: pForm.nik.trim() || null,
      bpjs_number: pForm.bpjs_number.trim() || null,
      payer_type: pForm.payer_type || null,
    };
    try {
      if (editingP) {
        const { error } = await (supabase as any).from("patient_records").update(payload).eq("id", editingP.id);
        if (error) throw error;
        toast.success("Data pasien diperbarui");
      } else {
        const { error } = await (supabase as any).from("patient_records").insert(payload);
        if (error) throw error;
        toast.success("Pasien baru ditambahkan");
      }
      setPOpen(false);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSavingP(false); }
  };

  const removeP = async (p: Patient) => {
    if (!confirm(`Hapus rekam medis "${p.patient_name}"? Semua riwayat kunjungan akan ikut terhapus.`)) return;
    await (supabase as any).from("patient_records").delete().eq("id", p.id);
    setPatients(prev => prev.filter(x => x.id !== p.id));
    if (selected?.id === p.id) setSelected(null);
    toast.success("Pasien dihapus");
  };

  const openNewV = () => { setEditingV(null); setVForm(EMPTY_VISIT); setVOpen(true); };
  const openEditV = (v: Visit) => {
    setEditingV(v);
    setVForm({
      visit_date: v.visit_date.slice(0, 16),
      complaint: v.complaint ?? "",
      diagnosis: v.diagnosis ?? "",
      treatment: v.treatment ?? "",
      prescription: v.prescription ?? "",
      notes: v.notes ?? "",
      icd10_code: v.icd10_code ?? "",
      icd10_label: v.icd10_label ?? "",
    });
    setVOpen(true);
  };

  const saveV = async () => {
    if (!shop || !selected) return;
    setSavingV(true);
    const payload = {
      shop_id: shop.id,
      patient_id: selected.id,
      visit_date: new Date(vForm.visit_date).toISOString(),
      complaint: vForm.complaint.trim() || null,
      diagnosis: vForm.diagnosis.trim() || null,
      treatment: vForm.treatment.trim() || null,
      prescription: vForm.prescription.trim() || null,
      notes: vForm.notes.trim() || null,
      icd10_code: vForm.icd10_code || null,
      icd10_label: vForm.icd10_label || null,
    };
    try {
      if (editingV) {
        const { error } = await (supabase as any).from("patient_visits").update(payload).eq("id", editingV.id);
        if (error) throw error;
        toast.success("Kunjungan diperbarui");
      } else {
        const { error } = await (supabase as any).from("patient_visits").insert(payload);
        if (error) throw error;
        toast.success("Kunjungan dicatat");
      }
      setVOpen(false);
      loadVisits(selected.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSavingV(false); }
  };

  const removeV = async (v: Visit) => {
    if (!confirm("Hapus catatan kunjungan ini?")) return;
    await (supabase as any).from("patient_visits").delete().eq("id", v.id);
    setVisits(prev => prev.filter(x => x.id !== v.id));
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  // Detail mode
  if (selected) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1.5"><ChevronLeft className="h-4 w-4" /> Kembali ke daftar</Button>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold">{selected.patient_name}</h2>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {selected.patient_contact && <span>📱 {selected.patient_contact}</span>}
                {selected.birth_date && <span>🎂 {new Date(selected.birth_date).toLocaleDateString("id-ID")}</span>}
                {selected.gender && <span>{selected.gender === "L" ? "♂ Laki-laki" : selected.gender === "P" ? "♀ Perempuan" : "Lainnya"}</span>}
                {selected.blood_type && <Badge variant="outline" className="text-xs">Gol. {selected.blood_type}</Badge>}
                {selected.payer_type === "bpjs" && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 text-xs">
                    <ShieldCheck className="h-3 w-3" /> BPJS{selected.bpjs_number ? ` · ${selected.bpjs_number}` : ""}
                  </Badge>
                )}
                {selected.payer_type === "asuransi" && (
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Asuransi</Badge>
                )}
                {selected.payer_type === "umum" && (
                  <Badge variant="outline" className="text-xs">Umum</Badge>
                )}
                {selected.nik && <span className="font-mono text-[10px]">NIK {selected.nik}</span>}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => openEditP(selected)} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit Data</Button>
          </div>
          {(selected.allergies || selected.medical_history || selected.notes) && (
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              {selected.allergies && <div><div className="text-xs font-semibold text-destructive">Alergi</div><p className="text-muted-foreground">{selected.allergies}</p></div>}
              {selected.medical_history && <div><div className="text-xs font-semibold">Riwayat Medis</div><p className="text-muted-foreground">{selected.medical_history}</p></div>}
              {selected.notes && <div><div className="text-xs font-semibold">Catatan</div><p className="text-muted-foreground">{selected.notes}</p></div>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Riwayat Kunjungan ({visits.length})</h3>
          <Button size="sm" onClick={openNewV} className="gap-1.5"><Plus className="h-4 w-4" /> Catat Kunjungan</Button>
        </div>

        {loadingVisits ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : visits.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Belum ada kunjungan. Catat kunjungan pertama untuk pasien ini.
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map(v => (
              <div key={v.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="h-4 w-4 text-primary" />
                    {new Date(v.visit_date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditV(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeV(v)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {v.icd10_code && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs">
                    <Stethoscope className="h-3 w-3 text-primary" />
                    <span className="font-mono font-semibold text-primary">{v.icd10_code}</span>
                    <span className="text-muted-foreground">{v.icd10_label}</span>
                  </div>
                )}
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {v.complaint && <div><span className="font-medium">Keluhan:</span> <span className="text-muted-foreground">{v.complaint}</span></div>}
                  {v.diagnosis && <div><span className="font-medium">Diagnosis:</span> <span className="text-muted-foreground">{v.diagnosis}</span></div>}
                  {v.treatment && <div><span className="font-medium">Tindakan:</span> <span className="text-muted-foreground">{v.treatment}</span></div>}
                  {v.prescription && <div><span className="font-medium">Resep:</span> <span className="text-muted-foreground">{v.prescription}</span></div>}
                  {v.notes && <div className="sm:col-span-2"><span className="font-medium">Catatan:</span> <span className="text-muted-foreground">{v.notes}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Patient edit dialog */}
        <Dialog open={pOpen} onOpenChange={setPOpen}>
          <PatientDialog form={pForm} setForm={setPForm} editing={!!editingP} saving={savingP} onSave={saveP} onCancel={() => setPOpen(false)} />
        </Dialog>

        {/* Visit dialog */}
        <Dialog open={vOpen} onOpenChange={setVOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingV ? "Edit Kunjungan" : "Catat Kunjungan Baru"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Tanggal & Jam <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={vForm.visit_date} onChange={e => setVForm(f => ({ ...f, visit_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Keluhan Pasien</Label>
                <Textarea rows={2} value={vForm.complaint} onChange={e => setVForm(f => ({ ...f, complaint: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Diagnosis (Narasi)</Label>
                <Textarea rows={2} value={vForm.diagnosis} onChange={e => setVForm(f => ({ ...f, diagnosis: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Diagnosis ICD-10</Label>
                <Icd10Picker
                  value={vForm.icd10_code ? { code: vForm.icd10_code, label: vForm.icd10_label } : null}
                  onChange={(v) => setVForm(f => ({ ...f, icd10_code: v?.code ?? "", icd10_label: v?.label ?? "" }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tindakan / Treatment</Label>
                <Textarea rows={2} value={vForm.treatment} onChange={e => setVForm(f => ({ ...f, treatment: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Resep Obat</Label>
                <Textarea rows={2} value={vForm.prescription} onChange={e => setVForm(f => ({ ...f, prescription: e.target.value }))} placeholder="Paracetamol 500mg 3x1, Amoxicillin..." />
              </div>
              <div className="space-y-1.5">
                <Label>Catatan Tambahan</Label>
                <Textarea rows={2} value={vForm.notes} onChange={e => setVForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVOpen(false)}>Batal</Button>
              <Button onClick={saveV} disabled={savingV}>{savingV && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingV ? "Simpan" : "Catat"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List mode
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Stethoscope className="h-5 w-5 text-primary" /> Rekam Medis Pasien
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kelola data pasien & riwayat kunjungan klinik (KL-03).
          </p>
        </div>
        <Button onClick={openNewP} className="gap-1.5"><Plus className="h-4 w-4" /> Pasien Baru</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama atau nomor HP..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q ? "Tidak ada pasien cocok." : "Belum ada pasien terdaftar."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.patient_name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.patient_contact && <span>{p.patient_contact}</span>}
                    {p.allergies && <span className="text-destructive">⚠ Alergi</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="text-xs text-primary"><FileText className="inline h-3.5 w-3.5 mr-1" />Lihat</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeP(p); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <PatientDialog form={pForm} setForm={setPForm} editing={!!editingP} saving={savingP} onSave={saveP} onCancel={() => setPOpen(false)} />
      </Dialog>
    </div>
  );
}

function PatientDialog({ form, setForm, editing, saving, onSave, onCancel }: {
  form: typeof EMPTY_PATIENT;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_PATIENT>>;
  editing: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Edit Data Pasien" : "Pasien Baru"}</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
          <Input value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>No. HP / Kontak</Label>
            <Input value={form.patient_contact} onChange={e => setForm(f => ({ ...f, patient_contact: e.target.value }))} placeholder="08xxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal Lahir</Label>
            <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as any }))}>
              <option value="">—</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Gol. Darah</Label>
            <Input value={form.blood_type} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))} placeholder="A / B / AB / O" />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identitas & Penjamin</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>NIK</Label>
              <Input inputMode="numeric" maxLength={16} value={form.nik}
                onChange={e => setForm(f => ({ ...f, nik: e.target.value.replace(/\D/g, "") }))}
                placeholder="16 digit NIK" />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Penjamin</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.payer_type}
                onChange={e => setForm(f => ({ ...f, payer_type: e.target.value as any }))}>
                <option value="">—</option>
                <option value="umum">Umum</option>
                <option value="bpjs">BPJS Kesehatan</option>
                <option value="asuransi">Asuransi Swasta</option>
              </select>
            </div>
          </div>
          {form.payer_type === "bpjs" && (
            <div className="space-y-1.5">
              <Label>No. Kartu BPJS</Label>
              <Input inputMode="numeric" maxLength={13} value={form.bpjs_number}
                onChange={e => setForm(f => ({ ...f, bpjs_number: e.target.value.replace(/\D/g, "") }))}
                placeholder="13 digit nomor BPJS" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Alergi</Label>
          <Textarea rows={2} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Alergi obat / makanan…" />
        </div>
        <div className="space-y-1.5">
          <Label>Riwayat Medis</Label>
          <Textarea rows={2} value={form.medical_history} onChange={e => setForm(f => ({ ...f, medical_history: e.target.value }))} placeholder="Hipertensi, diabetes, dsb." />
        </div>
        <div className="space-y-1.5">
          <Label>Catatan</Label>
          <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={onSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Simpan" : "Tambah Pasien"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
