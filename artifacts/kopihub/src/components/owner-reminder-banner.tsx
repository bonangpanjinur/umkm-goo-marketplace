import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShopContext } from "@/lib/shop-context";

type Notif = {
  id: string;
  shop_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: string;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-red-50 border-red-200 text-red-900",
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
};

export function OwnerReminderBanner() {
  const { shop } = useShopContext();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const { listMyNotifications } = await import("@/lib/api/notifications.functions");
      const rows = await listMyNotifications();
      const arr = Array.isArray(rows)
        ? rows
        : Array.isArray((rows as { result?: unknown })?.result)
          ? ((rows as { result: Notif[] }).result)
          : [];
      setItems(arr as Notif[]);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();

    // F3-5: filter realtime channel by shop_id when available
    const filter = shop?.id ? `shop_id=eq.${shop.id}` : undefined;
    const channelName = shop?.id ? `owner-notif-banner-${shop.id}` : "owner-notif-banner";

    const chBuilder = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "owner_notifications",
          ...(filter ? { filter } : {}),
        } as any,
        () => load(),
      );

    const ch = chBuilder.subscribe();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch as any);
    };
  }, [shop?.id]);

  const dismissOne = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      const { markNotification } = await import("@/lib/api/notifications.functions");
      await markNotification({ data: { id, action: "dismiss" } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
      load();
    }
  };

  const dismissAll = async () => {
    setItems([]);
    try {
      const { markNotification } = await import("@/lib/api/notifications.functions");
      await Promise.all(items.map((n) => markNotification({ data: { id: n.id, action: "dismiss" } })));
    } catch {
      load();
    }
  };

  if (items.length === 0) return null;

  const unread = items.filter((n) => !n.read_at);
  const highest = items.reduce((acc, n) => {
    const order = ["info", "success", "warning", "danger"];
    return order.indexOf(n.severity) > order.indexOf(acc) ? n.severity : acc;
  }, "info");

  return (
    <div className="relative z-20">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 border-b px-4 py-2 text-sm transition-colors ${SEVERITY_STYLES[highest] ?? SEVERITY_STYLES.info}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left font-medium">
          {unread.length > 0 ? `${unread.length} pengingat baru` : `${items.length} pengingat`}
        </span>
        <Bell className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 border-b bg-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pengingat
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={dismissAll}>
                <Check className="h-3 w-3" /> Hapus semua
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 text-sm ${SEVERITY_STYLES[n.severity] ?? ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="text-xs mt-0.5 text-current/80">{n.body}</p>}
                  {n.link && (
                    <Link to={n.link as any} className="text-xs underline mt-1 inline-block" onClick={() => setOpen(false)}>
                      Lihat →
                    </Link>
                  )}
                </div>
                <button type="button" onClick={() => dismissOne(n.id)} className="shrink-0 mt-0.5 hover:opacity-70">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
