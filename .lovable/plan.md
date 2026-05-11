## Fase 5 — Notifikasi & Re-engagement

Pengerjaan dibagi 2 batch berurutan agar tiap batch selesai utuh + bisa dites sebelum lanjut.

### Batch A (loop ini)
**1. In-app Notifications (bell + realtime)**
- Migrasi: tabel `notifications` (recipient_user_id, shop_id, type, title, body, link, severity, read_at, dedupe_key) + RLS user-only.
- RPC `mark_notification_read(_id)`, `mark_all_notifications_read()`.
- Trigger otomatis di event kunci:
  - Order baru masuk (marketplace) → notif ke owner shop
  - Status order berubah → notif ke customer
  - Sengketa dibuka → notif ke owner; sengketa diselesaikan → notif ke customer
  - Payout disetujui/ditolak → notif ke owner
- Komponen `NotificationBell.tsx` (dropdown + badge unread + realtime channel) dipasang di header customer & owner.
- Halaman `/akun/notifikasi` (list lengkap + mark all read).

**2. Email Transaksional via Lovable Emails**
- Setup email infra (otomatis via tool) → template React Email untuk: order created, status updated, dispute opened, dispute resolved, payout approved.
- Server route enqueue dipanggil dari trigger DB via `pg_net` (atau dari client setelah aksi sukses).
- Domain: pakai `notify.<lovable-domain>` default (bisa custom nanti).

### Batch B (next loop)
**3. Re-engagement** — cron harian:
- Cart abandonment: cari `marketplace_carts` >24h tanpa order → kirim email + notif "Lanjutkan belanja".
- Promo blast: untuk promo `is_active` baru, kirim ke customer follower toko.

**4. Web Push (PWA)** — opsional, butuh konfirmasi VAPID:
- Service worker, tabel `push_subscriptions`, edge function `send-push`.
- Saya akan minta VAPID public/private key saat masuk batch ini.

### Mulai dari Batch A?
Jika setuju, saya langsung jalankan migrasi notifikasi + setup email infra, lalu lanjut UI bell & template email.