# Rencana: Payment Gateway Paket + Reminder Dinamis + Audit PRD

Tiga pekerjaan terpisah, dieksekusi berurutan dalam satu sesi build.

## 1. Pengaturan Payment Gateway untuk Pembelian Paket Platform

Status saat ini: `admin.payment-config.tsx` sudah menyimpan key Midtrans/Xendit di `platform_settings.payment_gateways` — namun konteksnya untuk pesanan marketplace, dan belum ada flow checkout paket berlangganan.

Yang akan dibuat:

- **Halaman baru `admin.platform-billing.tsx`** (sidebar "Billing Paket Platform")
  - Pilih gateway aktif untuk billing paket: Midtrans, Xendit, Manual Transfer, QRIS Statis.
  - Re-use credential dari `payment_gateways` (tidak duplikasi key) + tambahan field khusus paket: `webhook_url_billing`, `success_redirect_url`, `failure_redirect_url`, `auto_activate_on_paid` (toggle), `invoice_prefix`, `tax_inclusive` (PPN 11%).
  - Tombol "Test Koneksi" yang memanggil server function untuk ping endpoint Midtrans/Xendit dengan key tersimpan.
  - Panel daftar metode pembayaran yang akan ditampilkan ke owner saat upgrade paket (drag-to-reorder).
- **Tabel baru `platform_billing_config`** (key/value JSON di `platform_settings` dengan key `plan_billing`).
- **Server function `createPlanCheckout`** (`src/lib/plan-billing.functions.ts`)
  - Input: `plan_id`, `shop_id`. Output: `checkout_url` + `invoice_id`.
  - Routing per gateway aktif (Midtrans Snap / Xendit Invoice).
- **Server route webhook `/api/public/webhooks/plan-billing/{provider}.ts`**
  - Verifikasi signature, update `shop_subscriptions.status = 'active'`, set `plan_expires_at`, kirim notifikasi.
- **Tombol "Upgrade" di `pos-app` (owner)** mengarah ke flow checkout baru bila gateway aktif; fallback manual transfer bila tidak.

Catatan: kredensial Midtrans/Xendit (server key, secret) akan tetap disimpan di tabel `platform_settings` (terenkripsi via RLS — hanya super admin baca). Tidak menggunakan Lovable secret store karena nilai harus dapat di-rotate dari UI super admin (multi-tenant).

## 2. Pengaturan Reminder Paket Habis (Trial & Berbayar)

Status saat ini: `admin.auto-renewal.tsx` sudah eksekusi cron, tapi window hari & template pesannya hardcoded.

Yang akan dibuat:

- **Halaman baru `admin.expiry-reminders.tsx`** (sidebar grup "Notifikasi")
  - Tab **Trial**, tab **Paket Berbayar**.
  - Per tab: daftar "rule reminder" yang bisa di-CRUD:
    - `days_before_expiry` (1, 3, 7, 14 …)
    - `channels` (multi: in-app, email, WhatsApp, push)
    - `template_subject` & `template_body` (mendukung variabel `{{shop_name}}`, `{{plan_name}}`, `{{days_left}}`, `{{expires_at}}`, `{{renewal_url}}`)
    - `is_active` toggle, urutan prioritas
  - Pengaturan global: jam kirim harian (default 09:00 WIB), zona waktu, batas maksimal reminder per hari per shop (anti-spam), aksi otomatis pada hari ekspiry (suspend / grace period N hari).
  - Preview render template dengan data dummy.
  - Tombol "Test kirim ke owner saya" (kirim ke akun super admin).
- **Tabel baru `expiry_reminder_rules`** (`id`, `audience` enum trial/paid, `days_before`, `channels` text[], `template_subject`, `template_body`, `is_active`, `sort_order`, timestamps) + RLS super admin only.
- **Tabel baru `expiry_reminder_settings`** (single-row JSON di `platform_settings.expiry_reminders`).
- **Refactor cron job auto-renewal** untuk membaca rule dari tabel (tidak hardcode), dan mendukung audience `trial` (membaca `shops.trial_ends_at` jika ada — kalau kolom belum ada akan ditambahkan via migrasi).
- Link cross-navigasi dari halaman `admin.auto-renewal.tsx` → "Atur rule reminder di sini".

## 3. Audit PRD vs Codebase

Skrip otomatis (sekali jalan, tidak disimpan):

1. Parse `PRD_MARKETPLACE.md`, ekstrak baris berformat tabel dengan kolom status (✅ / ❌ / ⬜).
2. Untuk setiap baris dengan referensi file route (mis. ``pos-app.followup-reminders.tsx``) atau nama fitur kunci (mis. "Open Bills", "Audit Pesanan", "Lokasi Sesi Foto", "Tarif Ongkir Outlet"), cek keberadaan file di `artifacts/kopihub/src/routes/`.
3. Hasilkan laporan dua bagian:
   - **A. Sudah ada di codebase tapi masih ❌/⬜ di PRD** → akan diubah menjadi ✅ dengan catatan path file.
   - **B. Masih ❌ dan benar-benar belum ada** → ditambahkan ke section baru di PRD: `## 📋 Backlog Aktual (Audit 15 Mei 2026)` berisi list item + estimasi prioritas.
4. Patch `PRD_MARKETPLACE.md` in-place dengan kedua perubahan.

Item kandidat update ✅ (berdasarkan eksplorasi cepat — akan diverifikasi di audit):
- F-16/SB-10/RT-09 Deposit via Payment Gateway — sebagian terjawab oleh `admin.payment-config.tsx` (config sudah ada, eksekusi checkout belum) → tetap ❌ sampai item #1 di plan ini selesai.
- Open Bills realtime, Audit Pesanan, Tarif Ongkir Outlet, Lokasi Sesi Foto — kemungkinan belum ditandai di PRD.

## Detail Teknis

- Stack: TanStack Start + Supabase (Lovable Cloud). Server-side pakai `createServerFn` + `requireSupabaseAuth`; webhook publik di `src/routes/api/public/`.
- Validasi input pakai Zod (panjang, format URL untuk redirect, regex template variabel).
- RLS: tabel `platform_billing_config`, `expiry_reminder_rules` hanya bisa diakses role `super_admin` via `has_role()`.
- Webhook gateway: verifikasi signature SHA512 (Midtrans) / x-callback-token (Xendit) sebelum mutasi data.
- Audit script: Node + regex sederhana, output ke stdout dulu untuk review, baru patch file.

## Urutan Eksekusi

1. Migrasi DB (3 tabel + kolom `shops.trial_ends_at` jika perlu).
2. Halaman `admin.platform-billing.tsx` + server function checkout + webhook.
3. Halaman `admin.expiry-reminders.tsx` + refactor cron.
4. Audit script + patch PRD.
5. Tambah entri sidebar `admin.tsx` untuk dua halaman baru.