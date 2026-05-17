import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/prescriptions")({
  head: () => ({ meta: [{ title: "Resep Digital — Klinik" }] }),
  component: Page,
});

type Item = { id?: string; medication_id?: string | null; name_snapshot: string; dose?: string; frequency?: string; duration?: string; qty: number; instructions?: string };
type Row = {
  id: string; patient_id: string | null; doctor_name: string | null; issued_at: string;
  diagnosis: string | null; notes: string | null; status: string;
};
type Med = { id: string; name: string; dose: string | null };
type Patient = { id: string; name: string };

const STATUS = ["draft","issued","dispensed","cancelled"];

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", doctor_name: "", diagnosis: "", notes: "", status: "draft",
    items: [] as Item[],
  });

  async function load() {
    if (!shop) return;
    const [{ data: d1 }, { data: d2 }, { data: d3 }] = await Promise.all([
      supabase.from("prescriptions").select("*").eq("shop_id", shop.id).order("issued_at", { ascending: false }),
      supabase.from("medications").select("id,name,dose").eq("shop_id", shop.id).eq("is_active", true).order("name"),
      supabase.from("patient_records").select("id,name").eq("shop_id", shop.id).order("name").limit(200),
    ]);
    setItems((d1 ?? []) as Row[]);
    setMeds((d2 ?? []) as Med[]);
    setPatients((d3 ?? []) as Patient[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() {
    setEditing(null);
    setForm({ patient_id: "", doctor_name: "", diagnosis: "", notes: "", status: "draft", items: [] });
    setOpenForm(true);
  }
  async function startEdit(r: Row) {
    setEditing(r);
    const { data } = await supabase.from("prescription_items").select("*").eq("prescription_id", r.id);
    setForm({
      patient_id: r.patient_id ?? "", doctor_name: r.doctor_name ?? "",
      diagnosis: r.diagnosis ?? "", notes: r.notes ?? "", status: r.status,
      items: (data ?? []) as Item[],
    });
    setOpenForm(true);
  }
  function addItem() {
    setForm({ ...form, items: [...form.items, { name_snapshot: "", qty: 1 }] });
  }
  function updItem(idx: number, patch: Partial<Item>) {
    const it = [...form.items]; it[idx] = { ...it[idx], ...patch }; setForm({ ...form, items: it });
  }
  function delItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }
  function pickMed(idx: number, medId: string) {
    const m = meds.find(x => x.id === medId);
    if (m) updItem(idx, { medication_id: medId, name_snapshot: m.name, dose: m.dose ?? "" });
  }

  async function save() {
    if (!shop) return;
    setSaving(true);
    const head: any = {
      shop_id: shop.id, patient_id: form.patient_id || null,
      doctor_name: form.doctor_name || null, diagnosis: form.diagnosis || null,
      notes: form.notes || null, status: form.status,
    };
    let presId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("prescriptions").update(head).eq("id", editing.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      await supabase.from("prescription_items").delete().eq("prescription_id", editing.id);
    } else {
      const { data, error } = await supabase.from("prescriptions").insert(head).select("id").single();
      if (error || !data) { setSaving(false); toast.error(error?.message ?? "Gagal"); return; }
      presId = data.id;
    }
    if (form.items.length > 0 && presId) {
      const rows = form.items.filter(i => i.name_snapshot.trim()).map(i => ({
        prescription_id: presId,
        medication_id: i.medication_id || null,
        name_snapshot: i.name_snapshot.trim(),
        dose: i.dose || null, frequency: i.frequency || null, duration: i.duration || null,
        qty: i.qty || 1, instructions: i.instructions || null,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from("prescription_items").insert(rows);
        if (error) { setSaving(false); toast.error(error.message); return; }
      }
    }
    setSaving(false);
    toast.success("Tersimpan"); setOpenForm(false); void load();
  }
  async function del(r: Row) {
    if (!confirm("Hapus resep ini?")) return;
    const { error } = await supabase.from("prescriptions").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Resep Digital</h1>
          <p className="text-sm text-muted-foreground">Resep dokter dengan stok obat & aturan pakai</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Resep Baru</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada resep.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Tanggal</th><th className="p-3">Pasien</th>
                <th className="p-3">Dokter</th><th className="p-3">Diagnosis</th>
                <th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const p = patients.find(x => x.id === r.patient_id);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-xs">{new Date(r.issued_at).toLocaleDateString("id-ID")}</td>
                    <td className="p-3">{p?.name ?? "—"}</td>
                    <td className="p-3 text-xs">{r.doctor_name ?? "—"}</td>
                    <td className="p-3 text-xs">{r.diagnosis ?? "—"}</td>
                    <td className="p-3"><Badge variant="secondary">{r.status}</Badge></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" className="ml-1" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Resep" : "Resep Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pasien</Label>
                <Select value={form.patient_id || "none"} onValueChange={(v) => setForm({ ...form, patient_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tanpa data</SelectItem>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Dokter</Label><Input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
            </div>
            <div><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Daftar Obat</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Tambah Obat</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, i) => (
                  <Card key={i} className="p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Pilih dari Stok</Label>
                        <Select value={it.medication_id || "manual"} onValueChange={(v) => v === "manual" ? updItem(i, { medication_id: null }) : pickMed(i, v)}>
                          <SelectTrigger><SelectValue placeholder="Input manual" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Input manual</SelectItem>
                            {meds.map(m => <SelectItem key={m.id} value={m.id}>{m.name} {m.dose ?? ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2"><Label className="text-xs">Nama Obat</Label><Input value={it.name_snapshot} onChange={(e) => updItem(i, { name_snapshot: e.target.value })} /></div>
                      <div><Label className="text-xs">Dosis</Label><Input value={it.dose ?? ""} onChange={(e) => updItem(i, { dose: e.target.value })} /></div>
                      <div><Label className="text-xs">Frekuensi</Label><Input placeholder="3x sehari" value={it.frequency ?? ""} onChange={(e) => updItem(i, { frequency: e.target.value })} /></div>
                      <div><Label className="text-xs">Durasi</Label><Input placeholder="7 hari" value={it.duration ?? ""} onChange={(e) => updItem(i, { duration: e.target.value })} /></div>
                      <div><Label className="text-xs">Qty</Label><Input type="number" value={it.qty} onChange={(e) => updItem(i, { qty: Number(e.target.value) })} /></div>
                      <div className="col-span-2"><Label className="text-xs">Aturan Pakai</Label><Input value={it.instructions ?? ""} onChange={(e) => updItem(i, { instructions: e.target.value })} /></div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => delItem(i)}><Trash2 className="h-3 w-3 mr-1" />Hapus</Button>
                  </Card>
                ))}
              </div>
            </div>
            <div><Label>Catatan</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
