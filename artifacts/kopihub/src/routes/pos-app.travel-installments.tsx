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
import { Wallet, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/travel-installments")({
  head: () => ({ meta: [{ title: "Cicilan Travel — Merchant" }] }),
  component: Page,
});

type Sched = { due_date: string; amount: number; paid?: boolean; paid_at?: string };
type Row = {
  id: string; package_id: string | null; customer_name: string; customer_phone: string | null;
  total_amount: number; paid_amount: number; schedule: Sched[]; status: string; notes: string | null;
};
type Pkg = { id: string; name: string };

const STATUS = ["open","partial","paid","overdue","cancelled"];

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    package_id: "", customer_name: "", customer_phone: "",
    total_amount: "", paid_amount: "0", schedule: [] as Sched[], status: "open", notes: "",
  });

  async function load() {
    if (!shop) return;
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      supabase.from("travel_installments").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      supabase.from("umroh_packages").select("id,name").eq("shop_id", shop.id),
    ]);
    setItems((d1 ?? []) as Row[]);
    setPackages((d2 ?? []) as Pkg[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() {
    setEditing(null);
    setForm({ package_id: "", customer_name: "", customer_phone: "", total_amount: "", paid_amount: "0", schedule: [], status: "open", notes: "" });
    setOpenForm(true);
  }
  function startEdit(r: Row) {
    setEditing(r);
    setForm({
      package_id: r.package_id ?? "", customer_name: r.customer_name, customer_phone: r.customer_phone ?? "",
      total_amount: String(r.total_amount), paid_amount: String(r.paid_amount),
      schedule: Array.isArray(r.schedule) ? r.schedule : [], status: r.status, notes: r.notes ?? "",
    });
    setOpenForm(true);
  }
  function addSched() {
    setForm({ ...form, schedule: [...form.schedule, { due_date: "", amount: 0, paid: false }] });
  }
  function updSched(idx: number, patch: Partial<Sched>) {
    const s = [...form.schedule]; s[idx] = { ...s[idx], ...patch }; setForm({ ...form, schedule: s });
  }
  function delSched(idx: number) {
    setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== idx) });
  }

  async function save() {
    if (!shop) return;
    if (!form.customer_name.trim()) { toast.error("Nama pelanggan wajib"); return; }
    if (!form.total_amount) { toast.error("Total wajib"); return; }
    setSaving(true);
    const paid = form.schedule.filter(s => s.paid).reduce((a, b) => a + Number(b.amount || 0), 0);
    const payload: any = {
      shop_id: shop.id,
      package_id: form.package_id || null,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone || null,
      total_amount: Number(form.total_amount),
      paid_amount: paid || Number(form.paid_amount || 0),
      schedule: form.schedule,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("travel_installments").update(payload).eq("id", editing.id)
      : await supabase.from("travel_installments").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setOpenForm(false);
    void load();
  }
  async function del(r: Row) {
    if (!confirm(`Hapus cicilan "${r.customer_name}"?`)) return;
    const { error } = await supabase.from("travel_installments").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" />Cicilan Travel</h1>
          <p className="text-sm text-muted-foreground">Pembayaran bertahap untuk paket travel/umroh</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Cicilan Baru</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada cicilan.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(r => {
            const pkg = packages.find(p => p.id === r.package_id);
            const pct = r.total_amount > 0 ? Math.round((r.paid_amount / r.total_amount) * 100) : 0;
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{r.customer_name}</h3>
                    <p className="text-xs text-muted-foreground">{pkg?.name ?? "—"} · {r.customer_phone ?? "—"}</p>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
                <div className="mt-3 text-sm">
                  <div>Dibayar: <strong>{formatIDR(r.paid_amount)}</strong> / {formatIDR(r.total_amount)} ({pct}%)</div>
                  <div className="h-2 bg-muted rounded mt-1 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                </div>
                {r.schedule.length > 0 && (
                  <div className="mt-3 text-xs space-y-1">
                    {r.schedule.map((s, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{s.due_date || "—"}</span>
                        <span>{formatIDR(s.amount)} {s.paid ? "✓" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Cicilan Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Pelanggan</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>No. HP</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
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
                  <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Total (Rp)</Label><Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} /></div>
              <div><Label>Sudah Dibayar (Rp)</Label><Input type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Jadwal Cicilan</Label>
                <Button size="sm" variant="outline" onClick={addSched}><Plus className="h-3 w-3 mr-1" />Tambah</Button>
              </div>
              <div className="space-y-2">
                {form.schedule.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input type="date" value={s.due_date} onChange={(e) => updSched(i, { due_date: e.target.value })} />
                    <Input type="number" placeholder="Jumlah" value={s.amount} onChange={(e) => updSched(i, { amount: Number(e.target.value) })} />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!s.paid} onChange={(e) => updSched(i, { paid: e.target.checked })} />Lunas</label>
                    <Button size="sm" variant="outline" onClick={() => delSched(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
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
