// Service Worker — UMKMgo PWA
// Strategi NetworkFirst untuk HTML, CacheFirst untuk asset statis.
// Push notification + notificationclick support (F4-4).

const CACHE_VERSION = "umkmgo-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/")
  ) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
  }
});

// ── F4-4: Push Notification ──────────────────────────────────────────────────
// Payload format (JSON dari server):
// {
//   title: string,
//   body: string,
//   icon?: string,       // default "/icons/icon-192.png"
//   badge?: string,      // default "/icons/badge-96.png"
//   url?: string,        // URL yang dibuka saat notif diklik
//   tag?: string,        // group key (mencegah duplikat notif sejenis)
//   data?: object        // data tambahan
// }

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "UMKMgo", body: event.data ? event.data.text() : "Ada notifikasi baru" };
  }

  const title   = payload.title  || "UMKMgo";
  const options = {
    body:    payload.body   || "",
    icon:    payload.icon   || "/icons/icon-192.png",
    badge:   payload.badge  || "/icons/badge-96.png",
    tag:     payload.tag    || "umkmgo-default",
    data:    { url: payload.url || "/", ...(payload.data || {}) },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
