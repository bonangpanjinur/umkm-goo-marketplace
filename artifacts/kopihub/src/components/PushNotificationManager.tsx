// F13-3 — Push Notification Manager
// Komponen ini subscribe user ke push notification via VAPID.
// Mount di root layout; berjalan diam di background.

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/push/vapid-public`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.enabled ? json.publicKey : null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding  = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData  = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    (async () => {
      try {
        // 1. Cek apakah sudah ada subscription
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing || cancelled) return;

        // 2. Cek apakah user sudah pernah menolak permission
        if (Notification.permission === "denied") return;

        // 3. Ambil VAPID public key dari server
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey || cancelled) return;

        // 4. Subscribe (hanya kalau permission sudah "granted" — tidak minta izin otomatis)
        if (Notification.permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        if (cancelled) return;

        // 5. Simpan subscription ke Supabase
        const json = sub.toJSON();
        await supabase.from("push_subscriptions" as never).upsert(
          {
            user_id:      user.id,
            endpoint:     sub.endpoint,
            subscription: json,
            user_agent:   navigator.userAgent,
            shop_id:      null,
          },
          { onConflict: "user_id,endpoint" },
        );
      } catch (e) {
        // Silent — VAPID mungkin belum dikonfigurasi
        console.debug("[PushNotificationManager]", e);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return null;
}
