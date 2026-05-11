import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownToLine, TrendingUp, Clock } from "lucide-react";

export const Route = createFileRoute("/pos-app/keuangan")({
  component: KeuanganPage,
});

function KeuanganPage() {
  const { shop } = useShop();
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const [w, t, wd] = await Promise.all([
        supabase.from("shop_wallets").select("*").eq("shop_id", shop.id).maybeSingle(),
        supabase.from("wallet_transactions").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("withdrawal_requests").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setWallet(w.data);
      setTxns((t.data as any[]) ?? []);
      setWithdrawals((wd.data as any[]) ?? []);
    })();
  }, [shop?.id]);

  const fmt = (n: any) => `Rp ${Number(n ?? 0).toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keuangan & Saldo</h1>
          <p className="text-sm text-muted-foreground">Kelola pemasukan & penarikan dana toko.</p>
        </div>
        <Link to="/pos-app/keuangan/tarik">
          <Button className="gap-2"><ArrowDownToLine className="h-4 w-4" /> Tarik Dana</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card icon={<Wallet className="h-4 w-4" />} label="Saldo Tersedia" value={fmt(wallet?.available_balance)} accent />
        <Card icon={<Clock className="h-4 w-4" />} label="Saldo Pending (Escrow)" value={fmt(wallet?.pending_balance)} />
        <Card icon={<TrendingUp className="h-4 w-4" />} label="Total Pendapatan" value={fmt(wallet?.total_earned)} />
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Riwayat Penarikan</h2>
        </div>
        {withdrawals.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Belum ada penarikan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Tanggal</th>
                  <th className="px-4 py-2 text-right">Jumlah</th>
                  <th className="px-4 py-2 text-right">Bersih</th>
                  <th className="px-4 py-2 text-left">Bank</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="px-4 py-2">{new Date(w.created_at).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-2 text-right">{fmt(w.amount)}</td>
                    <td className="px-4 py-2 text-right font-medium">{fmt(w.net_amount)}</td>
                    <td className="px-4 py-2">{w.bank_name} · {w.bank_account_no}</td>
                    <td className="px-4 py-2"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Mutasi Saldo</h2>
        </div>
        {txns.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Belum ada transaksi.</p>
        ) : (
          <ul className="divide-y divide-border">
            {txns.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <div className="font-medium">{labelTxn(t.type)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("id-ID")}
                    {t.notes && ` · ${t.notes}`}
                  </div>
                </div>
                <div className={`font-semibold ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}{fmt(t.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-primary/15 text-primary",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function labelTxn(t: string) {
  return ({
    sale: "Penjualan masuk (escrow)",
    commission: "Potongan komisi platform",
    release: "Dana dilepas ke saldo",
    refund: "Refund pesanan",
    withdrawal: "Penarikan dana",
    adjustment: "Penyesuaian",
  } as Record<string, string>)[t] ?? t;
}
