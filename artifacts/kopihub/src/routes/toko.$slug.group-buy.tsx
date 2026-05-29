import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Users, Clock, CheckCircle2, Loader2, TrendingDown, ShoppingBag, ChevronLeft, Share2,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/toko/$slug/group-buy")({
  head: () => ({ meta: [{ title: "Group Buy — Patungan" }] }),
  component: ShopGroupBuyPage,
});

type Shop = { id: string; name: string; logo_url: string | null; phone: string | null };
type GroupBuy = {
  id: string;
  title: string;
  description: string | null;
  original_price: number;
  group_price: number;
  min_participants: number;
  max_participants: number | null;
  current_participants: number;
  status: string;
  deadline_at: string;
  menu_item?: { name: string; image_url: string | null } | null;
};
type Participant = { id: string; group_buy_id: string; user_id: string; joined_at: string };

function TimeLeft({ deadline }: { deadline: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return <span className="text-red-600 text-xs font-semibold">Sudah berakhir</span>;
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return <span className="text-amber-700 text-xs font-semibold">{d} hari {h % 24} jam lagi</span>;
  return <span className="text-red-600 text-xs font-semibold">{h} jam lagi</span>;
}

function ShopGroupBuyPage() {
  const { slug } = useParams({ from: "/toko/$slug/group-buy" });
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [campaigns, setCampaigns] = useState<GroupBuy[]>([]);
  const [myJoins, setMyJoins] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase.from("shops").select("id,name,logo_url,phone").eq("slug", slug).maybeSingle();
    if (!s) { setLoading(false); return; }
    setShop(s as Shop);

    const [{ data: gbs }, myRes] = await Promise.all([
      (supabase as any).from("group_buys").select("*, menu_item:menu_items(name,image_url)")
        .eq("shop_id", s.id).in("status", ["open"]).order("deadline_at"),
      user
        ? (supabase as any).from("group_buy_participants").select("*").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    setCampaigns((gbs ?? []) as GroupBuy[]);
    setMyJoins((myRes.data ?? []) as Participant[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug, user?.id]);

  const join = async (gb: GroupBuy) => {
    if (!user) { toast.error("Silakan login dulu untuk ikut group buy"); return; }
    if (gb.max_participants && gb.current_participants >= gb.max_participants) {
      toast.error("Kuota sudah penuh"); return;
    }
    setJoining(gb.id);
    const { error } = await (supabase as any).from("group_buy_participants").insert({
      group_buy_id: gb.id, user_id: user.id, shop_id: shop?.id, joined_at: new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505") toast.error("Kamu sudah bergabung di kampanye ini");
      else toast.error(error.message);
    } else {
      await (supabase as any).from("group_buys").update({
        current_participants: gb.current_participants + 1,
      }).eq("id", gb.id);
      toast.success("Berhasil bergabung! Pantau terus hingga kuota terpenuhi.");
      if (shop?.phone) {
        const msg = encodeURIComponent(`Halo ${shop.name}, saya telah bergabung ke group buy "${gb.title}". ID: ${gb.id.slice(0, 8)}`);
        window.open(`https://wa.me/${shop.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
      }
      load();
    }
    setJoining(null);
  };

  const share = (gb: GroupBuy) => {
    const url = `${window.location.origin}/toko/${slug}/group-buy`;
    if (navigator.share) {
      navigator.share({ title: gb.title, text: `Gabung group buy "${gb.title}" dan hemat hingga ${Math.round((1 - gb.group_price / gb.original_price) * 100)}%!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link disalin");
    }
  };

  const isJoined = (gbId: string) => myJoins.some(p => p.group_buy_id === gbId);

  if (loading) return (
    <div className="min-h-screen flex flex-col"><MarketplaceHeader />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen flex flex-col"><MarketplaceHeader />
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Toko tidak ditemukan</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link to="/toko/$slug" params={{ slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="h-4 w-4" /> Kembali ke toko
          </Link>
          <div className="flex items-center gap-3">
            {shop.logo_url && <img src={shop.logo_url} alt={shop.name} className="h-10 w-10 rounded-full object-cover border" />}
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Group Buy</h1>
              <p className="text-sm text-muted-foreground">{shop.name} — Beli bersama, hemat lebih banyak</p>
            </div>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <Card className="flex flex-col items-center py-16 text-center gap-3">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">Tidak ada group buy aktif saat ini</p>
            <p className="text-sm text-muted-foreground">Ikuti toko ini agar tidak ketinggalan promo berikutnya.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map(gb => {
              const pct = Math.min(100, Math.round((gb.current_participants / gb.min_participants) * 100));
              const disc = Math.round((1 - gb.group_price / gb.original_price) * 100);
              const joined = isJoined(gb.id);
              const full = gb.max_participants !== null && gb.current_participants >= gb.max_participants;
              return (
                <Card key={gb.id} className="p-5">
                  <div className="flex gap-4">
                    {gb.menu_item?.image_url && (
                      <img src={gb.menu_item.image_url} alt={gb.menu_item.name} className="h-20 w-20 rounded-lg object-cover shrink-0 border" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h2 className="font-semibold">{gb.title}</h2>
                          {gb.menu_item && <p className="text-xs text-muted-foreground">{gb.menu_item.name}</p>}
                        </div>
                        {disc > 0 && <Badge className="bg-red-100 text-red-700 shrink-0">Hemat {disc}%</Badge>}
                      </div>
                      {gb.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{gb.description}</p>}

                      <div className="mt-2 flex items-center gap-3">
                        <div>
                          <p className="text-lg font-bold text-primary">{formatIDR(gb.group_price)}</p>
                          {gb.original_price !== gb.group_price && (
                            <p className="text-xs text-muted-foreground line-through">{formatIDR(gb.original_price)}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p className="flex items-center gap-1"><Clock className="h-3 w-3" /><TimeLeft deadline={gb.deadline_at} /></p>
                          <p className="flex items-center gap-1 mt-0.5"><Users className="h-3 w-3" />{gb.current_participants}/{gb.min_participants} peserta</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{pct}% dari target — butuh {Math.max(0, gb.min_participants - gb.current_participants)} orang lagi</p>
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        {joined ? (
                          <Button size="sm" variant="outline" disabled className="text-green-700 border-green-300">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Sudah Bergabung
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => join(gb)} disabled={joining === gb.id || full}>
                            {joining === gb.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ShoppingBag className="h-3.5 w-3.5 mr-1" />}
                            {full ? "Kuota Penuh" : "Ikut Sekarang"}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => share(gb)}>
                          <Share2 className="h-3.5 w-3.5 mr-1" /> Bagikan
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
