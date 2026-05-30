---
name: Push Notification F13 Implementation
description: Detail implementasi VAPID push notification backend dan frontend
---

## API Endpoints (artifacts/api-server/src/routes/push.ts)
- `GET /api/push/vapid-public` — return public key (atau enabled:false kalau belum set)
- `POST /api/push/vapid-keys` — generate key pair baru pakai webpush.generateVAPIDKeys()
- `POST /api/push/send` — kirim push ke array subscriptions yang dikirim client
- `POST /api/push/send-to-all` — ambil semua subscriptions dari Supabase, broadcast

## Environment Variables Required
- `VAPID_PUBLIC_KEY` — di Replit Secrets
- `VAPID_PRIVATE_KEY` — di Replit Secrets  
- `VAPID_SUBJECT` — optional, default `mailto:admin@umkmgo.id`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — untuk /send-to-all query subscriptions

## Database
- Migration: `supabase/migrations/20260530000001_push_subscriptions.sql`
- Tabel: `push_subscriptions (id, user_id, shop_id, endpoint, subscription jsonb, user_agent, created_at, updated_at)`
- RLS: user hanya bisa manage milik sendiri; service_role bisa read all

## Frontend
- `PushNotificationManager.tsx` — auto-subscribe kalau permission granted + VAPID key tersedia
- `NotificationSettings.tsx` — fetch VAPID key dari /api/push/vapid-public, bukan hardcoded
- Service worker `/sw.js` — sudah handle `push` dan `notificationclick` events

**Why:** Pattern ini memungkinkan push aktif tanpa rebuild app — cukup set env vars.
**How to activate:** Generate keys via Admin → Push Config → "Generate dari Server", simpan, lalu set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY di Secrets.
