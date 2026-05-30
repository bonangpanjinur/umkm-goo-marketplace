import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ensureNotificationPermission, notifyOrder } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/push/vapid-public`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.enabled ? json.publicKey : null;
  } catch {
    return null;
  }
}

export function NotificationSettings({ shopId }: { shopId?: string | null }) {
  const { user } = useAuth();
  const [perm, setPerm]           = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "Notification" in window;
    setSupported(ok);
    if (ok) setPerm(Notification.permission);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.pushManager.getSubscription().then((s) => setSubscribed(!!s));
      });
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const p = await ensureNotificationPermission();
      setPerm(p);
      if (p !== "granted") {
        toast.error("Izin notifikasi ditolak. Aktifkan di pengaturan browser.");
        return;
      }

      // Subscribe via Push API jika VAPID key tersedia
      if ("serviceWorker" in navigator && "PushManager" in window && user) {
        try {
          const vapidKey = await fetchVapidPublicKey();
          const reg = await navigator.serviceWorker.ready;
          let sub   = await reg.pushManager.getSubscription();

          if (!sub && vapidKey) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
          } else if (!sub) {
            // VAPID belum dikonfigurasi — fallback tanpa server key
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
          }

          if (sub) {
            const json = sub.toJSON();
            await supabase.from("push_subscriptions" as never).upsert(
              {
                user_id:      user.id,
                endpoint:     sub.endpoint,
                subscription: json,
                user_agent:   navigator.userAgent,
                shop_id:      shopId ?? null,
              },
              { onConflict: "user_id,endpoint" },
            );
            setSubscribed(true);
          }
        } catch (e) {
          console.warn("Push subscribe:", e);
        }
      }

      notifyOrder("UMKMgo", "Notifikasi berhasil diaktifkan ✓");
      toast.success("Notifikasi diaktifkan");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          if (user) {
            await supabase
              .from("push_subscriptions" as never)
              .delete()
              .eq("user_id", user.id)
              .eq("endpoint", sub.endpoint);
          }
        }
      }
      setSubscribed(false);
      toast.success("Berhenti berlangganan notifikasi");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Browser Anda tidak mendukung notifikasi.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">
        Status izin: <span className="font-medium text-foreground">{perm}</span>
        {subscribed && (
          <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
            Push aktif
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {perm !== "granted" || !subscribed ? (
          <Button size="sm" onClick={enable} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Aktifkan notifikasi
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={disable} disabled={busy}>
            <BellOff className="mr-2 h-4 w-4" /> Matikan
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => notifyOrder("Tes", "Ini contoh notifikasi pesanan masuk")}
        >
          Tes bunyi & notif
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Push notification latar belakang aktif saat VAPID dikonfigurasi di{" "}
        <a href="/admin/push-config" className="underline">Admin → Push Config</a>.
      </p>
    </div>
  );
}
