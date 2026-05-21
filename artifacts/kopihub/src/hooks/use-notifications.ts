import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

type BroadcastMsg =
  | { kind: "read_one"; id: string; read_at: string }
  | { kind: "read_all"; read_at: string }
  | { kind: "dismiss_one"; id: string }
  | { kind: "dismiss_all" };

const CHANNEL_NAME = "umkmgo:notifications";
const PAGE_SIZE = 30; // Phase 2: trim payload — 30 notif terbaru saja
const COLS = "id, type, title, body, link, severity, read_at, created_at";

async function fetchNotifications(uid: string): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select(COLS)
    .eq("recipient_user_id", uid)
    .is("dismissed_at" as any, null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  return (data ?? []) as Notification[];
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const bcRef = useRef<BroadcastChannel | null>(null);

  const queryKey = ["notifications", user?.id ?? "anon"] as const;

  const { data: items = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const patchCache = useCallback(
    (updater: (prev: Notification[]) => Notification[]) => {
      qc.setQueryData<Notification[]>(queryKey, (prev) => updater(prev ?? []));
    },
    [qc, queryKey],
  );

  // Realtime + BroadcastChannel sync
  useEffect(() => {
    if (!user) return;

    const bc = new BroadcastChannel(CHANNEL_NAME);
    bcRef.current = bc;
    bc.onmessage = (ev: MessageEvent<BroadcastMsg>) => {
      const msg = ev.data;
      if (msg.kind === "read_one") {
        patchCache((prev) => prev.map((n) => (n.id === msg.id ? { ...n, read_at: msg.read_at } : n)));
      } else if (msg.kind === "read_all") {
        patchCache((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? msg.read_at })));
      }
    };

    const ch = supabase
      .channel(`notif-hook-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          patchCache((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, PAGE_SIZE));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          patchCache((prev) => prev.map((x) => (x.id === n.id ? { ...x, ...n } : x)));
        },
      )
      .subscribe();

    return () => {
      bc.close();
      bcRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [user, patchCache]);

  const markOne = useCallback(
    async (id: string) => {
      const read_at = new Date().toISOString();
      patchCache((prev) => prev.map((n) => (n.id === id ? { ...n, read_at } : n)));
      bcRef.current?.postMessage({ kind: "read_one", id, read_at } as BroadcastMsg);
      await supabase.rpc("mark_notification_read", { _id: id });
    },
    [patchCache],
  );

  const markAll = useCallback(async () => {
    const read_at = new Date().toISOString();
    patchCache((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? read_at })));
    bcRef.current?.postMessage({ kind: "read_all", read_at } as BroadcastMsg);
    await supabase.rpc("mark_all_notifications_read");
  }, [patchCache]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  return { items, loading, unreadCount, markOne, markAll, refresh: refetch };
}
