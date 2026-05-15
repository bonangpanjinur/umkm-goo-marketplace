## Ringkasan Bug Ditemukan

### 1. Redirect 404 mengarah ke route yang TIDAK ADA
File `artifacts/kopihub/src/routes/__root.tsx` punya `REDIRECT_RULES` yang menunjuk ke path tidak terdaftar:

| Aturan saat ini | Status | Seharusnya |
|---|---|---|
| `/admin*` → `/admin` | ✅ ada (`admin.tsx`) | tetap |
| `/app*` → `/app` | ❌ tidak ada | `/pos-app` |
| `/cart*`, `/checkout*` → `/cart` | ❌ tidak ada | `/keranjang` |
| `/order*` → `/orders` | ❌ tidak ada | `/akun/pesanan` |
| `/s/*` → `/` | ✅ | tetap |
| `/signup`, `/login` | ✅ | tetap |

Akibat: pengguna yang salah ketik URL di-redirect ke route yang juga 404 → loop.

### 2. Tabel `banners` tidak ada di database
- `src/routes/index.tsx:286` query `from("banners")` → **404 PGRST205** ("Could not find the table 'public.banners'")
- `src/routes/admin.banners.tsx` (CRUD admin) juga gagal — fallback ke DEMO_BANNERS, jadi admin tidak bisa benar-benar menyimpan banner.

### 3. Data master kosong (bukan bug, tapi UX rusak)
- `business_categories` mengembalikan `[]` → kategori homepage kosong.
- `coffee_shops.business_category_id = null` → tidak terhitung di kategori.
- Tidak diperbaiki via migrasi (ini data, bukan skema), tapi perlu seed minimal supaya homepage tidak kosong saat fresh deploy.

### 4. Hal yang sudah benar (tidak perlu disentuh)
- `delivery_zones` sudah punya `min_eta_minutes` / `max_eta_minutes`
- `product_qa`, `restock_subscribers`, `ad_requests`, `couriers.email` sudah ada
- `notifications.functions.ts` & `.server.ts` sudah ada (404 di network log lama, sudah resolved)
- SPA routing (`_redirects`) sudah benar

---

## Rencana Perbaikan

### Langkah 1 — Migrasi DB: tambah tabel `banners`
Buat tabel `public.banners` dengan kolom: `title`, `subtitle`, `cta_text`, `cta_link`, `image_url`, `bg_color`, `sort_order`, `is_active`, plus `id/created_at/updated_at` standar.

RLS:
- **SELECT publik** untuk semua (banner ditampilkan di homepage tanpa login).
- **INSERT/UPDATE/DELETE** hanya untuk Super Admin (cek via `has_role(auth.uid(), 'super_admin')` mengikuti pola yang sudah dipakai di project).

Trigger `update_updated_at_column` untuk `updated_at`.

### Langkah 2 — (Opsional) Seed `business_categories`
Insert 5–8 kategori default (Makanan & Minuman, Fashion, Elektronik, Kecantikan, Rumah Tangga, dll.) supaya homepage tidak tampak kosong di project baru. Dilakukan via tool insert (data, bukan skema).

### Langkah 3 — Perbaiki `REDIRECT_RULES` di `__root.tsx`
Update mapping menjadi:
```ts
{ test: p => p.startsWith("/admin"), to: "/admin", label: "Dashboard Super Admin" }
{ test: p => p.startsWith("/pos-app") || p.startsWith("/app"), to: "/pos-app", label: "Dashboard Toko" }
{ test: p => p.startsWith("/s/"), to: "/", label: "Beranda Marketplace" }
{ test: /^\/(signup|register|daftar)/, to: "/signup", label: "Daftar" }
{ test: /^\/(login|signin|masuk)/, to: "/login", label: "Masuk" }
{ test: p => p.startsWith("/keranjang") || p.startsWith("/cart") || p.startsWith("/checkout"), to: "/keranjang", label: "Keranjang" }
{ test: p => p.startsWith("/akun/pesanan") || p.startsWith("/order") || p.startsWith("/pesanan"), to: "/akun/pesanan", label: "Pesanan Saya" }
{ test: p => p.startsWith("/akun"), to: "/akun", label: "Akun Saya" }
```

### Langkah 4 — Verifikasi
- Reload `/` → tidak ada lagi error 404 `banners`.
- Buka `/admin/banners` → bisa create/edit/save (tidak fallback ke demo).
- Buka URL acak `/foobar` → countdown redirect ke `/` (bukan ke route yang juga 404).
- Buka `/app/anything` → diarahkan ke `/pos-app` dengan benar.

---

## Catatan teknis
- Tidak ada perubahan pada server functions, hanya satu migrasi SQL + satu edit file route + satu insert data opsional.
- Migrasi dijalankan terpisah (tool migration) lalu dilanjutkan edit code setelah approved.
