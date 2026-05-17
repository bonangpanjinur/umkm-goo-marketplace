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
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/pos-app/jamaah-documents")({
  head: () => ({ meta: [{ title: "Dokumen Jamaah — Merchant" }] }),
  component: Page,
});

const DOC_TYPES = [
  { v: "paspor", l: "Paspor" }, { v: "visa", l: "Visa" },
  { v: "vaksin", l: "Vaksin" }, { v: "ktp", l: "KTP" }, { v: "identitas_lain", l: "Identitas Lain" },
];
const STATUSES = ["pending", "verified", "rejected", "expired"];

type Jamaah = { id: string; full_name: string };
type Doc = {
  id: string; jamaah_id: string; doc_type: string; doc_number: string | null;
  issued_at: string | null; expiry_date: string | null; file_url: string | null;
  status: string; notes: string | null;
};

const empty = { jamaah_id: "", doc_type: "paspor", doc_number: "", issued_at: "", expiry_date: "", file_url: "", status: "pending", notes: "" };

function Page() {
  const { shop, loading } = useCurrentShop();
  const [jamaah, setJamaah] = useState<Jamaah[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filterJamaah, setFilterJamaah] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (shop) load(); }, [shop?.id]);

  async function load() {
    if (!shop) return;
    const [{ data: j }, { data: d }] = await Promise.all([
      supabase.from("travel_jamaah_manifest").select("id, full_name").eq("shop_id", shop.id).order("full_name"),
      (supabase as any).from("travel_jamaah_documents").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    ]);
    setJamaah((j ?? []) as Jamaah[]);
    setDocs((d ?? []) as Doc[]);
  }

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(d: Doc) {
    setEditing(d);
    setForm({
      jamaah_id: d.jamaah_id, doc_type: d.doc_type, doc_number: d.doc_number ?? "",
      issued_at: d.issued_at ?? "", expiry_date: d.expiry_date ?? "",
      file_url: d.file_url ?? "", status: d.status, notes: d.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.jamaah_id) { toast.error("Pilih jamaah"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id, jamaah_id: form.jamaah_id, doc_type: form.doc_type,
      doc_number: form.doc_number.trim() || null,
      issued_at: form.issued_at || null,
      expiry_date: form.expiry_date || null,
      file_url: form.file_url.trim() || null,
      status: form.status, notes: form.notes.trim() || null,
    };
    const q = editing
      ? (supabase as any).from("travel_jamaah_documents").update(payload).eq("id", editing.id)
      : (supabase as any).from("travel_jamaah_documents").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Disimpan"); setOpen(false); load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus dokumen?")) return;
    await (supabase as any).from("travel_jamaah_documents").delete().eq("id", id);
    load();
  }

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  const nameById = new Map(jamaah.map(j => [j.id, j.full_name]));
  const filtered = filterJamaah === "all" ? docs : docs.filter(d => d.jamaah_id === filterJamaah);

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(); soon.setMonth(soon.getMonth() + 6);
  const soonStr = soon.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Dokumen Jamaah</h1>
          <p className="text-sm text-muted-foreground mt-1">Lacak paspor, visa, vaksin per jamaah + alert expired.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterJamaah} onValueChange={setFilterJamaah}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jamaah</SelectItem>
              {jamaah.map(j => <SelectItem key={j.id} value={j.id}>{j.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada dokumen.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Jamaah</th>
                <th className="px-3 py-2 text-left">Dokumen</th>
                <th className="px-3 py-2 text-left">Nomor</th>
                <th className="px-3 py-2 text-left">Expired</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const expired = d.expiry_date && d.expiry_date < today;
                const expiringSoon = d.expiry_date && !expired && d.expiry_date < soonStr;
                return (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2">{nameById.get(d.jamaah_id) ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{d.doc_type.replace("_", " ")}</td>
                    <td className="px-3 py-2 font-mono text-xs">{d.doc_number ?? "—"}</td>
                    <td className="px-3 py-2">
                      {d.expiry_date ? (
                        <span className={expired ? "text-destructive font-medium" : expiringSoon ? "text-orange-600 font-medium" : ""}>
                          {d.expiry_date}{expired && " (EXP)"}{expiringSoon && " ⚠"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={d.status === "verified" ? "default" : d.status === "rejected" || d.status === "expired" ? "destructive" : "secondary"}>
                        {d.status === "verified" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {(d.status === "rejected" || d.status === "expired") && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Dokumen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Jamaah *</Label>
              <Select value={form.jamaah_id} onValueChange={(v) => setForm({ ...form, jamaah_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jamaah" /></SelectTrigger>
                <SelectContent>{jamaah.map(j => <SelectItem key={j.id} value={j.id}>{j.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jenis</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nomor dokumen</Label><Input value={form.doc_number} onChange={e => setForm({ ...form, doc_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Diterbitkan</Label><Input type="date" value={form.issued_at} onChange={e => setForm({ ...form, issued_at: e.target.value })} /></div>
              <div><Label>Expired</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <div><Label>File scan</Label><UploadableImage bucket="shop-images" value={form.file_url} onChange={(url) => setForm({ ...form, file_url: url ?? "" })} /></div>
            <div><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
