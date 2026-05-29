import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Users, Search, Loader2, RefreshCw, Banknote, ShieldOff, ShieldCheck, Plus, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/buyer-actions")({
  head: () => ({ meta: [{ title: "Tindakan Pembeli — Admin" }] }),
  component: BuyerActionsPage,
});

type BuyerUser = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_suspended: boolean;
  cashback_balance: number;
  total_orders: number;
  last_order_at: string | null;
};

type CreditLog = { buyer_id: string; amount: number; reason: string; at: string };

function fmtDate(d: string) { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }

export default function BuyerActionsPage() {
  const [buyers, setBuyers] = useState<BuyerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BuyerUser | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);

  const loadBuyers = async (q: string) => {
    if (!q.trim()) { setBuyers([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase.from("users" as any)
        .select("id, email, full_name, created_at, is_suspended, cashback_balance, total_orders, last_order_at")
        .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(20);
      setBuyers((data ?? []) as BuyerUser[]);
    } catch {
      const { data: authData } = await supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } }));
      const filtered = (authData?.users ?? []).filter((u: Record<string, string>) =>
        u.email?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 20);
      setBuyers(filtered.map((u: Record<string, string>) => ({
        id: u.id, email: u.email ?? "", full_name: u.user_metadata?.full_name ?? null,
        created_at: u.created_at ?? "", is_suspended: false, cashback_balance: 0, total_orders: 0, last_order_at: null,
      })));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => loadBuyers(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const addCredit = async () => {
    if (!selected || !creditAmount || Number(creditAmount) === 0) { toast.error("Nominal wajib diisi"); return; }
    setSaving(true);
    try {
      const newLog: CreditLog = { buyer_id: selected.id, amount: Number(creditAmount), reason: creditReason, at: new Date().toISOString() };
      setLogs(prev => [newLog, ...prev]);
      await (supabase as any).from("cashback_transactions" as any).insert({ user_id: selected.id, amount: Number(creditAmount), type: "manual_credit", description: creditReason || "Kredit manual oleh admin" });
      toast.success(`Kredit ${formatIDR(Number(creditAmount))} ditambahkan ke ${selected.email}`);
      setCreditOpen(false);
      setCreditAmount("");
      setCreditReason("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const toggleSuspend = async (buyer: BuyerUser) => {
    if (!buyer.is_suspended && !suspendReason.trim()) { setSuspendOpen(true); return; }
    setSaving(true);
    try {
      await (supabase as any).from("users" as any).update({ is_suspended: !buyer.is_suspended, suspend_reason: buyer.is_suspended ? null : suspendReason }).eq("id", buyer.id).catch(() => {});
      setBuyers(prev => prev.map(x => x.id === buyer.id ? { ...x, is_suspended: !x.is_suspended } : x));
      if (selected?.id === buyer.id) setSelected(s => s ? { ...s, is_suspended: !s.is_suspended } : s);
      toast.success(buyer.is_suspended ? "Akun diaktifkan kembali" : "Akun disuspend");
      setSuspendOpen(false);
      setSuspendReason("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-primary" /> Manajemen Pembeli</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Cari pembeli — tambah kredit cashback manual, suspend, atau reset password.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari email atau nama pembeli..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : buyers.length === 0 && search.trim() ? (
        <p className="text-center text-sm text-muted-foreground py-8">Tidak ada pembeli ditemukan.</p>
      ) : (
        <div className="space-y-2">
          {buyers.map(b => (
            <div key={b.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{b.full_name ?? b.email}</span>
                  {b.is_suspended && <Badge className="bg-red-100 text-red-700 text-xs">Suspended</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{b.email} · Daftar {fmtDate(b.created_at)}</p>
                {b.cashback_balance > 0 && (
                  <p className="text-xs text-green-700 font-medium">Cashback: {formatIDR(b.cashback_balance)}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => { setSelected(b); setCreditOpen(true); }}>
                  <Banknote className="h-3 w-3" /> Kredit
                </Button>
                <Button size="sm" variant={b.is_suspended ? "outline" : "destructive"} className="h-8 text-xs gap-1"
                  onClick={() => b.is_suspended ? toggleSuspend(b) : setSuspendOpen(true) || setSelected(b)}>
                  {b.is_suspended ? <><ShieldCheck className="h-3 w-3" /> Aktifkan</> : <><ShieldOff className="h-3 w-3" /> Suspend</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Credit dialog */}
      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Kredit Cashback Manual</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Pembeli: <strong>{selected?.email}</strong></p>
            <div className="space-y-1.5">
              <Label>Nominal (Rp) — negatif untuk debit</Label>
              <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="50000" />
            </div>
            <div className="space-y-1.5">
              <Label>Alasan</Label>
              <Input value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Kompensasi keterlambatan pengiriman" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={addCredit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
              Tambah Kredit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend Akun Pembeli</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Akun: <strong>{selected?.email}</strong></p>
            <div className="space-y-1.5">
              <Label>Alasan Suspend *</Label>
              <Textarea rows={3} value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Pelanggaran kebijakan platform..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Batal</Button>
            <Button variant="destructive" disabled={saving || !suspendReason.trim()} onClick={() => selected && toggleSuspend(selected)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
              Suspend Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
