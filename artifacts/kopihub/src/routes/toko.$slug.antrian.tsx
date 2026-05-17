import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Loader2, Users, Clock, RefreshCw, ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/toko/$slug/antrian")({
  head: () => ({ meta: [{ title: "Antrian — Toko" }] }),
  component: AntrianPage,
});

type Item = {
  id: string;
  queue_number: number | null;
  party_size: number;
  status: string;
  estimated_wait_minutes: number | null;
  created_at: string;
  served_at: string | null;
  customer_user_id: string | null;
};

function maskName(name: string): string {
  if (!name) return "Tamu";
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p[0] + (p.length > 1 ? "*".repeat(Math.min(p.length - 1, 3)) : "")).join(" ");
}

function AntrianPage() {
  const { slug } = Route.useParams();
  const [shop, setShop] = useState<{ id: string; name: string } | null>(null);
  const [items, setItems] = useState<(Item & { customer_name: string })[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (shopId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("booking_waitlist")
      .select("id, queue_number, party_size, status, estimated_wait_minutes, created_at, served_at, customer_user_id, customer_name, requested_date")
      .eq("shop_id", shopId)
      .in("status", ["waiting", "notified"])
      .or(`requested_date.eq.${today},requested_date.is.null`)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as never);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);
      const { data: s } = await supabase.from("shops").select("id, name").eq("slug", slug).maybeSingle();
      if (s) { setShop(s); await load(s.id); }
      setLoading(false);
    })();
  }, [slug, load]);

  useEffect(() => {
    if (!shop) return;
    const ch = supabase.channel(`waitlist:${shop.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_waitlist", filter: `shop_id=eq.${shop.id}` },
        () => load(shop.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop, load]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!shop) return <div className="p-12 text-center">Toko tidak ditemukan.</div>;

  const waiting = items.filter(i => i.status === "waiting");
  const myItem = items.find(i => i.customer_user_id && i.customer_user_id === myId);
  const myPosition = myItem ? waiting.findIndex(i => i.id === myItem.id) + 1 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-6">
        <Link to="/toko/$slug" params={{ slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Kembali ke {shop.name}
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Antrian Hari Ini</h1>
            <Button variant="ghost" size="sm" onClick={() => load(shop.id)} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          </div>
          <p className="text-sm text-muted-foreground">{waiting.length} orang sedang menunggu</p>

          {myItem && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary text-primary-foreground h-12 w-12 flex items-center justify-center text-lg font-bold">
                  {myPosition > 0 ? `#${myPosition}` : <CheckCircle2 className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold">Posisimu sekarang</p>
                  <p className="text-xs text-muted-foreground">
                    {myItem.status === "notified" ? "Kamu sudah dipanggil — silakan ke kasir" : `Perkiraan tunggu ${myItem.estimated_wait_minutes ?? Math.max(5, myPosition * 8)} menit`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {waiting.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada antrian. Kamu bisa langsung datang!</p>
            </div>
          )}
          {waiting.map((it, idx) => {
            const isMine = it.id === myItem?.id;
            return (
              <div key={it.id} className={`rounded-xl border ${isMine ? "border-primary bg-primary/5" : "border-border bg-card"} p-3 flex items-center gap-3`}>
                <div className={`rounded-full ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} h-10 w-10 flex items-center justify-center font-bold text-sm`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{isMine ? "Kamu" : maskName(it.customer_name)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Users className="h-3 w-3" /> {it.party_size} orang
                    <Clock className="h-3 w-3" /> {new Date(it.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {it.status === "notified" && <Badge className="bg-amber-100 text-amber-800">Sedang dipanggil</Badge>}
              </div>
            );
          })}
        </div>

        {!myItem && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Mau ikut antrian walk-in?</p>
            <Link to="/toko/$slug/booking" params={{ slug }} search={{ type: "table" }}>
              <Button className="gap-2"><Users className="h-4 w-4" /> Daftar Antrian</Button>
            </Link>
          </div>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
