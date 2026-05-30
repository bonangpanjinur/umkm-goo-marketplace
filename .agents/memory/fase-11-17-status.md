---
name: Fase 11–17 Implementation Status
description: Status aktual semua halaman Fase 11-17 di PRD_MARKETPLACE.md Bagian 4
---

## Metode audit yang benar
Gunakan `grep -c "\.from(" file.tsx` bukan `grep "supabase\."` — query multi-line seperti:
```
await supabase
  .from("table")
```
tidak akan match dengan `supabase\.` tapi akan match dengan `\.from(`.

## Status per Fase (audit 30 Mei 2026)

**Fase 11 (Buyer Account) — ✅ SELESAI**
Semua halaman sudah pakai Supabase query nyata:
- akun.wishlist, alamat, inbox, saldo, pesanan — sudah real sejak lama
- akun.bookings (9 queries), loyalty (5), riwayat (2), returns (5), langganan (3), favorit (2), cashback (3), referral (2), digital-products (3), notifikasi (1 via hook)

**Fase 12 (Courier) — ✅ SELESAI**
- kurir.history (2), earnings (1), profile (1), withdraw (3), index (via CourierDashboard component dengan 3+ queries)

**Fase 13 (Push Notification) — ✅ SELESAI**
Diimplementasikan:
- `artifacts/api-server/src/routes/push.ts` — GET /api/push/vapid-public, POST /api/push/vapid-keys, POST /api/push/send, POST /api/push/send-to-all
- `supabase/migrations/20260530000001_push_subscriptions.sql` — tabel push_subscriptions dengan RLS
- `PushNotificationManager.tsx` — aktif, subscribe otomatis kalau permission granted
- `NotificationSettings.tsx` — pakai VAPID key dari server, bukan hardcoded
- `admin.push-config.tsx` — tombol "Generate dari Server" memanggil /api/push/vapid-keys
- `admin.broadcast-buyers.tsx` — kirim push via /api/push/send-to-all setelah insert notifications

**Why:** Perlu VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY di Replit Secrets agar push aktif. Generate via Admin → Push Config → "Generate dari Server" button.

**Fase 14 (Admin Tools) — ✅ SELESAI**
- admin.kyc (5 queries), disputes (1), moderation (5), analytics (via RPC), activity (via observability.functions.ts)
- admin.broadcast-buyers (4 queries + push integration), payout-scheduler (real queries ke shops/wallet_transactions)

**Fase 15 (Merchant Batch 1) — ✅ SELESAI**
- pos-app.loyalty (5), flash-sale (10), cash-drawer (3), bulk-pricing (5), laporan-harian, audit-logs, customer-analytics, booking-reminders, email-marketing, combo-builder — semua real

**Fase 16 (Merchant Batch 2) — ✅ SELESAI**
- anamnesis (3), patient-records (8), invoice (1), kursus (21), skin-quiz (4), appearance (2), milestones (3), wip-gallery (4), lookbook (5), custom-css (2), verified-claims (5)
- testimonials — pakai SimpleCRUD component (Supabase di dalam component, bukan di route langsung)

**Fase 17 (WhatsApp) — 🔄 IN PROGRESS**
- F17-4 CSV export: ✅ sudah ada di pos-app.broadcast-wa.tsx `exportCSV()`
- F17-2 backend endpoint: ✅ `/api/wa/send-bulk` via Fonnte di `artifacts/api-server/src/routes/whatsapp.ts`
- F17-3 UI fallback: ✅ cek /api/wa/config dulu, kalau disabled fallback ke window.open()
- F17-1 Fonnte integration: ⚡ perlu `FONNTE_API_KEY` di Replit Secrets (daftar di fonnte.com)
