import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, X, Wallet, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/wallet-approvals")({
  head: () => ({ meta: [{ title: "Approval Top-up Saldo" }] }),
  component: WalletApprovalsPage,
});

type Topup = {
  id: string;
  customer_user_id: string;
  amount: number;
  bonus_amount: number;
  total_credit: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  note: string | null;
  customer?: { display_name: string | null; phone: string | null } | null;
};

function Row({ t, onApprove, onReject, busy }: { t: Topup; onApprove?: (id: string) => void; onReject?: (id: string) => void; busy: string | null }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{t.customer?.display_name ?? "Pelanggan"}</p>
          {t.customer?.phone && <p className="text-xs text-muted-foreground">{t.customer.phone}</p>}
          <p className="text-[11px] text-muted-foreground mt-1">{new Date(t.created_at).toLocaleString("id-ID")}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Kode: {t.id.slice(0, 8)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold">{formatIDR(t.amount)}</p>
          {t.bonus_amount > 0 && <p className="text-xs text-green-600">+ bonus {formatIDR(t.bonus_amount)}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">Total kredit: {formatIDR(t.total_credit)}</p>
        </div>
      </div>
      {t.status === "pending" ? (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1" onClick={() => onApprove?.(t.id)} disabled={busy === t.id}>
            {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Setujui
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onReject?.(t.id)} disabled={busy === t.id}>
            <X className="h-3.5 w-3.5" />Tolak
          </Button>
        </div>
      ) : (
        <Badge variant={t.status === "paid" ? "default" : "secondary"} className={t.status === "paid" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
          {t.status === "paid" ? "Disetujui" : t.status === "cancelled" ? "Ditolak" : t.status}
        </Badge>
      )}
    </Card>
  );
}

function WalletApprovalsPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [pending, setPending] = useState<Topup[]>([]);
  const [history, setHistory] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!shop) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("wallet_topups" as any)
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (rows as any[]) ?? [];
    // fetch customer names
    const userIds = Array.from(new Set(list.map(r => r.customer_user_id)));
    let profiles: Record<string, { display_name: string | null; phone: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("customer_profiles" as any)
        .select("user_id,display_name,phone")
        .in("user_id", userIds);
      for (const p of (profs as any[]) ?? []) profiles[p.user_id] = { display_name: p.display_name, phone: p.phone };
    }
    const enriched: Topup[] = list.map(r => ({ ...r, customer: profiles[r.customer_user_id] ?? null }));
    setPending(enriched.filter(r => r.status === "pending"));
    setHistory(enriched.filter(r => r.status !== "pending"));
    setLoading(false);
  };

  useEffect(() => { if (!shopLoading) load(); }, [shop?.id, shopLoading]);

  // Realtime: refresh on changes
  useEffect(() => {
    if (!shop) return;
    const ch = supabase
      .channel(`topups-${shop.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_topups", filter: `shop_id=eq.${shop.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop?.id]);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("approve_wallet_topup" as any, { _topup_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Top-up disetujui & saldo dikreditkan");
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt("Alasan penolakan (opsional):") ?? "";
    setBusy(id);
    const { error } = await supabase.rpc("reject_wallet_topup" as any, { _topup_id: id, _reason: reason || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Top-up ditolak");
    load();
  };

  if (shopLoading || loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Approval Top-up Saldo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verifikasi pembayaran pelanggan, lalu setujui untuk otomatis menambah saldonya.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-3.5 w-3.5" />Menunggu
            {pending.length > 0 && <Badge className="ml-1 h-5 px-1.5">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Tidak ada top-up menunggu.</Card>
          ) : (
            pending.map(t => <Row key={t.id} t={t} onApprove={approve} onReject={reject} busy={busy} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {history.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada riwayat.</Card>
          ) : (
            history.map(t => <Row key={t.id} t={t} busy={busy} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
