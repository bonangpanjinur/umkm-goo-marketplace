/**
 * F5-1 · F5-2 · F5-3 — SSE Publisher Hook
 *
 * Dipakai di POS shell utama (merchant yang sudah login).
 * Mendengarkan perubahan Supabase Realtime untuk satu toko, lalu meneruskan
 * setiap event ke SSE relay di Express (/api/sse/publish) agar KDS tablet,
 * layar display tamu, dan dashboard kurir bisa menerima event tanpa koneksi
 * Supabase langsung.
 *
 * Penggunaan:
 *   // Di shell POS owner
 *   useSSEPublisher(shop?.id);
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

async function publish(
  shopId: string,
  channel: "pos" | "courier" | "notifications",
  event: string,
  payload: unknown,
  token: string,
) {
  try {
    await fetch(`${API_BASE}/api/sse/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shop_id: shopId, channel, event, payload }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // SSE relay boleh gagal — tidak mempengaruhi UX utama
  }
}

export function useSSEPublisher(shopId: string | null | undefined) {
  const shopIdRef = useRef(shopId);
  shopIdRef.current = shopId;

  useEffect(() => {
    if (!shopId) return;

    async function getToken() {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }

    // ── F5-1: POS sync — order INSERT/UPDATE ─────────────────────────────────
    const orderCh = supabase
      .channel(`sse-pub-orders:${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        async (p) => {
          const token = await getToken();
          if (!token || !shopIdRef.current) return;
          const order = p.new as Record<string, unknown>;
          // POS: order baru masuk
          publish(shopIdRef.current, "pos", "order_new", order, token);
          // F5-2: Kurir — order baru (untuk future: belum in_delivery)
          if (order["fulfillment"] === "delivery") {
            publish(shopIdRef.current, "courier", "order_new", order, token);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        async (p) => {
          const token = await getToken();
          if (!token || !shopIdRef.current) return;
          const order = p.new as Record<string, unknown>;
          const prevStatus = (p.old as Record<string, unknown>)["status"];

          // F5-1: semua perubahan status ke POS channel
          publish(shopIdRef.current, "pos", "order_update", order, token);

          // F5-2: saat order menjadi 'ready' → kurir bisa ambil
          if (order["status"] === "ready" && prevStatus !== "ready") {
            publish(shopIdRef.current, "courier", "order_ready", order, token);
          }
          // F5-2: saat kurir assign / in_delivery
          if (order["status"] === "in_delivery" && prevStatus !== "in_delivery") {
            publish(shopIdRef.current, "courier", "order_picked_up", order, token);
          }
        },
      )
      .subscribe();

    // ── F5-3: Notifikasi merchant ─────────────────────────────────────────────
    const notifCh = supabase
      .channel(`sse-pub-notifs:${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "owner_notifications",
          filter: `shop_id=eq.${shopId}`,
        },
        async (p) => {
          const token = await getToken();
          if (!token || !shopIdRef.current) return;
          publish(shopIdRef.current, "notifications", "notification_new", p.new, token);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderCh);
      supabase.removeChannel(notifCh);
    };
  }, [shopId]);
}

// ── Hook untuk SSE subscriber (KDS tablet, display tamu, dsb.) ───────────────
/**
 * Hubungkan ke SSE relay untuk menerima event real-time tanpa Supabase auth.
 *
 * @param shopId  ID toko yang dipantau
 * @param channel "pos" | "courier" | "notifications"
 * @param onEvent Callback dipanggil saat event diterima
 */
export function useSSESubscriber(
  shopId: string | null | undefined,
  channel: "pos" | "courier" | "notifications",
  onEvent: (event: string, data: unknown) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!shopId) return;

    const url = `${API_BASE}/api/sse/stream?shop_id=${encodeURIComponent(shopId)}&channel=${channel}`;
    let es: EventSource | null = new EventSource(url);
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMessage(e: MessageEvent) {
      try {
        const data = JSON.parse(e.data as string);
        onEventRef.current(e.type, data);
      } catch {
        // malformed data — ignore
      }
    }

    // Listen for all event types
    ["order_new", "order_update", "order_ready", "order_picked_up", "notification_new"].forEach(
      (ev) => es?.addEventListener(ev, handleMessage),
    );

    es.onerror = () => {
      es?.close();
      es = null;
      // Reconnect after 5s
      reconnectTimer = setTimeout(() => {
        es = new EventSource(url);
      }, 5_000);
    };

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [shopId, channel]);
}
