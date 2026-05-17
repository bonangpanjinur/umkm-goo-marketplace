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
import { Undo2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/product-returns")({
  head: () => ({ meta: [{ title: "Retur Barang — Merchant" }] }),
  component: Page,
});

type Item = { name: string; qty: number };
type Row = {
  id: string; order_id: string | null; customer_name: string; customer_phone: string | null;
  reason: string; items: Item[]; refund_amount: number | null; refund_method: string | null;
  restock: boolean; status: string; notes: string | null; processed_at: string | null; created_at: string;
};

const STATUS = ["pending","approved","rejected","completed"];

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    order_id: "", customer_name: "", customer_phone: "", reason: "",
    items: [] as Item[], refund_amount: "", refund_method: "", restock: false,
    status: "pending", notes: "",
  });

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("product_returns").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setItems((data ?? []) as Row[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() {
    setEditing(null);
    setForm({ order_id: "", customer_name: "", customer_phone: "", reason: "", items: [], refund_amount: "", refund_method: "", restock: false, status: "pending", notes: "" });
    setOpenForm(true);
  }
  function startEdit(r: Row) {
    setEditing(r);
    setForm({
      order_id: r.order_id ?? "", customer_name: r.customer_name,
      customer_phone: r.customer_phone ?? "", reason: r.reason,
      items: Array.isArray(r.items) ? r.items : [],
      refund_amount: r.refund_amount?.toString() ?? "",
      refund_method: r.refund_method ?? "", restock: r.restock,
      status: r.status, notes: r.notes ?? "",
    });
    setOpenForm(true);
  }
  function addItem() { setForm({ ...form, items: [...form.items, { name: "", qty: 1 }] }); }
  function updItem(idx: number, patch: Partial<Item>) {
    const it = [...form.items]; it[idx] = { ...it[idx], ...patch }; setForm({ ...form, items: it });
  }
  function delItem(idx: number) { setForm({ ...form, items: form.items.filter((_, i) => i !== idx) }); }

  async function save() {
    if (!shop) return;
    if (!form.customer_name.trim()) { toast.error("Nama pelanggan wajib"); return; }
    if (!form.reason.trim()) { toast.error("Alasan retur wajib"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, order_id: form.order_id || null,
      customer_name: form.customer_name.trim(), customer_phone: form.customer_phone || null,
      reason: form.reason.trim(), items: form.items,
      refund_amount: form.refund_amount ? Number(form.refund_amount) : null,
      refund_method: form.refund_method || null, restock: form.restock,
      status: form.status, notes: form.notes || null,
      processed_at: (form.status === "completed" || form.status === "approved") ? new Date().toISOString() : null,
    };
    const { error } = editing
      ? await supabase.from("product_returns").update(payload).eq("id", editing.id)
      : await supabase.from("product_returns").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpenForm(false); void load();
  }
  async function del(r: Row) {
    if (!confirm("Hapus retur ini?")) return;
    const { error } = await supabase.from("product_returns").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Undo2 className="h-6 w-6" />Retur Barang</h1>
          <p className="text-sm text-muted-foreground">Permintaan retur & pengembalian dana dari pembeli</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Retur Baru</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada permintaan retur.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Tgl</th><th className="p-3">Pelanggan</th><th className="p-3">Alasan</th>
                <th className="p-3 text-right">Refund</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString("id-ID")}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{r.customer_phone ?? ""}</div>
                  </td>
                  <td className="p-3 text-xs max-w-xs">{r.reason}</td>
                  <td className="p-3 text-right">{r.refund_amount ? formatIDR(r.refund_amount) : "—"}</td>
                  <td className="p-3"><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" className="ml-1" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Retur" : "Retur Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Pelanggan</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>No. HP</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>Order ID (opsional)</Label><Input value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Jumlah Refund (Rp)</Label><Input type="number" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: e.target.value })} /></div>
              <div><Label>Metode Refund</Label><Input placeholder="Tunai / Transfer / Saldo" value={form.refund_method} onChange={(e) => setForm({ ...form, refund_method: e.target.value })} /></div>
            </div>
            <div><Label>Alasan Retur</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Item Yang Diretur</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Tambah</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Nama produk" value={it.name} onChange={(e) => updItem(i, { name: e.target.value })} />
                    <Input type="number" className="w-24" value={it.qty} onChange={(e) => updItem(i, { qty: Number(e.target.value) })} />
                    <Button size="sm" variant="outline" onClick={() => delItem(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.restock} onChange={(e) => setForm({ ...form, restock: e.target.checked })} /><span className="text-sm">Kembalikan ke stok</span></label>
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
