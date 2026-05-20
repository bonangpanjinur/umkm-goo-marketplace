import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Grid3X3, Plus, Trash2, Package } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/plans")({ component: AdminPlans });

type Plan = { id: string; code: string; name: string; price_idr: number; duration_days: number; features: Record<string, unknown>; is_active: boolean; sort_order: number };

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", price_idr: 0, duration_days: 30, sort_order: 0 });

  const reload = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data as Plan[]) ?? []);
  };
  useEffect(() => { reload(); }, []);

  const save = async (p: Plan) => {
    const { error } = await supabase.from("plans").update({
      name: p.name, price_idr: p.price_idr, duration_days: p.duration_days, is_active: p.is_active, sort_order: p.sort_order,
    }).eq("id", p.id);
    if (error) toast.error(error.message); else toast.success("Tersimpan");
    await reload();
  };

  const createPlan = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Kode dan nama paket wajib diisi");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("plans").insert({
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      price_idr: form.price_idr,
      duration_days: form.duration_days,
      sort_order: form.sort_order,
      is_active: true,
      features: {},
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paket dibuat");
    setOpenCreate(false);
    setForm({ code: "", name: "", price_idr: 0, duration_days: 30, sort_order: 0 });
    await reload();
  };

  const deletePlan = async (p: Plan) => {
    const { error } = await supabase.from("plans").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Paket ${p.name} dihapus`);
    await reload();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Paket Berlangganan</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola paket yang ditawarkan kepada toko.</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Buat Paket Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat Paket Baru</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Kode (huruf kecil, unik)</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="contoh: starter" />
              </div>
              <div>
                <Label>Nama Paket</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="contoh: Starter" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Harga (IDR)</Label>
                  <Input type="number" value={form.price_idr} onChange={(e) => setForm((f) => ({ ...f, price_idr: Number(e.target.value) }))} />
                  <div className="text-xs text-muted-foreground mt-1">{formatIDR(form.price_idr)}</div>
                </div>
                <div>
                  <Label>Durasi (hari)</Label>
                  <Input type="number" value={form.duration_days} onChange={(e) => setForm((f) => ({ ...f, duration_days: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <Label>Urutan tampil</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button onClick={createPlan} disabled={creating}>{creating ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 && (
        <Card className="p-10 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-semibold mb-1">Belum ada paket</h2>
          <p className="text-sm text-muted-foreground mb-4">Buat paket pertama untuk ditawarkan ke toko.</p>
          <Button onClick={() => setOpenCreate(true)}><Plus className="h-4 w-4 mr-1" /> Buat Paket</Button>
        </Card>
      )}

      <div className="space-y-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Kode</Label><Input value={p.code} disabled /></div>
              <div><Label>Nama</Label><Input value={p.name} onChange={(e) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))} /></div>
              <div><Label>Harga (IDR)</Label><Input type="number" value={p.price_idr} onChange={(e) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, price_idr: Number(e.target.value) } : x))} />
                <div className="text-xs text-muted-foreground mt-1">{formatIDR(p.price_idr)}</div></div>
              <div><Label>Durasi (hari)</Label><Input type="number" value={p.duration_days} onChange={(e) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, duration_days: Number(e.target.value) } : x))} /></div>
              <div className="flex items-center gap-2"><Switch checked={p.is_active} onCheckedChange={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, is_active: v } : x))} /><Label>Aktif</Label></div>
              <div><Label>Urutan</Label><Input type="number" value={p.sort_order} onChange={(e) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, sort_order: Number(e.target.value) } : x))} /></div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button onClick={() => save(p)}>Simpan</Button>
              <Link to="/admin/plans/$id/matrix" params={{ id: p.id }}>
                <Button variant="outline" size="sm"><Grid3X3 className="h-3.5 w-3.5 mr-1" />Matrix Fitur & Tema</Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus paket {p.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Toko yang sudah pakai paket ini tidak otomatis berubah, tapi paket tidak bisa dipilih lagi. Tindakan tidak bisa dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deletePlan(p)}>Hapus</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
