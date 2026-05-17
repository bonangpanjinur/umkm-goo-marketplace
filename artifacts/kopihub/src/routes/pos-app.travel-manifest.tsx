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
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/travel-manifest")({
  head: () => ({ meta: [{ title: "Manifest Jamaah — Merchant" }] }),
  component: Page,
});

type Row = {
  id: string; package_id: string | null; full_name: string; nik: string | null;
  passport_number: string | null; passport_expiry: string | null; birth_date: string | null;
  gender: string | null; phone: string | null; email: string | null; address: string | null;
  emergency_contact: string | null; special_needs: string | null; room_assignment: string | null;
  status: string; notes: string | null;
};
type Pkg = { id: string; name: string };

const STATUS_OPTS = ["pending","docs-incomplete","ready","departed","returned","cancelled"];
const empty = {
  package_id: "", full_name: "", nik: "", passport_number: "", passport_expiry: "",
  birth_date: "", gender: "", phone: "", email: "", address: "", emergency_contact: "",
  special_needs: "", room_assignment: "", status: "pending", notes: "",
};

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    if (!shop) return;
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      supabase.from("travel_jamaah_manifest").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      supabase.from("umroh_packages").select("id,name").eq("shop_id", shop.id),
    ]);
    setItems((d1 ?? []) as Row[]);
    setPackages((d2 ?? []) as Pkg[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() { setEditing(null); setForm(empty); setOpenForm(true); }
  function startEdit(r: Row) {
    setEditing(r);
    setForm({
      package_id: r.package_id ?? "", full_name: r.full_name, nik: r.nik ?? "",
      passport_number: r.passport_number ?? "", passport_expiry: r.passport_expiry ?? "",
      birth_date: r.birth_date ?? "", gender: r.gender ?? "", phone: r.phone ?? "",
      email: r.email ?? "", address: r.address ?? "", emergency_contact: r.emergency_contact ?? "",
      special_needs: r.special_needs ?? "", room_assignment: r.room_assignment ?? "",
      status: r.status, notes: r.notes ?? "",
    });
    setOpenForm(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.full_name.trim()) { toast.error("Nama lengkap wajib"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id,
      package_id: form.package_id || null,
      full_name: form.full_name.trim(),
      nik: form.nik || null,
      passport_number: form.passport_number || null,
      passport_expiry: form.passport_expiry || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      emergency_contact: form.emergency_contact || null,
      special_needs: form.special_needs || null,
      room_assignment: form.room_assignment || null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("travel_jamaah_manifest").update(payload).eq("id", editing.id)
      : await supabase.from("travel_jamaah_manifest").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setOpenForm(false);
    void load();
  }

  async function del(r: Row) {
    if (!confirm(`Hapus jamaah "${r.full_name}"?`)) return;
    const { error } = await supabase.from("travel_jamaah_manifest").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus");
    void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />Manifest Jamaah</h1>
          <p className="text-sm text-muted-foreground">Data jamaah travel & umroh: paspor, kamar, status keberangkatan</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Tambah Jamaah</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada data jamaah.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Paket</th>
                <th className="p-3">Paspor</th>
                <th className="p-3">No. HP</th>
                <th className="p-3">Kamar</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const pkg = packages.find(p => p.id === r.package_id);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.full_name}</td>
                    <td className="p-3">{pkg?.name ?? "—"}</td>
                    <td className="p-3 text-xs">{r.passport_number ?? "—"}</td>
                    <td className="p-3 text-xs">{r.phone ?? "—"}</td>
                    <td className="p-3 text-xs">{r.room_assignment ?? "—"}</td>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Jamaah" : "Tambah Jamaah"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Lengkap (sesuai paspor)</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Paket</Label>
                <Select value={form.package_id || "none"} onValueChange={(v) => setForm({ ...form, package_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tanpa paket</SelectItem>
                    {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>NIK</Label><Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} /></div>
              <div><Label>Nomor Paspor</Label><Input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></div>
              <div><Label>Berlaku Paspor s/d</Label><Input type="date" value={form.passport_expiry} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })} /></div>
              <div><Label>Tgl Lahir</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div>
                <Label>Jenis Kelamin</Label>
                <Select value={form.gender || "none"} onValueChange={(v) => setForm({ ...form, gender: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>No. HP</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Kontak Darurat</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
              <div><Label>Pembagian Kamar</Label><Input placeholder="mis. Quad-A1" value={form.room_assignment} onChange={(e) => setForm({ ...form, room_assignment: e.target.value })} /></div>
            </div>
            <div><Label>Alamat</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Kebutuhan Khusus (alergi, kursi roda, dll)</Label><Textarea value={form.special_needs} onChange={(e) => setForm({ ...form, special_needs: e.target.value })} /></div>
            <div><Label>Catatan Internal</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
