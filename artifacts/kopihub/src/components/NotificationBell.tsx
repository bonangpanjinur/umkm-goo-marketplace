import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { toast } from "sonner";

const SEV_DOT: Record<string, string> = {
  info:    "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error:   "bg-destructive",
  danger:  "bg-destructive",
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}d`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}

function NotifItem({
  n,
  onRead,
  onClose,
}: {
  n: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const dot = SEV_DOT[n.severity] ?? SEV_DOT.info;

  const inner = (
    <div
      className={`flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/50 ${
        n.read_at ? "opacity-55" : "bg-primary/[0.03]"
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-opacity ${dot} ${
          n.read_at ? "opacity-0" : "opacity-100"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs ${
            n.read_at ? "font-normal text-muted-foreground" : "font-semibold text-foreground"
          }`}
        >
          {n.title}
        </p>
        {n.body && (
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.created_at)} lalu</p>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <li>
        <Link
          to={n.link as any}
          onClick={() => {
            if (!n.read_at) onRead(n.id);
            onClose();
          }}
          className="block"
        >
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => { if (!n.read_at) onRead(n.id); }}
        className="block w-full text-left"
      >
        {inner}
      </button>
    </li>
  );
}

export function NotificationBell() {
  const { items, unreadCount, markOne, markAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(items.map((n) => n.id));
    for (const n of items) {
      if (!prevIdsRef.current.has(n.id) && !n.read_at) {
        toast(n.title, { description: n.body ?? undefined });
        break;
      }
    }
    prevIdsRef.current = currentIds;
  }, [items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              key={unreadCount}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-in zoom-in-75 duration-150 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Notifikasi</p>
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => markAll()}
            >
              <Check className="h-3 w-3" />
              Tandai semua
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff className="h-7 w-7 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground">Belum ada notifikasi</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <NotifItem
                  key={n.id}
                  n={n}
                  onRead={markOne}
                  onClose={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t px-3 py-2 text-center">
          <Link
            to="/akun/notifikasi"
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:underline"
          >
            Lihat semua notifikasi →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
