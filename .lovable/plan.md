## Bug yang ditemukan

Alur pesan dari marketplace (`/checkout`) putus total karena ketidaksesuaian antara client dan database. Storefront per-toko (`/s/$slug/checkout`) tidak terdampak.

### 1. Parameter `_payment_method` tidak ada di RPC

`src/lib/marketplace-cart.ts` mengirim `_payment_method` saat memanggil `supabase.rpc("marketplace_checkout", ...)`, tetapi signature fungsi DB hanya menerima:

```
_recipient_name, _phone, _address, _fulfillment,
_notes, _shipping, _shop_voucher_codes, _platform_voucher_code
```

PostgREST → 404 "Could not find the function `public.marketplace_checkout(...)`". Tombol "Bayar" di `/checkout` selalu gagal sebelum apapun terjadi.

### 2. Body fungsi me-cast nilai yang tidak ada di enum

Di dalam body `marketplace_checkout`, baris INSERT order memakai:

```sql
'manual_transfer'::payment_method
```

Padahal enum `public.payment_method` hanya berisi `{cash, qris}`. Bahkan jika masalah #1 diperbaiki, INSERT tetap akan gagal dengan "invalid input value for enum payment_method".

### 3. Enum tidak mencakup metode yang ditawarkan UI

Halaman `/checkout` menampilkan tiga opsi: `transfer`, `cod`, `qris`. Hanya `qris` yang ada di enum DB.

> Storefront `/s/$slug/checkout` aman: hanya pakai `cash`/`qris` yang valid, dan memetakan `transfer → qris` sebelum insert.

## Rencana perbaikan

### A. Migrasi DB (1 file)

1. `ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'manual_transfer';`
2. `ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'cod';`
3. `DROP FUNCTION public.marketplace_checkout(...)` (signature lama) lalu `CREATE OR REPLACE` dengan:
   - Tambah parameter `_payment_method text DEFAULT 'manual_transfer'` (diletakkan SEBELUM `_notes` agar urutan param sesuai dengan apa yang dikirim client di `marketplace-cart.ts`).
   - Di awal body, normalisasi: `transfer` / `manual_transfer` → `manual_transfer`, `qris` → `qris`, `cod` → `cod`, `cash` → `cash`, lainnya → `manual_transfer`.
   - Ganti `'manual_transfer'::payment_method` di INSERT dengan variable yang sudah dinormalisasi.
   - Selebihnya body fungsi dipertahankan utuh (logika voucher, komisi, dsb).
4. `GRANT EXECUTE` ke `authenticated`.

### B. Tidak ada perubahan client

`marketplace-cart.ts` sudah mengirim `_payment_method` dengan urutan yang benar. Setelah migrasi, RPC akan menerima dan menggunakannya.

## Verifikasi

1. Login sebagai pembeli → tambah produk dari `/s/toko-berkah` ke marketplace cart (lewat `/toko/toko-berkah`) → buka `/checkout` → pilih metode `transfer` / `cod` / `qris` → submit.
2. Pastikan toast "X pesanan berhasil dibuat" muncul dan redirect ke `/checkout/sukses/{id}`.
3. Cek baris baru di tabel `orders` (`payment_method` terisi sesuai pilihan, `channel = marketplace`).
4. Verifikasi storefront `/s/$slug/checkout` masih berfungsi (regresi).

## File yang berubah

- `supabase/migrations/<timestamp>_fix_marketplace_checkout.sql` — migrasi baru (enum + drop/recreate fungsi).
