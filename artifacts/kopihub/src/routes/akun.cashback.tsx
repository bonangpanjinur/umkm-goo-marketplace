import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, Clock, CheckCircle2, XCircle, Copy, Check, Info, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/cashback")({
  head: () => ({ meta: [{ title: "Cashback Wallet — Akun" }] }),
  component: CashbackPage,
});

type Wallet = { balance: number; total_earned: number; total_used: number };
type Txn = {
  id: string;
  type: "earned" | "used" | "expired" | "adjusted";
  amount: number;
  description: string | null;
  expires_at: string | null;
  created_at: string;
  order_id: string | null;
};

const TXN_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  earned: TrendingUp,
  used: ShoppingCart,
  expired: XCircle,
  adjusted: CheckCircle2,
};
const TXN_LABEL: Record<string, string> = {
  earned: "Cashback Diterima",
  used: "Digunakan",
  expired: "Kadaluarsa",
  adjusted: "Penyesuaian",
};
const TXN_COLOR: Record<string, string> = {
  earned: "text-green-600",
  used: "text-red-500",
  expired: "text-muted-foreground",
  adjusted: "text-blue-500",
};

function CashbackPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: w, error: we } = await (supabase as any)
        .from("cashback_wallets")
        .select("balance, total_earned, total_used")
        .eq("user_id", user.id)
        .maybeSingle();
      if (we?.code === "42P01") { setLoading(false); return; }
      setWallet(w ?? { balance: 0, total_earned: 0, total_used: 0 });

      const { data: t } = await (supabase as any)
        .from("cashback_transactions")
        .select("id, type, amount, description, expires_at, created_at, order_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTxns((t ?? []) as Txn[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-36" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  const balance = wallet?.balance ?? 0;
  const earned = wallet?.total_earned ?? 0;
  const used = wallet?.total_used ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Cashback Wallet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saldo cashback dari setiap transaksi. Bisa dipakai di pembayaran berikutnya.</p>
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 shadow-lg">
        <div className="flex items-center gap-2 text-emerald-100 text-sm mb-2">
          <Wallet className="h-4 w-4" /> Saldo Cashback
        </div>
        <p className="text-4xl font-bold tracking-tight">{formatIDR(balance)}</p>
        <p className="mt-1 text-emerald-200 text-xs">Bisa digunakan saat checkout</p>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-emerald-400/40 pt-4">
          <div>
            <p className="text-xs text-emerald-200">Total Diterima</p>
            <p className="font-semibold">{formatIDR(earned)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-200">Total Digunakan</p>
            <p className="font-semibold">{formatIDR(used)}</p>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold">Cara Menggunakan Cashback</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Pilih produk dan lanjutkan ke halaman checkout</li>
          <li>Aktifkan toggle "Gunakan Cashback" di ringkasan pembayaran</li>
          <li>Cashback akan otomatis mengurangi total yang harus dibayar</li>
        </ol>
        <Link to="/keranjang">
          <Button size="sm" className="mt-2 gap-2">
            <ShoppingCart className="h-4 w-4" /> Belanja Sekarang
          </Button>
        </Link>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Riwayat Transaksi</h3>
        {txns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada transaksi cashback.</p>
            <p className="text-xs text-muted-foreground mt-1">Cashback otomatis masuk setelah order selesai.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((t) => {
              const Icon = TXN_ICON[t.type] ?? Clock;
              const isCredit = t.type === "earned" || (t.type === "adjusted" && t.amount > 0);
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted ${TXN_COLOR[t.type]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{TXN_LABEL[t.type]}</p>
                    {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      {t.expires_at && ` · Exp: ${new Date(t.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isCredit ? "text-green-600" : "text-red-500"}`}>
                    {isCredit ? "+" : "-"}{formatIDR(Math.abs(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
