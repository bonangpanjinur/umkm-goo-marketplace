import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, MapPin, Edit2, Trash2, Star, Home, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/alamat")({
  component: AddressPage,
});

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  is_default: boolean;
  notes: string | null;
};

type AddressForm = Omit<Address, "id">;

const EMPTY_FORM: AddressForm = {
  label: "Rumah",
  recipient_name: "",
  phone: "",
  address_line: "",
  is_default: false,
  notes: "",
};

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Rumah: <Home className="h-3.5 w-3.5" />,
  Kantor: <Briefcase className="h-3.5 w-3.5" />,
};

function AddressPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("customer_addresses")
      .select("id, label, recipient_name, phone, address_line, is_default, notes")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, is_default: addresses.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setForm({
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      address_line: addr.address_line,
      is_default: addr.is_default,
      notes: addr.notes ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.recipient_name.trim()) { toast.error("Nama penerima wajib diisi"); return; }
    if (!form.phone.trim()) { toast.error("Nomor HP wajib diisi"); return; }
    if (!form.address_line.trim()) { toast.error("Alamat lengkap wajib diisi"); return; }

    setSaving(true);
    try {
      if (form.is_default) {
        await supabase
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      if (editId) {
        const { error } = await supabase
          .from("customer_addresses")
          .update({
            label: form.label.trim() || "Alamat",
            recipient_name: form.recipient_name.trim(),
            phone: form.phone.trim(),
            address_line: form.address_line.trim(),
            is_default: form.is_default,
            notes: form.notes?.trim() || null,
          })
          .eq("id", editId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Alamat diperbarui");
      } else {
        const { error } = await supabase
          .from("customer_addresses")
          .insert({
            user_id: user.id,
            label: form.label.trim() || "Alamat",
            recipient_name: form.recipient_name.trim(),
            phone: form.phone.trim(),
            address_line: form.address_line.trim(),
            is_default: form.is_default,
            notes: form.notes?.trim() || null,
          });
        if (error) throw error;
        toast.success("Alamat ditambahkan");
      }

      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
    toast.success("Alamat utama diubah");
    await load();
  };

  const deleteAddress = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Alamat dihapus");
    setDeleteTarget(null);
    await load();
  };

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alamat Pengiriman</h2>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Alamat
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan</p>
          <Button size="sm" variant="outline" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Alamat Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card key={addr.id} className={addr.is_default ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        {LABEL_ICONS[addr.label] ?? <MapPin className="h-3.5 w-3.5" />}
                        {addr.label}
                      </span>
                      {addr.is_default && (
                        <Badge variant="outline" className="border-primary text-primary text-[10px] py-0 h-5 gap-1">
                          <Star className="h-2.5 w-2.5 fill-primary" /> Utama
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{addr.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">{addr.phone}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{addr.address_line}</p>
                    {addr.notes && (
                      <p className="text-xs text-muted-foreground italic">Catatan: {addr.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(addr)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(addr.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {!addr.is_default && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 text-xs text-primary hover:text-primary gap-1"
                    onClick={() => setDefault(addr.id)}
                  >
                    <Star className="h-3 w-3" /> Jadikan alamat utama
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Alamat" : "Tambah Alamat Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label Alamat</Label>
              <div className="flex gap-2 mt-1">
                {["Rumah", "Kantor", "Lainnya"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, label: lbl }))}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.label === lbl
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {LABEL_ICONS[lbl]}
                    {lbl}
                  </button>
                ))}
              </div>
              {form.label === "Lainnya" && (
                <Input
                  className="mt-2"
                  placeholder="Nama label (contoh: Kos, Gudang…)"
                  value={form.label === "Lainnya" ? "" : form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  maxLength={50}
                />
              )}
            </div>
            <div>
              <Label>Nama Penerima *</Label>
              <Input
                value={form.recipient_name}
                onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
                maxLength={100}
                placeholder="Nama lengkap penerima"
              />
            </div>
            <div>
              <Label>No. HP Penerima *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={20}
                placeholder="08xxxxxxxxxx"
                type="tel"
              />
            </div>
            <div>
              <Label>Alamat Lengkap *</Label>
              <Textarea
                value={form.address_line}
                onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
                maxLength={500}
                rows={3}
                placeholder="Jl. Nama Jalan No. X, Kelurahan, Kecamatan, Kota, Kode Pos"
              />
            </div>
            <div>
              <Label>Catatan Kurir (opsional)</Label>
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                maxLength={200}
                placeholder="Contoh: Depan minimarket, pagar besi hitam"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Jadikan alamat utama</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editId ? "Simpan Perubahan" : "Tambah Alamat")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus alamat?</AlertDialogTitle>
            <AlertDialogDescription>
              Alamat ini akan dihapus permanen dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteAddress(deleteTarget)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
