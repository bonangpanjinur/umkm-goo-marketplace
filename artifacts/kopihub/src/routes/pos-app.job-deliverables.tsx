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
import { FolderUp, Plus, Pencil, Trash2, Loader2, Send, Copy, ExternalLink, MessageCircle, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/pos-app/job-deliverables")({
  head: () => ({ meta: [{ title: "Pengiriman Hasil Kerja" }] }),
  component: JobDeliverablesPage,
});

type Deliv = {
  id: string;
  customer_name: string;
  customer_contact: string;
  title: string;
  description: string | null;
  external_url: string | null;
  file_url: string | null;
  file_name: string | null;
  delivery_token: string;
  status: "draft" | "sent" | "received" | "revision" | "completed";
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
};

const STATUS_META: Record<Deliv["status"], { label: string; color: string }> = {
  draft:     { label: "Draft",         color: "bg-muted text-muted-foreground" },
  sent:      { label: "Terkirim",      color: "bg-blue-100 text-blue-700" },
  received:  { label: "Diterima",      color: "bg-emerald-100 text-emerald-700" },
  revision:  { label: "Minta Revisi",  color: "bg-amber-100 text-amber-700" },
  completed: { label: "Selesai",       color: "bg-primary/10 text-primary" },
};

const EMPTY = { customer_name: "", customer_contact: "", title: "", description: "", external_url: "", file_url: "", file_name: "" };

function JobDeliverablesPage() {
  const { shop } = useCurrentShop();
  const [items, setItems] = useState<Deliv[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Deliv | null>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("job_deliverables")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Deliv[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d: Deliv) => {
    setEditing(d);
    setForm({
      customer_name: d.customer_name,
      customer_contact: d.customer_contact,
      title: d.title,
      description: d.description ?? "",
      external_url: d.external_url ?? "",
      file_url: d.file_url ?? "",
      file_name: d.file_name ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.customer_name.trim() || !form.customer_contact.trim() || !form.title.trim()) {
      toast.error("Nama klien, kontak, dan judul wajib diisi"); return;
    }
    if (!form.external_url.trim() && !form.file_url.trim()) {
      toast.error("Isi link Drive/WeTransfer atau URL file"); return;
    }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      customer_name: form.customer_name.trim(),
      customer_contact: form.customer_contact.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      external_url: form.external_url.trim() || null,
      file_url: form.file_url.trim() || null,
      file_name: form.file_name.trim() || null,
    };
    try {
      if (editing) {
        const { error } = await (supabase as any).from("job_deliverables").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Disimpan");
      } else {
        const { error } = await (supabase as any).from("job_deliverables").insert(payload);
        if (error) throw error;
        toast.success("Hasil kerja dibuat sebagai draft");
      }
      setOpen(false); load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const sendToClient = async (d: Deliv) => {
    await (supabase as any).from("job_deliverables").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", d.id);
    const link = `${window.location.origin}/d/${d.delivery_token}`;
    const message = encodeURIComponent(`Hai ${d.customer_name}, hasil kerja "${d.title}" sudah siap. Silakan cek di link berikut: ${link}`);
    const phone = d.customer_contact.replace(/\D/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    toast.success("Status diubah ke 'Terkirim'");
    load(shop!.id);
  };

  const setStatus = async (d: Deliv, status: Deliv["status"]) => {
    await (supabase as any).from("job_deliverables").update({ status }).eq("id", d.id);
    toast.success(`Status: ${STATUS_META[status].label}`);
    load(shop!.id);
  };

  const remove = async (d: Deliv) => {
    if (!confirm(`Hapus pengiriman "${d.title}"?`)) return;
    await (supabase as any).from("job_deliverables").delete().eq("id", d.id);
    setItems(prev => prev.filter(x => x.id !== d.id));
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/d/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link disalin");
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FolderUp className="h-5 w-5 text-primary" /> Kirim Hasil Kerja ke Klien
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload hasil kerja (file/link Drive/WeTransfer) → kirim link ke klien via WhatsApp (JU-05).
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Pengiriman Baru</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          <FolderUp className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada pengiriman</p>
          <p className="mt-1">Buat pengiriman pertama untuk kirim hasil kerja ke klien.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(d => {
            const meta = STATUS_META[d.status];
            const link = `${window.location.origin}/d/${d.delivery_token}`;
            return (
              <div key={d.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{d.title}</span>
                      <Badge className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Untuk <strong>{d.customer_name}</strong> · {d.customer_contact}
                    </div>
                    {d.description && <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {d.external_url && (
                        <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Link eksternal
                        </a>
                      )}
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> {d.file_name ?? "File"}
                        </a>
                      )}
                      <button onClick={() => copyLink(d.delivery_token)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" /> Salin link klien
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:items-end">
                    {d.status === "draft" && (
                      <Button size="sm" onClick={() => sendToClient(d)} className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> Kirim ke WhatsApp
                      </Button>
                    )}
                    {d.status !== "draft" && d.status !== "completed" && (
                      <div className="flex flex-wrap gap-1">
                        {d.status === "sent" && <Button size="sm" variant="outline" onClick={() => setStatus(d, "received")}>Tandai Diterima</Button>}
                        {(d.status === "sent" || d.status === "received") && <Button size="sm" variant="outline" onClick={() => setStatus(d, "revision")}><MessageCircle className="h-3.5 w-3.5 mr-1" />Revisi</Button>}
                        <Button size="sm" variant="default" onClick={() => setStatus(d, "completed")}><FileCheck2 className="h-3.5 w-3.5 mr-1" />Selesai</Button>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 truncate text-[11px] text-muted-foreground">🔗 {link}</p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Pengiriman" : "Pengiriman Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Klien <span className="text-destructive">*</span></Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>No. WhatsApp <span className="text-destructive">*</span></Label>
                <Input value={form.customer_contact} onChange={e => setForm(f => ({ ...f, customer_contact: e.target.value }))} placeholder="08xxx" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Judul Pekerjaan <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Logo Brand X — Final Files" />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Versi final logo + brand guideline + source files." />
            </div>
            <div className="space-y-1.5">
              <Label>Link Eksternal (Drive / WeTransfer / Dropbox)</Label>
              <Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://drive.google.com/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>URL File Langsung</Label>
                <Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Nama File</Label>
                <Input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} placeholder="logo-final.zip" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Wajib isi salah satu: link eksternal atau URL file.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Simpan" : "Buat Draft"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
