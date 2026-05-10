# Roadmap Penyelesaian KopiHub

> Dokumen tunggal berisi semua pekerjaan tersisa untuk membawa KopiHub ke status **production-ready**.
> Update terakhir: Sprint plan v1.

---

## 1. Ringkasan Status

### ✅ Sudah Selesai
- POS dasar: katalog menu, modifier, cart, checkout
- KDS (Kitchen Display System) realtime dasar
- Manajemen meja & QR order
- Manual payment (cash, transfer manual, QRIS statis)
- Edge function `create-payment` (stub) & `cron-maintenance`
- Struktur RBAC: Super Admin / Owner / Staff / Customer
- Migrasi tabel `stock_opnames` & `stock_opname_items` (tabel ada, UI belum)
- Recipe & ingredient cost (data tersimpan, perhitungan HPP belum auto)
- Multi-outlet, plan & billing dasar

### ⚠️ Masih Bermasalah / Belum Selesai
| Area | Masalah |
|---|---|
| Auth | Site URL & Redirect URL belum di-set → email confirm error "requested path is invalid" |
| Auth | Belum ada Google OAuth |
| Auth | Belum ada halaman Forgot/Reset Password |
| POS | Stock Opname belum punya UI |
| POS | HPP & margin belum dihitung otomatis dari recipe |
| POS | Refund / Void order belum ada |
| POS | Manual discount per item & per order belum lengkap |
| POS | Z-report (cashier closing) & cash drawer log belum ada |
| Printer | Thermal printing 58/80mm belum terintegrasi |
| Printer | Multi-printer routing per kategori belum jalan |
| Notif | Realtime `orders` & `kds_tickets` belum di-publish |
| Payment | `create-payment` masih stub — belum ke gateway |
| Payment | Webhook handler belum ada |
| Customer | Loyalty redemption engine & auto-promo belum jalan |
| Customer | Review/Rating component belum di-port |
| Infra | `pg_cron` belum dijadwalkan ke `cron-maintenance` |
| Laporan | Tombol export Excel/PDF sebagian belum berfungsi |

---

## 2. Prioritas Eksekusi (4 Sprint)

### 🔴 Sprint 1 — Auth & Onboarding (BLOCKER)
**Tujuan:** User baru bisa daftar → konfirmasi email → masuk app → onboard shop tanpa error.

| # | Task | DoD |
|---|---|---|
| 1.1 | Set Site URL & Redirect URL di Lovable Cloud | Klik link konfirmasi email tidak error 404 |
| 1.2 | Aktifkan Google OAuth via `configure_social_auth` | Tombol "Lanjut dengan Google" berfungsi di /auth |
| 1.3 | Buat halaman `/auth/forgot-password` | Kirim email reset berhasil |
| 1.4 | Buat halaman `/auth/reset-password` | Token recovery → form set password baru → redirect ke /app |
| 1.5 | Verifikasi flow signup → onboarding (`/app/onboarding/shop`) | User baru otomatis diarahkan ke onboarding |

**File baru:** `artifacts/kopihub/src/routes/auth.forgot-password.tsx`, `artifacts/kopihub/src/routes/auth.reset-password.tsx`

---

### 🟠 Sprint 2 — POS Inti & Operasional
**Tujuan:** Kasir bisa jualan, refund, hold bill, hitung margin & tutup kasir.

| # | Task | File / Tabel |
|---|---|---|
| 2.1 | UI Stock Opname | `routes/app.inventory.opname.tsx`, `routes/app.inventory.opname.$id.tsx` |
| 2.2 | Trigger HPP otomatis dari `recipes` × `ingredients.cost_per_unit` | Migrasi: `compute_menu_hpp()` + trigger |
| 2.3 | Refund / Void order | Kolom `orders.refunded_at`, `orders.void_reason`; UI di detail order |
| 2.4 | Hold bill (parked carts) UI | `lib/parked-carts.ts` + tab di POS |
| 2.5 | Manual discount per item & per order | Field `discount_amount` di `order_items` & `orders` |
| 2.6 | Z-report (cashier closing) | `routes/app.shifts.tsx` + RPC `close_shift_summary` |
| 2.7 | Cash drawer log | Tabel `cash_drawer_movements` |
| 2.8 | Profit / Margin report | `routes/app.reports.profit.tsx` (gabung HPP × penjualan) |

---

### 🟡 Sprint 3 — Printer & Notifikasi
**Tujuan:** Struk & ticket dapur tercetak otomatis, staff dapat notif realtime.

