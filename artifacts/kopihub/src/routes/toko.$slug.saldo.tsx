import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Plus, MessageCircle } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";

export const Route = createFileRoute("/toko/$slug/saldo")({
  head: () => ({ meta: [{ title: "Top-up Saldo" }] }),
  component: ShopWalletPage,
});

type Preset = { id: string; amount: number; bonus_amount: number; label: string | null };

function ShopWalletPage() {
  const { slug } = useParams({ from: "/toko/$slug/saldo" });
  const { user } = useAuth();
  const [shop, setShop] = useState<{ id: string; name: string; slug: string; phone: string | null } | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase
      .from("shops").select("id,name,slug,phone").eq("slug", slug).maybeSingle();
    if (!s) { setLoading(false); return; }
    setShop(s as any);
    const [{ data: ps }, walletRes] = await Promise.all([
      supabase.from("wallet_topup_presets" as any).select("id,amount,bonus_amount,label").eq("shop_id", s.id).eq("is_active", true).order("sort_order"),
      user ? supabase.from("customer_wallets" as any).select("balance").eq("shop_id", s.id).eq("customer_user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setPresets((ps as any) ?? []);
    setBalance(Number((walletRes.data as any)?.balance ?? 0));
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug, user?.id]);

  const submitTopup = async (p: Preset) => {
    if (!user) { toast.error("Silakan login dulu"); return; }
    if (!shop) return;
    setSubmitting(p.id);
    const total = Number(p.amount) + Number(p.bonus_amount);
    const { data, error } = await supabase.from("wallet_topups" as any).insert({
      customer_user_id: user.id,
      shop_id: shop.id,
      preset_id: p.id,
      amount: p.amount,
      bonus_amount: p.bonus_amount,
      total_credit: total,
      status: "pending",
      payment_method: "manual",
    }).select("id").single();
    setSubmitting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Permintaan top-up dikirim. Lanjutkan pembayaran via WhatsApp.");
    const msg = encodeURIComponent(
      `Halo ${shop.name}, saya mau top-up saldo Rp${p.amount.toLocaleString("id-ID")}` +
      (p.bonus_amount > 0 ? ` (+ bonus Rp${p.bonus_amount.toLocaleString("id-ID")} = total Rp${total.toLocaleString("id-ID")})` : "") +
      `. Kode: ${(data as any).id.slice(0, 8)}`
    );
    if (shop.phone) window.open(`https://wa.me/${shop.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!shop) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Toko tidak ditemukan</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 space-y-5">
        <div>
          <Link to="/toko/$slug" params={{ slug }} className="text-xs text-primary">← Kembali ke {shop.name}</Link>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Top-up Saldo</h1>
        </div>

        <Card className="p-5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <p className="text-xs opacity-80">Saldo kamu di {shop.name}</p>
          <p className="text-3xl font-bold mt-1">{formatIDR(balance)}</p>
        </Card>

        <section>
          <h2 className="text-sm font-semibold mb-2">Pilih Nominal</h2>
          {presets.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Toko ini belum mengaktifkan top-up saldo.</Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map(p => (
                <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatIDR(p.amount)}</p>
                    {p.bonus_amount > 0 && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mt-1">+ Bonus {formatIDR(p.bonus_amount)}</Badge>}
                    {p.label && <p className="text-[11px] text-muted-foreground mt-1">{p.label}</p>}
                  </div>
                  <Button size="sm" disabled={submitting === p.id} onClick={() => submitTopup(p)} className="gap-1">
                    {submitting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Top-up
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Card className="p-4 text-xs text-muted-foreground flex gap-2 items-start">
          <MessageCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Setelah klik Top-up, kamu akan diarahkan ke WhatsApp toko untuk melakukan pembayaran. Saldo masuk setelah toko mengkonfirmasi pembayaran.</span>
        </Card>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
