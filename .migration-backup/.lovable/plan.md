# Rencana: Roadmap Eksekusi Penyelesaian KopiHub

## Tujuan
Membuat **satu file markdown** di `docs/ROADMAP_PENYELESAIAN.md` yang merangkum seluruh pekerjaan tersisa, urutan prioritas, estimasi, dan checklist untuk membawa KopiHub ke status production-ready.

## Lokasi File
`docs/ROADMAP_PENYELESAIAN.md`

## Struktur Isi Markdown

### 1. Ringkasan Status
- Yang sudah selesai (POS dasar, KDS, tabel, manual payment stub, edge functions dasar)
- Yang masih bermasalah (auth redirect, payment otomatis, stock opname UI, HPP, printer routing, cron schedule)

### 2. Prioritas Eksekusi (4 Sprint)

**Sprint 1 — Auth & Onboarding (blocker)**
- Perbaiki Site URL & Redirect URL di Lovable Cloud
- Tambah Google OAuth login
- Tambah halaman Forgot/Reset Password
- Verifikasi flow signup → konfirmasi email → onboarding shop

**Sprint 2 — POS Inti & Operasional**
- UI Stock Opname (`/app/inventory/opname`) memakai tabel migrasi yang sudah ada
- Perhitungan HPP otomatis dari recipe + ingredient cost
- Refund / Void order workflow
- Hold bill (parked carts) UI lengkap
- Manual discount per item & per order
- Z-report (cashier closing) + cash drawer log
- Profit/Margin report

**Sprint 3 — Printer & Notifikasi**
- Integrasi thermal printing 58/80mm (WebUSB / network)
- Multi-printer routing (`routeItemsToPrinters`) per kategori menu
- Aktifkan Realtime untuk `orders` & `kds_tickets` (notifikasi staff)
- Low-stock alert berbasis trigger

**Sprint 4 — Payment, Customer, Infra**
- Integrasi gateway Midtrans/Xendit (ganti stub `create-payment`)
- Webhook handler `/api/public/payment-webhook` dengan signature verification
- Loyalty redemption engine + auto-promo di storefront
- Review/Rating component di `/s/$slug`
- Schedule `pg_cron` → panggil `cron-maintenance` tiap jam
- Tombol export Excel/PDF di laporan

### 3. Checklist Detail per Item
Setiap item berisi: deskripsi, file yang disentuh, tabel/RPC terkait, kriteria selesai (DoD).

### 4. Catatan Teknis
- Daftar edge functions baru yang akan dibuat: `payment-webhook`, `send-receipt-email`, `printer-bridge` (opsional)
- Daftar migrasi baru: trigger HPP, trigger low-stock alert, kolom refund di `orders`
- Daftar secret yang perlu ditambahkan user: `MIDTRANS_SERVER_KEY` / `XENDIT_API_KEY` (saat Sprint 4)

### 5. Pertanyaan Terbuka untuk User
- Pilih provider payment: Midtrans vs Xendit vs tetap manual?
- Printer: WebUSB (browser langsung) atau bridge lokal (lebih reliable)?
- Mau Sprint mana dieksekusi duluan setelah roadmap di-approve?

## Setelah Approval
Saya buat satu file `docs/ROADMAP_PENYELESAIAN.md` dengan isi di atas — **tanpa** mengubah kode lain. Eksekusi sprint dilakukan terpisah setelah Anda pilih sprint mana yang dimulai.
