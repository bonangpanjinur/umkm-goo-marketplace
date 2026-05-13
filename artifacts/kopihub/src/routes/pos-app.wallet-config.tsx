import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Wallet, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/wallet-config")({
  head: () => ({ meta: [{ title: "Top-up Saldo Toko" }] }),
  component: WalletConfigPage,
});

type Preset = {
  id: string;
  shop_id: string;
  amount: number;
  bonus_amount: number;
  label: string | null;
  sort_order: number;
  is_active: boolean;
};

type Stats = { total_balance: number; total_topped_up: number; users: number };

const EMPTY: Partial<Preset> = { amount: 50000, bonus_amount: 0, label: "", sort_order: 0, is_active: true };

function WalletConfigPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [stats, setStats] = useState<Stats>({ total_balance: 0, total_topped_up: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Preset>>(EMPTY);

  const load = async () => {
    if (!shop) return;
    setLoading(true);
    const [{ data: ps }, { data: ws }] = await Promise.all([
      supabase.from("wallet_topup_presets" as any).select("*").eq("shop_id", shop.id).order("sort_order"),
      supabase.from("customer_wallets" as any).select("balance,total_topped_up").eq("shop_id", shop.id),
    ]);
    setPresets((ps as any) ?? []);
    const wallets = (ws as any[]) ?? [];
    setStats({
      total_balance: wallets.reduce((a, w) => a + Number(w.balance || 0), 0),
      total_topped_up: wallets.reduce((a, w) => a + Number(w.total_topped_up || 0), 0),
      users: wallets.length,
    });
    setLoading(false);
  };

  useEffect(() => { if (!shopLoading) load(); }, [shop?.id, shopLoading]);

  const save = async () => {
    if (!shop || !form.amount) { toast.error("Nominal wajib diisi"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      amount: Number(form.amount),
      bonus_amount: Number(form.bonus_amount || 0),
      label: form.label || null,
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active ?? true,
    };
    const q = form.id
      ? supabase.from("wallet_topup_presets" as any).update(payload).eq("id", form.id)
      : supabase.from("wallet_topup_presets" as any).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus preset ini?")) return;
    const { error } = await supabase.from("wallet_topup_presets" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Dihapus"); load(); }
  };

  if (shopLoading || loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Top-up Saldo Toko</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pelanggan top-up saldo di muka, dapat bonus, dan kembali belanja lebih sering.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Preset</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo Beredar</p><p className="text-lg font-bold">{formatIDR(stats.total_balance)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Top-up</p><p className="text-lg font-bold">{formatIDR(stats.total_topped_up)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pengguna</p><p className="text-lg font-bold">{stats.users}</p></Card>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20 flex gap-3 items-start">
        <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Tips bisnis:</span> Berikan bonus 5–15% untuk top-up nominal besar.
          Saldo yang sudah masuk = uang di kas Anda + komitmen pelanggan untuk kembali.
        </p>
      </Card>

      {presets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada preset. Tambahkan minimal 3 nominal (kecil, sedang, besar).</Card>
      ) : (
        <div className="space-y-2">
          {presets.map(p => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{formatIDR(p.amount)}{p.bonus_amount > 0 && <span className="ml-2 text-sm text-green-600">+ bonus {formatIDR(p.bonus_amount)}</span>}</p>
                <div className="flex gap-2 mt-1">
                  {p.label && <Badge variant="outline" className="text-xs">{p.label}</Badge>}
                  {!p.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setForm(p); setOpen(true); }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{form.id ? "Edit Preset" : "Preset Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nominal Top-up (Rp)</Label><Input type="number" value={form.amount ?? 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>Bonus Tambahan (Rp)</Label><Input type="number" value={form.bonus_amount ?? 0} onChange={e => setForm({ ...form, bonus_amount: Number(e.target.value) })} /><p className="text-xs text-muted-foreground mt-1">Pelanggan terima saldo = nominal + bonus.</p></div>
            <div><Label>Label (opsional)</Label><Input value={form.label ?? ""} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Paling Hemat, Populer..." /></div>
            <div className="flex items-center justify-between"><Label>Aktif</Label><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} /></div>
            <Button onClick={save} disabled={saving} className="w-full gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Simpan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
