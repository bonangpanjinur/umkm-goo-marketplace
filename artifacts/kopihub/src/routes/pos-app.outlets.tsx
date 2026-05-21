import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, MapPin, Phone, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";

export const Route = createFileRoute("/pos-app/outlets")({ component: OutletsPage });

type Outlet = {
  id: string;
  shop_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
};

export default function OutletsPage() {
  const { shop } = useShop();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("outlets")
      .select("id, shop_id, name, address, phone, timezone, is_active, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setOutlets((data as Outlet[]) ?? []);
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  async function addOutlet() {
    if (!shop?.id) return;
    if (!form.name.trim()) { toast.error("Nama outlet wajib diisi"); return; }
    setSaving(true);
    const { error } = await supabase.from("outlets").insert({
      shop_id: shop.id,
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setForm({ name: "", address: "", phone: "" });
    setAddOpen(false);
    toast.success("Outlet ditambahkan");
    load();
  }

  async function toggleActive(o: Outlet) {
    const { error } = await supabase.from("outlets").update({ is_active: !o.is_active }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success(o.is_active ? "Outlet dinonaktifkan" : "Outlet diaktifkan");
    load();
  }

  async function removeOutlet(o: Outlet) {
    if (!confirm(`Hapus outlet "${o.name}"? Semua data pesanan & menu di outlet ini akan ikut terhapus.`)) return;
    const { error } = await supabase.from("outlets").delete().eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Outlet dihapus");
    load();
  }

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Multi-Outlet
          </h1>
          <p className="text-sm text-muted-foreground">Kelola beberapa cabang dalam satu akun toko</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Outlet
        </Button>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
        <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
        Setiap outlet memiliki pesanan, kasir, dan laporan terpisah namun dikelola dari satu dashboard.
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : outlets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada outlet. Klik "Tambah Outlet" untuk membuat cabang pertama.
        </Card>
      ) : (
        <div className="space-y-3">
          {outlets.map(outlet => (
            <Card key={outlet.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{outlet.name}</p>
                      <Badge variant="secondary" className="text-xs">{outlet.timezone}</Badge>
                      {outlet.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Aktif
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Nonaktif
                        </span>
                      )}
                    </div>
                    {outlet.address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" /> {outlet.address}
                      </div>
                    )}
                    {outlet.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" /> {outlet.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(outlet)}>
                    {outlet.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => removeOutlet(outlet)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Hapus
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Outlet Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama Outlet *</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="cth: Cabang Bandung" />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input className="mt-1" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. ..." />
            </div>
            <div>
              <Label>Nomor WhatsApp</Label>
              <Input className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xx" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button onClick={addOutlet} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Menyimpan...</> : "Tambah Outlet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
