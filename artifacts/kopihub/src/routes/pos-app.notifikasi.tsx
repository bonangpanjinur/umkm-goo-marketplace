import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import {
  Bell, RefreshCw, Loader2, ShoppingCart, Package, Star,
  Wallet, AlertTriangle, Info, CheckCheck, BellOff,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/notifikasi")({
  head: () => ({ meta: [{ title: "Notifikasi Toko" }] }),
  component: OwnerNotifikasiPage,
});

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const NOTIF_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  new_order:          ShoppingCart,
  low_stock:          AlertTriangle,
  review:             Star,
  withdrawal:         Wallet,
  withdrawal_approved:Wallet,
  withdrawal_rejected:Wallet,
  escrow_released:    Wallet,
  kyc_approved:       CheckCheck,
  kyc_rejected:       AlertTriangle,
  system:             Info,
};

const NOTIF_COLOR: Record<string, string> = {
  new_order:           "bg-blue-100 text-blue-600",
  low_stock:           "bg-red-100 text-red-600",
  review:              "bg-amber-100 text-amber-600",
  withdrawal:          "bg-emerald-100 text-emerald-600",
  withdrawal_approved: "bg-emerald-100 text-emerald-600",
  withdrawal_rejected: "bg-red-100 text-red-600",
  escrow_released:     "bg-emerald-100 text-emerald-600",
  kyc_approved:        "bg-emerald-100 text-emerald-600",
  kyc_rejected:        "bg-red-100 text-red-600",
  system:              "bg-muted text-muted-foreground",
};

const FILTER_OPTIONS = [
  { key: "all",        label: "Semua" },
  { key: "unread",     label: "Belum dibaca" },
  { key: "order",      label: "Pesanan" },
  { key: "stock",      label: "Stok" },
  { key: "finance",    label: "Keuangan" },
  { key: "review",     label: "Ulasan" },
] as const;

type FilterKey = typeof FILTER_OPTIONS[number]["key"];

function groupByDay(notifs: Notif[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: { label: string; items: Notif[] }[] = [];
  const seen = new Map<string, Notif[]>();

  for (const n of notifs) {
    const d = new Date(n.created_at);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = "Hari ini";
    else if (d.toDateString() === yesterday.toDateString()) key = "Kemarin";
    else key = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

    if (!seen.has(key)) { seen.set(key, []); groups.push({ label: key, items: seen.get(key)! }); }
    seen.get(key)!.push(n);
  }
  return groups;
}

function OwnerNotifikasiPage() {
  const { shop } = useCurrentShop();
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [markingAll,setMarkingAll]= useState(false);
  const [filter,    setFilter]    = useState<FilterKey>("all");

  // Notifikasi level-toko disimpan di tabel `owner_notifications`
  // (skema: shop_id, type, title, body, link, severity, read_at, dismissed_at, created_at).
  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("owner_notifications" as any)
      .select("id, type, title, body, link, read_at, created_at")
      .eq("shop_id", shop.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(150);
    setNotifs((data as unknown as Notif[]) ?? []);
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!shop?.id) return;
    const ch = supabase
      .channel(`owner_notif_${shop.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "owner_notifications",
        filter: `shop_id=eq.${shop.id}`,
      }, payload => {
        const n = payload.new as Notif;
        setNotifs(prev => [n, ...prev]);
        toast(n.title, { description: n.body ?? undefined, duration: 5000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop?.id]);

  const markOne = async (id: string) => {
    await supabase.from("owner_notifications" as any).update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAll = async () => {
    setMarkingAll(true);
    await supabase.from("owner_notifications" as any).update({ read_at: new Date().toISOString() })
      .eq("shop_id", shop!.id).is("read_at", null);
    setMarkingAll(false);
    setNotifs(ns => ns.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    toast.success("Semua notifikasi ditandai dibaca");
  };

  const filtered = useMemo(() => {
    let list = [...notifs];
    if (filter === "unread")  list = list.filter(n => !n.read_at);
    if (filter === "order")   list = list.filter(n => n.type === "new_order");
    if (filter === "stock")   list = list.filter(n => n.type === "low_stock");
    if (filter === "finance") list = list.filter(n => ["withdrawal", "withdrawal_approved", "withdrawal_rejected", "escrow_released"].includes(n.type));
    if (filter === "review")  list = list.filter(n => n.type === "review");
    return list;
  }, [notifs, filter]);

  const unreadCount = notifs.filter(n => !n.read_at).length;
  const groups = groupByDay(filtered);

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifikasi Toko
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Pesanan baru, stok menipis, keuangan, dan ulasan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAll} disabled={markingAll} className="gap-1.5">
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Tandai semua dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map(f => {
          const count = f.key === "unread" ? unreadCount : undefined;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}{count != null && count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">{filter === "unread" ? "Tidak ada notifikasi yang belum dibaca" : "Belum ada notifikasi"}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground">{group.label}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <ul className="space-y-1.5">
                {group.items.map(n => {
                  const Icon = NOTIF_ICON[n.type] ?? Bell;
                  const iconCls = NOTIF_COLOR[n.type] ?? "bg-muted text-muted-foreground";
                  const unread = !n.read_at;
                  return (
                    <li
                      key={n.id}
                      onClick={() => !n.read_at && markOne(n.id)}
                      className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-colors cursor-pointer ${unread ? "border-primary/20 bg-primary/5 hover:bg-primary/10" : "border-border bg-card hover:bg-muted/30"}`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm ${unread ? "font-semibold" : "font-medium"} truncate`}>{n.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                        {n.action_url && (
                          <a
                            href={n.action_url}
                            onClick={e => e.stopPropagation()}
                            className="mt-1 inline-block text-xs text-primary hover:underline"
                          >
                            Lihat detail →
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
