---
name: Akun buyer pages Supabase status
description: Status koneksi Supabase semua 14 halaman akun buyer; pelajaran grep multi-line; bug yang ditemukan dan diperbaiki.
---

## Status (per Fase 11)

Semua 14 halaman `/akun/*` sudah memiliki Supabase query — BUKAN mock.
Penyebab salah deteksi: grep `supabase\.` tidak match format multi-line:
```js
const { data } = await supabase
  .from("table")   // baris baru — grep miss ini
```

## Bug yang diperbaiki

| File | Bug | Fix |
|------|-----|-----|
| `akun.returns.tsx` | `.eq("customer_id")` | `.eq("customer_user_id")` — sesuai kolom orders |
| `akun.loyalty.tsx` | Demo fallback tampil data palsu | Dihapus; show empty state |
| `akun.referral.tsx` | Demo fallback tampil data palsu | Dihapus; show empty state |
| `akun.kursus.tsx` | Tidak ada 42P01 handling | Tambah "fitur_belum_aktif" sentinel |
| `akun.langganan.tsx` | Tidak ada error handling | Tambah `tableReady` state |
| `akun.digital-products.tsx` | Embedded filter mungkin gagal | Konversi ke two-step query |
| `akun.bookings.tsx` | customer_profiles/bookings 42P01 crash | Tambah 42P01 early return |
| `akun.rate-kurir.tsx` | courier_ratings 42P01 crash | Fix conditional setExisting |

## Desain yang benar (bukan bug)

- `akun.bookings.tsx` — query by `customer_phone` (intentional; bookings tied to phone, not user_id)
- `akun.riwayat.tsx` — "recently viewed products" via localStorage + Supabase enrichment (intentional)
- `akun.favorit.tsx` — "favorit order" list di localStorage, detail dari orders Supabase (intentional)

## Blocker yang masih ada (bukan kode)

- BL-4: SQL migration belum dijalankan → beberapa tabel belum ada (loyalty_points, bookings, dll.)
- BL-5: types.ts belum di-regenerate → banyak `as any` cast yang diperlukan

**Why:** Penting diingat saat debug "fitur tidak berfungsi" — masalahnya bukan kode tapi tabel DB belum dibuat.
