# Integrasi Payment Gateway untuk Booking Deposit (F-16)

## Tujuan
Hubungkan alur booking yang sudah ada ke payment gateway (Midtrans / Xendit) yang sudah terkonfigurasi di API server, sehingga deposit booking bisa dibayar otomatis tanpa konfirmasi manual via WA.

## Perubahan

### 1. Database — Tambah kolom & tabel transaksi booking
- Tambah `deposit_transaction_id` dan `deposit_paid_at` pada `bookings`.
- Tambah `deposit_amount` pada `booking_slots` (opsional, default 0 = tanpa deposit).
- Pastikan tabel `payment_transactions` (Drizzle) mendukung `booking_id` selain `order_id`.

### 2. API Server — Endpoint booking deposit
- Buat `POST /api/bookings/:id/pay-deposit` yang:
  - Hitung deposit dari slot (price * deposit_percent / 100).
  - Pilih gateway aktif (Midtrans/Xendit dari env).
  - Buat payment transaction record.
  - Return snap token / checkout URL ke frontend.

- Tambah webhook handler `POST /api/public/webhooks/payment` untuk menerima notifikasi bayar.
  - Update `bookings.status` dari `pending_deposit` → `confirmed` saat deposit lunas.
  - Kirim notifikasi ke merchant & customer.

### 3. Frontend — Halaman bayar deposit pembeli
- Di `/toko/$slug/booking.tsx` atau halaman konfirmasi booking:
  - Setelah pembeli pilih slot, tampilkan ringkasan + tombol "Bayar Deposit".
  - Integrasi Midtrans Snap (popup) atau redirect Xendit.
  - Halaman `/booking/$id/status` untuk cek status pembayaran.

### 4. POS / Merchant — Status booking terbaru
- Update `/pos-app/booking.tsx`:
  - Badge status booking berwarna: `pending_deposit` (kuning), `confirmed` (hijau), `cancelled` (merah).
  - Tampilkan indikator "Deposit dibayar / belum dibayar".

### 5. Reminder & Notifikasi
- Gunakan sistem notifikasi yang sudah ada (`use-notifications.ts` + Supabase Realtime).
- Trigger notifikasi:
  - Pembeli: "Deposit berhasil, booking dikonfirmasi."
  - Merchant: "Booking baru dengan deposit sudah dibayar."

## Yang TIDAK diubah
- Skema `booking_slots` utama (waktu, kapasitas, service_name) tetap.
- Cancel / reschedule via token tetap berlaku.
- Logika QR meja yang baru dikerjakan tidak terganggu.

## Risiko & mitigasi
- Midtrans/Xendit env belum disetting → fallback ke konfirmasi manual dengan badge "Tunggu Admin".
- Webhook gagal terima → polling status tiap 30 detik di halaman status.

## Estimasi
2-3 hari kerja untuk versi MVP (Midtrans Snap + webhook + update status booking).
