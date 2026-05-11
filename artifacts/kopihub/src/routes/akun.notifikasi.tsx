import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bell, BellOff, Check, CheckCheck, Loader2,
  ShoppingBag, Tag, Info, AlertTriangle, Star,
} from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/use-notifications";

export const Route = createFileRoute("/akun/notifikasi")({
  component: NotifikasiPage,
});

type FilterTab = "semua" | "belum" | "pesanan" | "promo" | "sistem";

const TAB_LABELS: { key: FilterTab; label: string }[] = [
  { key: "semua",   label: "Semua" },
  { key: "belum",   label: "Belum Dibaca" },
  { key: "pesanan", label: "Pesanan" },
  { key: "promo",   label: "Promo" },
  { key: "sistem",  label: "Sistem" },
];

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  order:   ShoppingBag,
  promo:   Tag,
  review:  Star,
  warning: AlertTriangle,
  system:  Info,
};

const SEV_DOT: Record<string, string> = {
  success: "bg-emerald-500",
  info:    "bg-blue-500",
  warning: "bg-amber-500",
  error:   "bg-destructive",
  danger:  "bg-destructive",
};

function getTypeIcon(type: string) {
  return TYPE_ICON[type] ?? Bell;
}

function timeLabel(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)         return `${diff} detik lalu`;
  if (diff < 3600)       return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400)      return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 2)  return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function dayGroup(iso: string) {
  const d     = new Date(iso);
  const today = new Date();
  const yest  = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yest.toDateString())  return "Kemarin";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function matchTab(n: Notification, tab: FilterTab) {
  if (tab === "semua")   return true;
  if (tab === "belum")   return !n.read_at;
  if (tab === "pesanan") return n.type === "order";
  if (tab === "promo")   return n.type === "promo";
  if (tab === "sistem")  return !["order", "promo"].includes(n.type);
  return true;
}

function NotifikasiPage() {
  const { items, loading, unreadCount, markOne, markAll } = useNotifications();
  const [tab, setTab]           = useState<FilterTab>("semua");
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAll();
    setMarkingAll(false);
  };

  const filtered = items.filter((n) => matchTab(n, tab));

  const groups: { day: string; notifs: Notification[] }[] = [];
  for (const n of filtered) {
    const day  = dayGroup(n.created_at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.notifs.push(n);
    else groups.push({ day, notifs: [n] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Notifikasi</h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleMarkAll}
            disabled={markingAll}
          >
            {markingAll
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCheck className="h-3.5 w-3.5" />}
            Tandai semua dibaca
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TAB_LABELS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.label}{t.key === "belum" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <BellOff className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            {tab === "belum"
              ? "Tidak ada notifikasi yang belum dibaca"
              : "Belum ada notifikasi"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.day}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.day}
              </p>
              <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
                {g.notifs.map((n) => {
                  const Icon = getTypeIcon(n.type);
                  const dot  = SEV_DOT[n.severity] ?? SEV_DOT.info;
                  return (
                    <div
                      key={n.id}
                      onClick={() => markOne(n.id)}
                      className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${
                        n.read_at ? "bg-background" : "bg-primary/5"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          n.read_at ? "bg-muted" : "bg-primary/10"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            n.read_at ? "text-muted-foreground" : "text-primary"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              n.read_at ? "text-foreground/70" : "font-semibold text-foreground"
                            }`}
                          >
                            {n.title}
                          </p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {!n.read_at && (
                              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                            )}
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {timeLabel(n.created_at)}
                            </span>
                          </div>
                        </div>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        {n.link && !n.read_at && (
                          <a
                            href={n.link}
                            onClick={(e) => { e.stopPropagation(); markOne(n.id); }}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Lihat detail →
                          </a>
                        )}
                      </div>
                      {n.read_at && (
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
