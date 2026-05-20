// Minimal service worker untuk syarat installability PWA.
// Strategi NetworkFirst untuk HTML (tidak mengunci build lama),
// stale cache otomatis dibersihkan saat activate.

const CACHE_VERSION = "umkmgo-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Bersihkan cache versi lama
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
  // Hanya tangani same-origin
  if (url.origin !== self.location.origin) return;
  // Jangan cache API/Supabase/Vite
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/")
  ) {
    return;
  }

  // NetworkFirst untuk navigasi HTML
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

  // CacheFirst untuk asset statis (icon, manifest, font)
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