| # | Task | Catatan |
|---|---|---|
| 3.1 | Integrasi thermal printing 58/80mm | Pilihan: WebUSB direct atau bridge lokal (lihat pertanyaan §5) |
| 3.2 | Multi-printer routing per kategori | `lib/receipt-printer.ts` → `routeItemsToPrinters()` |
| 3.3 | Aktifkan Realtime untuk `orders` & `kds_tickets` | `ALTER PUBLICATION supabase_realtime ADD TABLE ...` |
| 3.4 | Notifikasi in-app + bunyi (kasir & dapur) | `lib/notify.ts` di-wire ke channel realtime |
| 3.5 | Low-stock alert | Trigger di `ingredients` → insert ke `notifications` |

---

### 🟢 Sprint 4 — Payment Online, Customer & Infra
**Tujuan:** Bayar online otomatis, loyalty jalan, cron terjadwal.

| # | Task | Catatan |
|---|---|---|
| 4.1 | Integrasi gateway (Midtrans / Xendit) | Ganti stub di `supabase/functions/create-payment` |
| 4.2 | Webhook handler `/api/public/payment-webhook` | Dengan HMAC signature verification |
| 4.3 | Loyalty redemption engine | Port `lib/loyalty-enhanced.ts` + UI redeem di /s/$slug |
| 4.4 | Auto-promo (Buy X Get Y, diskon kategori) | Engine di `lib/promo-loyalty.ts` |
| 4.5 | Review/Rating component | Di halaman customer `/s/$slug` |
| 4.6 | Schedule `pg_cron` → `cron-maintenance` tiap jam | Migrasi `cron.schedule(...)` |
| 4.7 | Tombol export Excel/PDF di semua laporan | Pakai `lib/export.ts` |

---

## 3. Catatan Teknis

### Edge Functions yang akan dibuat
- `payment-webhook` — terima callback dari gateway, update `orders.payment_status`
- `send-receipt-email` — kirim struk PDF ke email customer (opsional)
- `printer-bridge` — hanya jika pakai bridge lokal (opsional)

### Migrasi baru yang diperlukan
- `add_hpp_trigger.sql` — auto-compute HPP saat recipe/ingredient berubah
- `add_refund_columns.sql` — `refunded_at`, `void_reason`, `refund_amount` di `orders`
- `add_cash_drawer_movements.sql` — tabel log buka/tutup laci
- `enable_realtime_orders.sql` — publish `orders` & `kds_tickets`
- `schedule_cron_maintenance.sql` — `cron.schedule('maintenance', '0 * * * *', ...)`

### Secret yang perlu ditambahkan user (saat Sprint 4)
- `MIDTRANS_SERVER_KEY` **atau** `XENDIT_API_KEY`
- `PAYMENT_WEBHOOK_SECRET` (untuk verifikasi signature)

---

## 4. Checklist Eksekusi

```
SPRINT 1 — AUTH
[ ] 1.1 Site URL + Redirect URL
[ ] 1.2 Google OAuth
[ ] 1.3 Forgot password page
[ ] 1.4 Reset password page
[ ] 1.5 Verifikasi flow signup → onboarding

SPRINT 2 — POS
[ ] 2.1 Stock Opname UI
[ ] 2.2 HPP otomatis
[ ] 2.3 Refund/Void
[ ] 2.4 Hold bill
[ ] 2.5 Manual discount
[ ] 2.6 Z-report
[ ] 2.7 Cash drawer log
[ ] 2.8 Profit/Margin report

SPRINT 3 — PRINTER & NOTIF
[ ] 3.1 Thermal printing
[ ] 3.2 Multi-printer routing
[ ] 3.3 Realtime publish
[ ] 3.4 In-app notif + bunyi
[ ] 3.5 Low-stock alert

SPRINT 4 — PAYMENT & INFRA
[ ] 4.1 Gateway integration
[ ] 4.2 Webhook handler
[ ] 4.3 Loyalty redemption
[ ] 4.4 Auto-promo
[ ] 4.5 Review/Rating
[ ] 4.6 pg_cron schedule
[ ] 4.7 Export Excel/PDF
```

---

## 5. Pertanyaan Terbuka (Mohon Dijawab Sebelum Eksekusi Sprint 4)

1. **Provider payment**: Midtrans, Xendit, atau tetap manual transfer saja?
2. **Printer**: WebUSB (browser langsung, lebih simpel) atau bridge lokal (Node.js kecil di kasir, lebih reliable)?
3. **Sprint mana yang dimulai duluan?** Default rekomendasi: Sprint 1 → 2 → 3 → 4.

---

*Setelah Anda jawab pertanyaan di §5, saya mulai eksekusi sprint pilihan Anda.*
