import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCcw, Package, Calendar, Pause, Play, X, Loader2, ChevronRight, ShoppingBag,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/langganan")({
  head: () => ({ meta: [{ title: "Langganan Produk — Akun" }] }),
  component: MySubscriptionsPage,
});

type Subscription = {
  id: string;
  plan_id: string;
  shop_id: string;
  status: "active" | "paused" | "cancelled";
  started_at: string;
  next_delivery_at: string | null;
  address: string | null;
  notes: string | null;
  plan?: {
    name: string;
    interval: string;
    price: number;
    menu_item?: { name: string; image_url: string | null } | null;
  } | null;
  shop?: { name: string; slug: string; logo_url: string | null } | null;
};

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "Mingguan", biweekly: "2x Sebulan", monthly: "Bulanan",
};

const STATUS_LABEL: Record<string, string> = { active: "Aktif", paused: "Dijeda", cancelled: "Berhenti" };
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700", paused: "bg-amber-100 text-amber-700", cancelled: "bg-gray-100 text-gray-500",
};

function MySubscriptionsPage() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState<boolean | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("product_subscriptions")
      .select("*, plan:product_subscription_plans(name, interval, price, menu_item:menu_items(name, image_url)), shop:shops(name, slug, logo_url)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });
    if (error?.code === "42P01" || error?.message?.toLowerCase().includes("does not exist")) {
      setTableReady(false);
      setLoading(false);
      return;
    }
    setTableReady(true);
    setSubs((data ?? []) as Subscription[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const updateStatus = async (id: string, status: "active" | "paused" | "cancelled") => {
    setBusy(id);
    const { error } = await (supabase as any).from("product_subscriptions").update({ status }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "active" ? "Langganan dilanjutkan" : status === "paused" ? "Langganan dijeda" : "Langganan dihentikan");
    load();
  };

  if (!user) return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground mb-4">Silakan login untuk melihat langganan Anda.</p>
      <Link to="/login"><Button>Login</Button></Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-6">
        <RefreshCcw className="h-5 w-5" /> Langganan Produk Rutin
      </h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : tableReady === false ? (
        <Card className="flex flex-col items-center py-14 text-center gap-3">
          <RefreshCcw className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">Fitur langganan belum aktif</p>
          <p className="text-sm text-muted-foreground">Fitur berlangganan produk rutin belum tersedia. Cek kembali nanti.</p>
        </Card>
      ) : subs.length === 0 ? (
        <Card className="flex flex-col items-center py-14 text-center gap-3">
          <RefreshCcw className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">Belum ada langganan aktif</p>
          <p className="text-sm text-muted-foreground">Temukan toko dengan fitur langganan produk rutin dan berhemat setiap pengiriman.</p>
          <Link to="/"><Button variant="outline"><ShoppingBag className="h-4 w-4 mr-2" /> Jelajahi Toko</Button></Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {subs.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex gap-3">
                {s.plan?.menu_item?.image_url ? (
                  <img src={s.plan.menu_item.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm">{s.plan?.name ?? "Plan"}</p>
                      <p className="text-xs text-muted-foreground">{s.plan?.menu_item?.name}</p>
                    </div>
                    <Badge className={`text-[11px] ${STATUS_COLOR[s.status]}`} variant="outline">{STATUS_LABEL[s.status]}</Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {s.shop && (
                      <Link to="/toko/$slug" params={{ slug: s.shop.slug }} className="flex items-center gap-1 hover:text-foreground">
                        {s.shop.logo_url && <img src={s.shop.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />}
                        {s.shop.name} <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                    {s.plan?.interval && <Badge variant="outline" className="text-[11px]">{INTERVAL_LABEL[s.plan.interval]}</Badge>}
                    {s.plan?.price && <span className="font-semibold text-foreground">{formatIDR(s.plan.price)}/pengiriman</span>}
                  </div>

                  {s.next_delivery_at && s.status === "active" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 w-fit">
                      <Calendar className="h-3 w-3" />
                      Pengiriman berikutnya: {new Date(s.next_delivery_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2 flex-wrap">
                    {s.status === "active" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-amber-700 border-amber-300" onClick={() => updateStatus(s.id, "paused")} disabled={busy === s.id}>
                        {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Pause className="h-3 w-3 mr-1" />} Jeda
                      </Button>
                    )}
                    {s.status === "paused" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => updateStatus(s.id, "active")} disabled={busy === s.id}>
                        {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />} Lanjutkan
                      </Button>
                    )}
                    {s.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => {
                        if (confirm("Hentikan langganan ini?")) updateStatus(s.id, "cancelled");
                      }} disabled={busy === s.id}>
                        <X className="h-3 w-3 mr-1" /> Hentikan
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
