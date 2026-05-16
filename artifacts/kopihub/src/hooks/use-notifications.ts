import { useCallback, useEffect, useRef, useState } from "react";
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
  | { kind: "read_all"; read_at: string };

const CHANNEL_NAME = "umkmgo:notifications";
const MAX_ITEMS = 50;

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const applyReadOne = useCallback((id: string, read_at: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at } : n)),
    );
  }, []);

  const applyReadAll = useCallback((read_at: string) => {
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? read_at })),
    );
  }, []);

  const fetch = useCallback(async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, severity, read_at, created_at")
      .eq("recipient_user_id", uid)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    fetch(user.id);

    const bc = new BroadcastChannel(CHANNEL_NAME);
    bcRef.current = bc;
    bc.onmessage = (ev: MessageEvent<BroadcastMsg>) => {
      const msg = ev.data;
      if (msg.kind === "read_one") applyReadOne(msg.id, msg.read_at);
      if (msg.kind === "read_all") applyReadAll(msg.read_at);
    };

    const ch = supabase
      .channel(`notif-hook-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, MAX_ITEMS));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) =>
            prev.map((x) => (x.id === n.id ? { ...x, ...n } : x)),
          );
        },
      )
      .subscribe();

    return () => {
      bc.close();
      bcRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [user, fetch, applyReadOne, applyReadAll]);

  const markOne = useCallback(
    async (id: string) => {
      const read_at = new Date().toISOString();
      applyReadOne(id, read_at);
      const msg: BroadcastMsg = { kind: "read_one", id, read_at };
      bcRef.current?.postMessage(msg);
      await supabase.rpc("mark_notification_read", { _id: id });
    },
    [applyReadOne],
  );

  const markAll = useCallback(async () => {
    const read_at = new Date().toISOString();
    applyReadAll(read_at);
    const msg: BroadcastMsg = { kind: "read_all", read_at };
    bcRef.current?.postMessage(msg);
    await supabase.rpc("mark_all_notifications_read");
  }, [applyReadAll]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  return { items, loading, unreadCount, markOne, markAll, refresh: () => user && fetch(user.id) };
}
