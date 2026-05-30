---
name: WhatsApp Broadcast F17 Implementation
description: Detail implementasi WA broadcast via Fonnte API dengan fallback
---

## API Endpoint (artifacts/api-server/src/routes/whatsapp.ts)
- `GET /api/wa/config` — return { enabled: boolean } berdasarkan FONNTE_API_KEY env
- `POST /api/wa/send-bulk` — kirim ke array contacts/messages via Fonnte API
  - Body: `{ contacts: [{phone, name}][], message: string }` atau `{ messages: [{phone, message}][] }`
  - Rate limit: 1 detik antar pesan (Fonnte limit)
  - Response: `{ sent, failed, total, results[] }`

## Graceful Fallback Pattern (pos-app.broadcast-wa.tsx)
```
1. GET /api/wa/config → cek enabled
2. Kalau enabled: POST /api/wa/send-bulk
3. Kalau disabled/error: window.open("https://wa.me/...") — perilaku asli
```

**Why:** Merchant yang belum punya Fonnte API key tetap bisa pakai fitur broadcast (manual kirim via WhatsApp Web), yang sudah punya Fonnte bisa auto-send.

## Activation
Set `FONNTE_API_KEY` di Replit Secrets. Daftar di https://fonnte.com.

## CSV Export (F17-4)
Sudah diimplementasikan di `exportCSV()` function di broadcast-wa.tsx:
- Column: Nama, Nomor WA, Jumlah Order, Order Terakhir, Pesan Personal
- Download otomatis sebagai `broadcast-wa-{segment}.csv`
