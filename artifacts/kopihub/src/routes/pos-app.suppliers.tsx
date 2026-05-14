import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Truck, Building2, User, Phone, Mail, MapPin, StickyNote, Clock, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/suppliers")({ component: SuppliersPage });

type Supplier = {
  id: string; name: string; contact_name: string | null; phone: string | null;
  email: string | null; address: string | null; note: string | null; is_active: boolean;
  lead_time_days: number; payment_terms: string | null;
};

function SuppliersPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", contact_name: "", phone: "", email: "", address: "", note: "", lead_time_days: "0", payment_terms: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    setLoading(true);
    const { data, error } = await supabase.from("suppliers").select("*")
      .eq("shop_id", shop.id).eq("is_active", true).order("name");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Supplier[]);
    setLoading(false);
  }
  useEffect(() => { if (shop) load(); /* eslint-disable-next-line */ }, [shop?.id]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", contact_name: "", phone: "", email: "", address: "", note: "", lead_time_days: "0", payment_terms: "" });
    setOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name, contact_name: s.contact_name ?? "", phone: s.phone ?? "",
      email: s.email ?? "", address: s.address ?? "", note: s.note ?? "",
      lead_time_days: String(s.lead_time_days ?? 0),
      payment_terms: s.payment_terms ?? "",
    });
    setOpen(true);
  }
  async function save() {
    if (!shop || !form.name.trim()) return;
    setSaving(true);
    const lt = Math.max(0, Math.floor(Number(form.lead_time_days) || 0));
    const payload = {
      shop_id: shop.id, name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
      lead_time_days: lt,
      payment_terms: form.payment_terms.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Supplier diperbarui" : "Supplier ditambahkan"); setOpen(false); load(); }
    setSaving(false);
  }
  async function remove(s: Supplier) {
    if (!confirm(`Nonaktifkan supplier "${s.name}"?`)) return;
    const { error } = await supabase.from("suppliers").update({ is_active: false }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Supplier dinonaktifkan"); load(); }
  }

  if (shopLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola daftar pemasok bahan baku.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Supplier baru</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>{editing ? "Edit Supplier" : "Tambah Supplier Baru"}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {editing ? "Perbarui informasi supplier" : "Lengkapi data pemasok untuk digunakan saat membuat PO"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
              {/* Section: Identitas */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> Identitas
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-name">Nama supplier <span className="text-destructive">*</span></Label>
                  <Input
                    id="sup-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Mis. CV Bahan Kopi Nusantara"
                    autoFocus
                    className={!form.name.trim() && form.name !== "" ? "border-destructive" : ""}
                  />
                  {form.name.length > 0 && form.name.trim().length === 0 && (
                    <p className="flex items-center gap-1 text-[11px] text-destructive">
                      <AlertCircle className="h-3 w-3" /> Nama tidak boleh kosong
                    </p>
                  )}
                </div>
              </section>

              {/* Section: Kontak */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Kontak
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-contact" className="text-xs">Kontak person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                      <Input id="sup-contact" className="pl-9" value={form.contact_name}
                        onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                        placeholder="Nama PIC" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-phone" className="text-xs">Telepon / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                      <Input id="sup-phone" className="pl-9" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="08xx-xxxx-xxxx" inputMode="tel" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-email" className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                    <Input id="sup-email" type="email" className="pl-9" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="kontak@supplier.com" />
                  </div>
                  {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                    <p className="flex items-center gap-1 text-[11px] text-destructive">
                      <AlertCircle className="h-3 w-3" /> Format email tidak valid
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-addr" className="text-xs flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Alamat
                  </Label>
                  <Textarea id="sup-addr" rows={2} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Alamat lengkap supplier" />
                </div>
              </section>

              {/* Section: Syarat dagang */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" /> Syarat Dagang
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-lead" className="text-xs flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Lead time
                    </Label>
                    <div className="relative">
                      <Input id="sup-lead" type="number" min={0} value={form.lead_time_days}
                        onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
                        placeholder="0" className="pr-12" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hari</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Estimasi waktu kirim setelah PO dibuat.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-term" className="text-xs">Termin pembayaran</Label>
                    <Input id="sup-term" value={form.payment_terms}
                      onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                      placeholder="Mis. NET 14, COD" list="term-suggestions" />
                    <datalist id="term-suggestions">
                      <option value="COD" />
                      <option value="NET 7" />
                      <option value="NET 14" />
                      <option value="NET 30" />
                      <option value="DP 50%" />
                    </datalist>
                  </div>
                </div>
              </section>

              {/* Section: Catatan */}
              <section className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sup-note" className="text-xs flex items-center gap-1.5">
                    <StickyNote className="h-3 w-3" /> Catatan internal
                  </Label>
                  <Textarea id="sup-note" rows={2} value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Mis. preferensi pengiriman, no rekening, dll." />
                </div>
              </section>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20 sm:justify-between gap-2">
              <p className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
                <span className="text-destructive">*</span> wajib diisi
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
                <Button onClick={save} disabled={saving || !form.name.trim()} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {editing ? "Simpan Perubahan" : "Tambah Supplier"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Truck className="h-6 w-6" /></div>
          <h2 className="text-lg font-semibold">Belum ada supplier</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Tambahkan supplier untuk dipakai saat membuat Purchase Order.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5 text-left">Nama</th><th className="px-4 py-2.5 text-left">Kontak</th><th className="px-4 py-2.5 text-left">Telepon</th><th className="px-4 py-2.5 text-left">Lead time</th><th className="px-4 py-2.5 text-left">Termin</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.contact_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{(s.lead_time_days ?? 0) > 0 ? `${s.lead_time_days} hari` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.payment_terms ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(s)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
