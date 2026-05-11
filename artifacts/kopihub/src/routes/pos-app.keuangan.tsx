import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import {
  Wallet, ArrowDownToLine, TrendingUp, Clock, RefreshCw,
  ArrowUpRight, ArrowDownRight, Lock, Unlock, Info, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/keuangan")({
  component: KeuanganPage,
});

const TXN_LABEL: Record<string, string> = {
  sale:       "Penjualan masuk (escrow)",
  commission: "Potongan komisi platform",
  release:    "Dana dilepas ke saldo",
  refund:     "Refund pesanan",
  withdrawal: "Penarikan dana",
  adjustment: "Penyesuaian manual",
};

const WD_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Menunggu",   cls: "bg-amber-100 text-amber-700" },
  approved:  { label: "Disetujui",  cls: "bg-blue-100 text-blue-700" },
  paid:      { label: "Dibayar",    cls: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Ditolak",    cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-muted text-muted-foreground" },
};

const ESCROW_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  held:     { label: "Ditahan",  icon: Lock,         cls: "bg-amber-100 text-amber-700" },
  released: { label: "Dilepas",  icon: Unlock,       cls: "bg-emerald-100 text-emerald-700" },
  refunded: { label: "Direfund", icon: AlertCircle,  cls: "bg-red-100 text-red-700" },
};

function StatCard({ icon, label, value, accent, sub }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function KeuanganPage() {
  const { shop } = useCurrentShop();
  const [wallet,       setWallet]       = useState<any>(null);
  const [txns,         setTxns]         = useState<any[]>([]);
  const [withdrawals,  setWithdrawals]  = useState<any[]>([]);
  const [escrowOrders, setEscrowOrders] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [txnFilter,    setTxnFilter]    = useState<"all" | "in" | "out">("all");
  const [escrowTab,    setEscrowTab]    = useState<"held" | "released">("held");

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const [w, t, wd, esc] = await Promise.all([
      supabase.from("shop_wallets").select("*").eq("shop_id", shop.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawal_requests").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("orders")
        .select("id, order_no, total, net_to_shop, commission_amount, escrow_status, created_at, customer_name")
        .eq("shop_id", shop.id)
        .like("order_no", "MKT-%")
        .in("escrow_status", ["held", "released", "refunded"])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setWallet(w.data);
    setTxns((t.data as any[]) ?? []);
    setWithdrawals((wd.data as any[]) ?? []);
    setEscrowOrders((esc.data as any[]) ?? []);
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  const filteredTxns = txns.filter(t => {
    if (txnFilter === "in")  return Number(t.amount) > 0;
    if (txnFilter === "out") return Number(t.amount) < 0;
    return true;
  });

  const heldOrders     = escrowOrders.filter(o => o.escrow_status === "held");
  const releasedOrders = escrowOrders.filter(o => o.escrow_status === "released");
  const visibleEscrow  = escrowTab === "held" ? heldOrders : releasedOrders;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Keuangan & Saldo</h1>
          <p className="text-sm text-muted-foreground">Kelola pemasukan, escrow, dan penarikan dana toko.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link to="/pos-app/keuangan/tarik">
            <Button className="gap-2"><ArrowDownToLine className="h-4 w-4" /> Tarik Dana</Button>
          </Link>
        </div>
      </div>

      {/* Wallet stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Wallet className="h-4 w-4 text-primary" />}
          label="Saldo Tersedia"
          value={formatIDR(wallet?.available_balance ?? 0)}
          accent
          sub="Siap ditarik kapan saja"
        />
        <StatCard
          icon={<Lock className="h-4 w-4 text-amber-500" />}
          label="Saldo Pending (Escrow)"
          value={formatIDR(wallet?.pending_balance ?? 0)}
          sub={`${heldOrders.length} pesanan tertahan`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="Total Pendapatan"
          value={formatIDR(wallet?.total_earned ?? 0)}
          sub={`${releasedOrders.length} escrow dilepas`}
        />
      </div>

      {/* Escrow orders breakdown */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Escrow Pesanan Marketplace</h2>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setEscrowTab("held")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${escrowTab === "held" ? "bg-amber-100 text-amber-700" : "text-muted-foreground hover:text-foreground"}`}
            >
              Ditahan ({heldOrders.length})
            </button>
            <button
              onClick={() => setEscrowTab("released")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${escrowTab === "released" ? "bg-emerald-100 text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
            >
              Dilepas ({releasedOrders.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Memuat…</div>
        ) : visibleEscrow.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            {escrowTab === "held"
              ? <><Lock className="h-8 w-8 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">Tidak ada pesanan yang sedang ditahan escrow</p></>
              : <><Unlock className="h-8 w-8 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">Belum ada escrow yang dilepas</p></>
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">Pesanan</th>
                  <th className="px-4 py-2.5 text-left">Pembeli</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Komisi</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Net</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleEscrow.map(o => {
                  const meta = ESCROW_META[o.escrow_status] ?? ESCROW_META["held"];
                  const Icon = meta.icon;
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{o.order_no}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.customer_name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right">{formatIDR(o.total)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">-{formatIDR(o.commission_amount ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatIDR(o.net_to_shop ?? 0)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                          <Icon className="h-3 w-3" />{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/20">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">
                    Total {escrowTab === "held" ? "ditahan" : "dilepas"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                    {formatIDR(visibleEscrow.reduce((s, o) => s + Number(o.net_to_shop ?? 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="border-t border-border bg-muted/10 px-5 py-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Dana escrow dilepas ke saldo tersedia setelah pesanan selesai dan masa dispute berakhir. Admin platform dapat melepas manual kapan saja.
        </div>
      </section>

      {/* Withdrawal history */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Riwayat Penarikan</h2>
          <Link to="/pos-app/keuangan/tarik" className="text-xs text-primary hover:underline">Ajukan penarikan →</Link>
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
              <tbody className="divide-y divide-border">
                {withdrawals.map(w => {
                  const s = WD_STATUS[w.status] ?? { label: w.status, cls: "bg-muted text-muted-foreground" };
                  return (
                    <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2">{new Date(w.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td>
                      <td className="px-4 py-2 text-right">{formatIDR(w.amount)}</td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-700">{formatIDR(w.net_amount)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{w.bank_name} · {w.bank_account_no}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Wallet mutations */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Mutasi Saldo</h2>
          <div className="flex gap-1">
            {(["all", "in", "out"] as const).map(f => (
              <button
                key={f}
                onClick={() => setTxnFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${txnFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f === "all" ? "Semua" : f === "in" ? "Masuk" : "Keluar"}
              </button>
            ))}
          </div>
        </div>
        {filteredTxns.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Belum ada transaksi.</p>
        ) : (
          <ul className="divide-y divide-border max-h-96 overflow-y-auto">
            {filteredTxns.map(t => {
              const isIn = Number(t.amount) > 0;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isIn ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                      {isIn ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{TXN_LABEL[t.type] ?? t.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {t.notes && ` · ${t.notes}`}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isIn ? "text-emerald-700" : "text-red-600"}`}>
                    {isIn ? "+" : ""}{formatIDR(t.amount)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
