import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Check, MessageCircle } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";

export const Route = createFileRoute("/toko/$slug/membership")({
  head: () => ({ meta: [{ title: "Membership Toko" }] }),
  component: ShopMembershipPage,
});

type Tier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  discount_percent: number;
  perks: string[];
};

type Active = { id: string; tier_id: string; expires_at: string };

function ShopMembershipPage() {
  const { slug } = useParams({ from: "/toko/$slug/membership" });
  const { user } = useAuth();
  const [shop, setShop] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase.from("coffee_shops").select("id,name,phone").eq("slug", slug).maybeSingle();
    if (!s) { setLoading(false); return; }
    setShop(s as any);
    const [{ data: ts }, mRes] = await Promise.all([
      supabase.from("shop_membership_tiers" as any).select("*").eq("shop_id", s.id).eq("is_active", true).order("sort_order"),
      user ? supabase.from("customer_memberships" as any).select("id,tier_id,expires_at").eq("customer_user_id", user.id).eq("shop_id", s.id).eq("status", "active").gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setTiers(((ts as any) ?? []).map((t: any) => ({ ...t, perks: Array.isArray(t.perks) ? t.perks : [] })));
    setActive((mRes.data as any) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug, user?.id]);

  const subscribe = async (t: Tier) => {
    if (!user) { toast.error("Silakan login dulu"); return; }
    if (!shop) return;
    setSubmitting(t.id);
    const expires = new Date(Date.now() + t.duration_days * 86400000);
    const { data, error } = await supabase.from("customer_memberships" as any).insert({
      customer_user_id: user.id,
      shop_id: shop.id,
      tier_id: t.id,
      expires_at: expires.toISOString(),
      status: "active",
      paid_amount: t.price,
      payment_method: "manual",
    }).select("id").single();
    setSubmitting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Berlangganan dicatat. Lanjutkan pembayaran via WhatsApp.");
    const msg = encodeURIComponent(
      `Halo ${shop.name}, saya berlangganan membership "${t.name}" Rp${t.price.toLocaleString("id-ID")} (${t.duration_days} hari). Kode: ${(data as any).id.slice(0, 8)}`
    );
    if (shop.phone) window.open(`https://wa.me/${shop.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    load();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!shop) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Toko tidak ditemukan</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 space-y-5">
        <div>
          <Link to="/toko/$slug" params={{ slug }} className="text-xs text-primary">← Kembali ke {shop.name}</Link>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2"><Crown className="h-6 w-6 text-amber-500" /> Membership {shop.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Berlangganan untuk dapat diskon otomatis & perks eksklusif.</p>
        </div>

        {active && (
          <Card className="p-4 bg-amber-50 border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">Membership aktif</p>
              <p className="text-xs text-amber-800">Berakhir {new Date(active.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <Crown className="h-5 w-5 text-amber-500" />
          </Card>
        )}

        {tiers.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Toko ini belum menyediakan tier membership.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tiers.map(t => {
              const isActive = active?.tier_id === t.id;
              return (
                <Card key={t.id} className={`p-5 space-y-3 ${isActive ? "border-amber-500 ring-2 ring-amber-200" : ""}`}>
                  <div>
                    <p className="font-semibold text-lg">{t.name}</p>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{formatIDR(t.price)}</p>
                    <p className="text-xs text-muted-foreground">untuk {t.duration_days} hari</p>
                  </div>
                  {t.discount_percent > 0 && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Diskon otomatis {t.discount_percent}%</Badge>
                  )}
                  <ul className="space-y-1.5">
                    {t.perks.map((p, i) => (
                      <li key={i} className="text-sm flex items-start gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />{p}</li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => subscribe(t)}
                    disabled={submitting === t.id || isActive}
                    className="w-full gap-2"
                    variant={isActive ? "outline" : "default"}
                  >
                    {submitting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isActive ? "Sedang Aktif" : "Langganan"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="p-4 text-xs text-muted-foreground flex gap-2 items-start">
          <MessageCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Setelah klik Langganan, kamu diarahkan ke WhatsApp toko untuk pembayaran. Status membership otomatis aktif untuk dipakai selama periode berlangganan.</span>
        </Card>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
