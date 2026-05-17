## I.2 — Marketplace filter: Kategori + Subtype + Lokasi

Tambah filter **business_subtype** (subtipe usaha, mis. `umroh`, `klinik-umum`, `studio-foto`) ke pencarian marketplace yang sudah ada, melengkapi filter kategori + kota yang sudah jalan. Kolom `shops.business_subtype` sudah ada di DB, tidak perlu migration.

### 1. `artifacts/kopihub/src/routes/search.tsx` — tambah dimensi `subtype`

- **Schema URL**: tambah `subtype: z.string().optional().default("")` di `searchSchema`.
- **Load opsi subtype**: query `shops.business_subtype` (distinct) — filter ke `business_category_id` aktif kalau `cat` dipilih, supaya dropdown hanya menampilkan subtype relevan (mis. saat cat=`travel` → `umroh`, `tour`, `hajj`). Re-fetch saat `cat` berubah.
- **buildProductQuery / buildShopQuery**: 
  - shop: `.eq("business_subtype", subtype)`
  - product: `.eq("shop.business_subtype", subtype)`
- **UI Filter panel**: tambah `<Select>` "Subtipe usaha" di samping field Kategori. Disabled + placeholder "Pilih kategori dulu" jika `cat` kosong.
- **Cache key, activePills, localStorage snapshot, reset-all, clearFilter**: tambahkan `subtype` di setiap tempat.
- **Header hasil**: tambah label subtype di samping nama kategori bila aktif.

### 2. `artifacts/kopihub/src/routes/kategori.$slug.tsx` — quick filter inline

Di halaman kategori (mis. `/kategori/travel`), tambah baris filter ringkas di bawah banner:

- `Select` Subtipe (subtype unik di kategori ini) 
- `Input` Kota
- Tombol "Cari" → `navigate({ to: "/search", search: { cat: slug, subtype, city } })`

Tujuannya: dari landing kategori user langsung sampai ke hasil terfilter tanpa harus buka panel filter di /search.

### 3. Tidak ada perubahan DB & backend

- Kolom `business_subtype` sudah tersedia di `shops`.
- Tidak menyentuh server functions / RLS.
- Pertahankan semua mekanisme cache + abort controller + retry yang sudah ada.

### 4. Update `.lovable/plan.md`

Tandai I.2 selesai.

### Catatan teknis

- Subtype option list pakai `select("business_subtype").not("business_subtype","is",null)` + dedupe di client (jumlah toko kecil, cukup). Jika nanti banyak, pindah ke RPC `list_subtypes_by_category`.
- Label subtype: pakai map kecil di `src/lib/feature-keys.ts` atau inline label dictionary di filter (mis. `umroh → Umroh`, `studio-foto → Studio Foto`). Mulai dengan dictionary kecil; fallback ke raw slug bila tidak dikenal.
- Cache key wajib include `subtype` agar hasil filter tidak bocor antar subtype.

Setelah persetujuan, eksekusi langsung tanpa migrasi DB.