import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, ArrowDownToLine, ArrowUpRight, Crown } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/saldo")({
  head: () => ({ meta: [{ title: "Saldo & Membership" }] }),
  component: SaldoPage,
});

type WalletRow = {
  id: string;
  shop_id: string;
  balance: number;
  total_topped_up: number;
  total_spent: number;
  shop?: { name: string; slug: string };
};

type Tx = {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  shop_id: string;
  note: string | null;
  created_at: string;
};

type Membership = {
  id: string;
  shop_id: string;
  tier_id: string;
  expires_at: string;
  status: string;
  tier?: { name: string; discount_percent: number };
  shop?: { name: string; slug: string };
};

const TYPE_LABEL: Record<string, string> = {
  topup: "Top-up", bonus: "Bonus", spend: "Pembayaran", refund: "Refund", adjustment: "Penyesuaian",
};

function SaldoPage() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [tx, setTx] = useState<Tx[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: ws }, { data: txs }, { data: ms }] = await Promise.all([
        supabase.from("customer_wallets" as any).select("*, shop:shops(name,slug)").eq("customer_user_id", user.id),
        supabase.from("customer_wallet_transactions" as any).select("*").eq("customer_user_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("customer_memberships" as any).select("*, tier:shop_membership_tiers(name,discount_percent), shop:shops(name,slug)").eq("customer_user_id", user.id).eq("status", "active").order("expires_at"),
      ]);
      setWallets((ws as any) ?? []);
      setTx((txs as any) ?? []);
      setMemberships((ms as any) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const totalBalance = wallets.reduce((a, w) => a + Number(w.balance || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <p className="text-xs opacity-80 flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Total Saldo Semua Toko</p>
        <p className="text-3xl font-bold mt-1">{formatIDR(totalBalance)}</p>
        <p className="text-xs opacity-80 mt-2">Saldo terpisah per toko. Top-up untuk dapat bonus.</p>
      </Card>

      <section>
        <h2 className="text-lg font-semibold mb-3">Saldo per Toko</h2>
        {wallets.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Belum ada saldo. Top-up dari halaman toko favoritmu untuk dapat bonus.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {wallets.map(w => (
              <Card key={w.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{w.shop?.name ?? "Toko"}</p>
                    <p className="text-xl font-bold">{formatIDR(w.balance)}</p>
                  </div>
                  {w.shop?.slug && (
                    <Link to="/toko/$slug/saldo" params={{ slug: w.shop.slug }}>
                      <Button size="sm" className="gap-1"><ArrowDownToLine className="h-3.5 w-3.5" />Top-up</Button>
                    </Link>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span>Total top-up: {formatIDR(w.total_topped_up)}</span>
                  <span>Terpakai: {formatIDR(w.total_spent)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Membership Aktif</h2>
        {memberships.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Belum berlangganan tier toko manapun.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {memberships.map(m => (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{m.shop?.name}</p>
                    <p className="font-semibold">{m.tier?.name}</p>
                    {m.tier?.discount_percent ? <Badge className="mt-1 bg-green-100 text-green-700 hover:bg-green-100">Diskon {m.tier.discount_percent}%</Badge> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Berakhir</p>
                    <p className="text-xs font-medium">{new Date(m.expires_at).toLocaleDateString("id-ID")}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Transaksi Saldo</h2>
        {tx.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Belum ada transaksi.</Card>
        ) : (
          <Card className="divide-y">
            {tx.map(t => {
              const positive = ["topup", "bonus", "refund"].includes(t.type);
              return (
                <div key={t.id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {positive ? <ArrowDownToLine className="h-3.5 w-3.5 text-green-600" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      {TYPE_LABEL[t.type] ?? t.type}
                    </p>
                    {t.note && <p className="text-xs text-muted-foreground mt-0.5">{t.note}</p>}
                    <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${positive ? "text-green-600" : "text-foreground"}`}>{positive ? "+" : "-"}{formatIDR(Math.abs(Number(t.amount)))}</p>
                    <p className="text-[10px] text-muted-foreground">Sisa: {formatIDR(t.balance_after)}</p>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
