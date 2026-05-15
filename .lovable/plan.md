## Tujuan

1. Tambah kategori usaha baru: **"Sales & Layanan Profesional"** dengan 2 sub-tipe: **Travel & Umroh** dan **Sales / Marketing**.
2. Buat fitur backend + storefront khusus untuk masing-masing sub-tipe (paket umroh, flyer, lead capture, WA, fasilitas, testimoni, portfolio, kredensial).
3. Refactor sidebar `/pos-app` agar **adaptif total**: untuk usaha non-POS (Umroh, Sales, Digital, Jasa), menu POS / KDS / Stok / Inventori / Resep / Shift Kasir disembunyikan.
4. Custom domain tetap berfungsi sama (sudah ada infra-nya).

---

## Step 1 — Database (1 migration)

### 1a. Seed kategori baru
- INSERT 1 row baru ke `business_categories`:
  - slug: `sales-jasa-profesional`
  - name: `Sales & Layanan Profesional`
  - icon: `Briefcase`
- Hasilnya muncul di onboarding & marketplace homepage otomatis.

### 1b. Field sub-tipe di shop
- ALTER `coffee_shops` ADD COLUMN `business_subtype TEXT` (nullable). Values: `umroh`, `sales`, atau NULL.
- Diisi saat onboarding kalau kategori = `sales-jasa-profesional`.

### 1c. Tabel baru

**`umroh_packages`** — paket perjalanan
- shop_id, name, description, departure_date, return_date, duration_days
- hotel_makkah, hotel_madinah, airline, room_type
- price_quad, price_triple, price_double, currency
- includes (text[]), excludes (text[])
- cover_image_url, brochure_pdf_url
- quota_total, quota_filled, is_active, sort_order

**`umroh_facilities`** — fasilitas (icon + label + description)
- shop_id, icon (lucide name), title, description, sort_order

**`umroh_faqs`** — FAQ & syarat dokumen
- shop_id, category (`general` | `documents`), question, answer, sort_order

**`flyers`** — galeri flyer (dipakai Umroh & Sales)
- shop_id, title, description, image_url, file_url (PDF optional)
- linked_package_id (nullable, → umroh_packages atau sales_offerings), sort_order, is_active

**`sales_offerings`** — produk/layanan sales
- shop_id, title, short_desc, long_desc, price_label (text bebas: "Mulai 5jt", "Hubungi"), cover_image_url, category, sort_order, is_active

**`testimonials`** — dipakai Umroh (jamaah) & Sales (klien)
- shop_id, name, role_or_trip, quote, photo_url, rating (1-5 nullable), sort_order

**`leads`** — inquiry/pendaftaran (CRM mini)
- shop_id, source (`umroh_register` | `sales_inquiry` | `wa_click`)
- linked_id (uuid nullable → paket/offering)
- full_name, phone, email, message
- status (`new` | `contacted` | `qualified` | `converted` | `lost`)
- notes, created_at, updated_at

**`shop_about`** — halaman "Tentang" (1-1 dengan shop)
- shop_id PK, story, vision, certifications (jsonb), team (jsonb), credentials (jsonb)

**RLS**:
- Public SELECT untuk semua tabel di atas (storefront butuh).
- Owner CRUD via `owner_id = auth.uid()` di `coffee_shops`.
- `leads`: public INSERT (siapapun bisa kirim), tapi SELECT/UPDATE hanya owner.

### 1d. Storage bucket
- Bucket `flyers` (public read), policy: owner upload ke `{shop_id}/...`.
- Bucket `umroh-brochures` (public read), policy sama.

---

## Step 2 — Sidebar adaptif (`pos-app.tsx`)

### 2a. Update `deriveCategoryType()`
Tambah mapping:
```
if (slug === 'sales-jasa-profesional') return 'sales-pro'
```

### 2b. Definisikan kelompok yg PUNYA POS
```
const HAS_POS = ['fnb', 'fashion', 'craft', 'electronics', 'general']
const NO_POS  = ['digital', 'services', 'sales-pro']
```

### 2c. Tag menu items dengan `onlyFor` lebih ketat
- `POS Kasir`, `KDS`, `Beban Dapur`, `Shift Kasir`, `Stok Terpadu`, `Inventori`, `Resep`, `Combo F&B`, `Supplier`, `Purchase Order` → `onlyFor: HAS_POS`
- `Booking Jadwal`, `Pegawai`, `Absensi` → tetap, tapi `Shift` di-hide untuk NO_POS

### 2d. Tambah grup menu baru "Sales / Umroh"
Item-item baru dengan `onlyFor: ['sales-pro']`:
- `/pos-app/umroh-packages` — Paket Umroh (icon Plane) — sub: umroh
- `/pos-app/umroh-facilities` — Fasilitas (icon Star) — sub: umroh
- `/pos-app/umroh-faq` — FAQ & Syarat Dokumen (icon HelpCircle) — sub: umroh
- `/pos-app/sales-offerings` — Katalog Layanan (icon Briefcase) — sub: sales
- `/pos-app/flyers` — Galeri Flyer (icon ImageIcon) — sub: keduanya
- `/pos-app/testimonials` — Testimoni (icon Quote) — sub: keduanya
- `/pos-app/leads` — Lead / Inquiry CRM (icon Inbox) — sub: keduanya
- `/pos-app/about-page` — Halaman Tentang (icon Info) — sub: keduanya

