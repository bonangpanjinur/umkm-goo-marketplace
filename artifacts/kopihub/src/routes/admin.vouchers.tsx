import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/admin/vouchers")({
  head: () => ({ meta: [{ title: "Voucher Platform — Admin" }] }),
  component: AdminVouchersPage,
});

type Voucher = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "nominal";
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

function AdminVouchersPage() {
  const [list, setList] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Voucher>>({
    code: "",
    discount_type: "percent",
    value: 10,
    min_order: 0,
    per_user_limit: 1,
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_vouchers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList(((data ?? []) as any).map((v: any) => ({ ...v, value: Number(v.value), min_order: Number(v.min_order), max_discount: v.max_discount ? Number(v.max_discount) : null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.code?.trim()) {
      toast.error("Kode wajib diisi");
      return;
    }
    setSaving(true);
    const payload: any = {
      code: form.code!.trim().toUpperCase(),
      description: form.description ?? null,
      discount_type: form.discount_type,
      value: Number(form.value ?? 0),
      min_order: Number(form.min_order ?? 0),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active ?? true,
    };
    const { error } = await supabase.from("platform_vouchers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Voucher dibuat");
    setOpen(false);
    setForm({ code: "", discount_type: "percent", value: 10, min_order: 0, per_user_limit: 1, is_active: true });
    load();
  };

  const toggle = async (v: Voucher) => {
    const { error } = await supabase.from("platform_vouchers").update({ is_active: !v.is_active }).eq("id", v.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (v: Voucher) => {
    if (!confirm(`Hapus voucher ${v.code}?`)) return;
    const { error } = await supabase.from("platform_vouchers").delete().eq("id", v.id);
    if (error) toast.error(error.message);
    else { toast.success("Dihapus"); load(); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5" />Voucher Platform
          </h1>
          <p className="text-xs text-muted-foreground">Voucher lintas-toko yang berlaku di seluruh marketplace.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />Voucher Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada voucher. Klik <b>Voucher Baru</b> untuk membuat.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((v) => (
            <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{v.code}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {v.discount_type === "percent" ? `${v.value}%` : formatIDR(v.value)}
                  </span>
                  {!v.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Nonaktif</span>}
                </div>
                {v.description && <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Min. {formatIDR(v.min_order)}
                  {v.max_discount ? ` · Maks. diskon ${formatIDR(v.max_discount)}` : ""}
                  {v.usage_limit ? ` · Pakai ${v.usage_count}/${v.usage_limit}` : ` · Terpakai ${v.usage_count}`}
                  {v.expires_at ? ` · Berakhir ${new Date(v.expires_at).toLocaleDateString("id-ID")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={v.is_active} onCheckedChange={() => toggle(v)} />
                <Button size="icon" variant="ghost" onClick={() => remove(v)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Voucher Baru</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Kode *</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="HEMAT10" />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis</Label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                >
                  <option value="percent">Persen (%)</option>
                  <option value="nominal">Nominal (Rp)</option>
                </select>
              </div>
              <div>
                <Label>Nilai *</Label>
                <Input type="number" value={form.value ?? 0} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min. Belanja</Label>
                <Input type="number" value={form.min_order ?? 0} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Maks. Diskon</Label>
                <Input type="number" value={form.max_discount ?? ""} onChange={(e) => setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : null })} placeholder="opsional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kuota total</Label>
                <Input type="number" value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="kosong = tanpa batas" />
              </div>
              <div>
                <Label>Per pengguna</Label>
                <Input type="number" value={form.per_user_limit ?? 1} onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mulai</Label>
                <Input type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>Berakhir</Label>
                <Input type="datetime-local" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
