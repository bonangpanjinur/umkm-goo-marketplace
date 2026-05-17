## Tujuan
Mengubah sistem dari "KopiHub" (khusus coffee shop) menjadi **"UMKMgo"** (semua jenis usaha UMKM), mencakup backend (skema database), kode, dan seluruh teks UI/PWA/email.

## Temuan Audit

**Backend / Database**
- Tabel `public.coffee_shops` — masih bernama coffee, padahal sudah generic (sudah punya kolom `business_category_id` & `business_subtype`). Tidak ada kolom/tabel lain yang spesifik kopi.
- Tabel kosong (0 baris), jadi rename aman tanpa migrasi data.

**Kode**
- 154 file menyebut "kopi/coffee" (total ~330 kemunculan).
- ~50+ query memakai `supabase.from("coffee_shops")` dan join `shop:coffee_shops(...)`.
- File generated `src/integrations/supabase/types.ts` (auto-regen setelah migrasi).

**Teks brand & contoh data**
- `public/manifest.webmanifest`: name/short_name "KopiHub", description "coffeeshop modern".
- `index.html`: title sudah "UMKMgo POS" ✅.
- Email/reminder templates: `app.kopihub.id`, "PT KopiHub Indonesia", "KOPIHUB INDONESIA", placeholder "Kopi Senja".
- Sandbox demo: "Warung Kopi Demo".
- iCal PRODID: `KopiHub//Booking`.
- Memori proyek (`mem://index.md`): masih menyebut "coffee shop (KopiHub)".

## Rencana Eksekusi

### 1. Migrasi Database (1 migration)
- `ALTER TABLE public.coffee_shops RENAME TO shops;`
- Rename constraint/FK names yang berawalan `coffee_shops_*` → `shops_*` agar bersih.
- Update policy names jika mengandung "coffee".
- Tidak ada perubahan kolom; hanya rename. Setelah ini, `types.ts` di-regen otomatis.

### 2. Refactor Kode (sweep `coffee_shops` → `shops`)
- Global replace di seluruh `artifacts/kopihub/src/**`:
  - `from("coffee_shops")` → `from("shops")`
  - `shop:coffee_shops(` → `shop:shops(`
  - `coffee_shops(` (di select join) → `shops(`
  - `referencedRelation: "coffee_shops"` (akan ter-regen di types.ts)
- File terdampak utama: `src/lib/use-shop.ts`, semua route `admin.*`, `toko.$slug.*`, `akun.*`, `checkout*`, `order.*`, `bandingkan.tsx`, `katalog.*`, `kategori.*`, `track.*`, `download.*`, `booking.*`, `server/*.functions.ts`.

### 3. Rebrand Teks & Aset
- `public/manifest.webmanifest`: name/short_name = "UMKMgo", description = "POS & Marketplace untuk semua UMKM".
- Semua literal "KopiHub" → "UMKMgo"; "kopihub.id" → "umkmgo.id" (placeholder URL email/billing).
- "PT KopiHub Indonesia" → "PT UMKMgo Indonesia"; "KOPIHUB INDONESIA" → "UMKMGO INDONESIA".
- iCal PRODID `KopiHub//Booking` → `UMKMgo//Booking`.
- Placeholder contoh: "Kopi Senja" → "Toko Berkah", "Warung Kopi Demo" → "Warung UMKM Demo".
- Sandbox seed (`admin.sandbox.tsx`) — pastikan deskripsi mencakup variasi UMKM (F&B, retail, jasa, dll), bukan hanya kafe.
- Hapus/ganti copy "coffeeshop modern" / "kedai kopi" di komponen landing/onboarding bila ada.

### 4. Memori Proyek
- Update `mem://index.md` Core: deskripsi jadi "SaaS POS multi-UMKM (UMKMgo)" alih-alih coffee shop.

### 5. Validasi
- Cek build TS lulus setelah types.ts ter-regen.
- Sanity test: `/admin/shops`, `/toko/$slug`, `/checkout`, `/onboarding` membuka tanpa error.
- Grep akhir: tidak ada lagi `coffee_shops`, "KopiHub", "coffeeshop" di `src/` & `public/` (kecuali nama folder `artifacts/kopihub/` yang tidak diubah karena hanya path build).

### Tidak Termasuk
- Tidak mengubah nama folder `artifacts/kopihub/` (berisiko mempengaruhi config Replit/build pipeline).
- Tidak mengubah logika bisnis, hanya naming & branding.
- Domain produksi sebenarnya (umkmgo.id vs kopihub.id) hanya placeholder UI — DNS aktual tetap di tangan kamu.

## Detail Teknis Migrasi

```sql
ALTER TABLE public.coffee_shops RENAME TO shops;
-- Postgres otomatis update FK references; nama constraint lama tetap valid.
-- Opsional cleanup nama constraint:
ALTER TABLE public.shops RENAME CONSTRAINT coffee_shops_pkey TO shops_pkey;
-- (dan FK lain yang berawalan coffee_shops_)
```

Setelah migrasi, `types.ts` di-regen → semua `Database["public"]["Tables"]["coffee_shops"]` lenyap → typecheck akan menangkap referensi yang terlewat.