Filter sub-tipe: tambah field `subtypeOnly?: ('umroh'|'sales')[]` di NavItem; ditampilkan kalau `shopCategoryType==='sales-pro'` AND (subtypeOnly tidak diset OR includes shop.business_subtype).

### 2e. Hide section Marketplace untuk sales-pro?
Tetap tampil — mereka masih bisa upload ke marketplace (opsional). Tapi "Web Toko" jadi menu utama mereka.

---

## Step 3 — Halaman owner (admin) baru di `/pos-app/*`

Buat 8 route baru, semuanya CRUD sederhana mengikuti pola yg sudah ada (lihat `pos-app.flash-sale.tsx` sebagai referensi):

1. `pos-app.umroh-packages.tsx` — list + form modal (dengan date picker untuk departure/return)
2. `pos-app.umroh-facilities.tsx` — list dengan drag-sort, picker icon Lucide
3. `pos-app.umroh-faq.tsx` — accordion editor, tab General vs Documents
4. `pos-app.sales-offerings.tsx` — grid kartu + modal form
5. `pos-app.flyers.tsx` — uploader gambar + grid preview, link ke paket/offering
6. `pos-app.testimonials.tsx` — list + form (upload foto, rating optional)
7. `pos-app.leads.tsx` — Kanban board 5 kolom (status), klik kartu → detail + ubah status + catatan
8. `pos-app.about-page.tsx` — single form (story, vision, repeatable: certifications/team/credentials)

---

## Step 4 — Storefront `/s/$slug` adaptif

`s.$slug.tsx` sudah render produk F&B. Tambah branching berdasarkan `shop.business_category.slug + business_subtype`:

### 4a. Template **Umroh** (`s.$slug.umroh.tsx` atau di-render kondisional)
- Hero: nama travel + tagline + tombol WA besar
- Section Paket: card list paket (foto, tanggal, harga, sisa kuota, tombol "Daftar Sekarang" → modal form pendaftaran jamaah → POST `leads`)
- Section Fasilitas: grid icon + label
- Section Galeri Flyer: grid gambar, klik → lightbox + tombol "Tanya via WA"
- Section Testimoni Jamaah: carousel
- Section FAQ + Syarat Dokumen: dua accordion
- FAB WhatsApp di kanan-bawah (sticky)

### 4b. Template **Sales** (rendered conditional)
- Hero: headline + subheadline + CTA WA + CTA Form
- Section Katalog Layanan: grid kartu dari `sales_offerings`, masing-masing tombol "Tanya via WA" (prefilled message)
- Section Galeri Flyer: sama seperti Umroh
- Section Testimoni Klien: grid + logo (kalau ada)
- Section "Tentang Kami": dari `shop_about` (story, kredensial, tim)
- Form Lead Capture di bawah → POST `leads`
- FAB WhatsApp sticky

### 4c. Komponen baru
- `<WhatsAppFAB phone={shop.whatsapp_number} message={...} />`
- `<LeadCaptureForm source="..." linkedId="..." />` — internal pakai `supabase.from('leads').insert(...)`, abis itu trigger send-to-WA owner via `wa://send?phone=...&text=...` (open di tab baru) ATAU via UAZAPI proxy server-fn yg sudah ada (`whatsapp-proxy`).
- `<FlyerLightbox />`

---

## Step 5 — Onboarding update

`onboarding.tsx`:
- Setelah pilih kategori `Sales & Layanan Profesional`, munculkan step tambahan: pilih sub-tipe (radio Umroh / Sales).
- Simpan ke `coffee_shops.business_subtype`.
- Skip step "menu pertama" (tidak relevan), ganti dengan tips "Mulai upload paket/flyer pertamamu".

---

## Detail teknis ringkas

- Date picker: pakai `<DatetimePicker>` yg sudah dibuat sebelumnya.
- Upload file: pakai `supabase.storage.from('flyers').upload(...)` di client (RLS sudah aman).
- WA link format: `https://wa.me/{phone}?text={encodeURIComponent(message)}`. Validasi nomor WA dengan zod min(8) max(20) regex `^[0-9]+$`.
- Lead form: validasi zod (name 1-100, phone 8-20 digit, message 0-1000).
- Sub-tipe filtering di sidebar: ambil `shop.business_subtype` di `pos-app.tsx` query yg sudah ada (`select` tinggal tambah field).
- Nav item baru harus pakai semantic tokens dari `src/styles.css` — TIDAK pakai warna hardcoded.
- Route baru wajib punya `errorComponent` & `notFoundComponent` di file route, sesuai konvensi project.

## Yg TIDAK dikerjakan di rilis ini

- Payment online untuk DP umroh (skip — tetap manual via WA)
- Auto-broadcast WA ke jamaah (skip — pakai daftar lead manual dulu)
- Reminder dokumen otomatis (skip)
- Multi-language storefront (skip)

Kalau OK, klik "Implement plan" untuk eksekusi.