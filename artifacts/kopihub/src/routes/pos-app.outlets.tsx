import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, MapPin, Phone, Globe, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/pos-app/outlets")({ component: OutletsPage });

type Outlet = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  slug: string;
  status: "active" | "pending" | "suspended";
  is_primary: boolean;
  kyc_status: "approved" | "pending" | "rejected";
};

const DEMO_OUTLETS: Outlet[] = [
  { id: "1", name: "UMKMgo Pusat", address: "Jl. Sudirman No. 1", city: "Jakarta Pusat", phone: "0811000001", slug: "umkmgo-pusat", status: "active", is_primary: true, kyc_status: "approved" },
  { id: "2", name: "UMKMgo Selatan", address: "Jl. Fatmawati No. 20", city: "Jakarta Selatan", phone: "0811000002", slug: "umkmgo-selatan", status: "active", is_primary: false, kyc_status: "approved" },
];

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>(DEMO_OUTLETS);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "" });
  const [saving, setSaving] = useState(false);

  async function addOutlet() {
    if (!form.name.trim() || !form.address.trim()) { toast.error("Nama dan alamat wajib diisi"); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    const newOutlet: Outlet = {
      id: String(Date.now()),
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      slug: form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      status: "pending",
      is_primary: false,
      kyc_status: "pending",
    };
    setOutlets(o => [...o, newOutlet]);
    setForm({ name: "", address: "", city: "", phone: "" });
    setSaving(false);
    setAddOpen(false);
    toast.success("Outlet baru ditambahkan. Perlu verifikasi KYC sebelum aktif.");
  }

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Multi-Outlet
            <Badge variant="secondary" className="text-xs">Pro/Enterprise</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Kelola beberapa cabang toko dalam satu akun</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Outlet
        </Button>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
        <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
        Setiap outlet memiliki storefront, menu, pesanan, dan laporan tersendiri namun dikelola dari satu dashboard.
      </div>

      <div className="space-y-3">
        {outlets.map(outlet => (
          <Card key={outlet.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{outlet.name}</p>
                    {outlet.is_primary && <Badge className="text-xs h-5">Utama</Badge>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[outlet.status]}`}>
                      {outlet.status === "active" ? "Aktif" : outlet.status === "pending" ? "Menunggu" : "Disuspend"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {outlet.address}{outlet.city ? `, ${outlet.city}` : ""}
                  </div>
                  {outlet.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" /> {outlet.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Globe className="h-3 w-3" /> /s/{outlet.slug}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {outlet.kyc_status === "approved"
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-xs text-green-600">KYC Terverifikasi</span></>
                      : outlet.kyc_status === "pending"
                      ? <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs text-amber-600">KYC Menunggu Review</span></>
                      : <><AlertCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-xs text-red-600">KYC Ditolak</span></>
                    }
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                Kelola <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Outlet Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama Outlet *</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="cth: UMKMgo Bandung" />
            </div>
            <div>
              <Label>Alamat Lengkap *</Label>
              <Input className="mt-1" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. ..." />
            </div>
            <div>
              <Label>Kota</Label>
              <Input className="mt-1" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="cth: Bandung" />
            </div>
            <div>
              <Label>Nomor WhatsApp</Label>
              <Input className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xx" />
            </div>
            <p className="text-xs text-muted-foreground">Outlet baru akan memerlukan verifikasi KYC terpisah sebelum bisa menerima pesanan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button onClick={addOutlet} disabled={saving}>{saving ? "Menyimpan..." : "Tambah Outlet"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
