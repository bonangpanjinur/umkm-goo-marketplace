# Lokasi Toko + Penelusuran "Di Sekitar Saya"

## Tujuan
1. Owner bisa **menandai lokasi** toko / outlet (pin di peta + link Google Maps + alamat).
2. Pembeli bisa **mencari toko berdasarkan lokasi** (kota / area) dan melihat **toko terdekat** ketika GPS aktif, lengkap dengan jarak (km) & tombol "Petunjuk Arah".

## Kondisi Saat Ini
- Tabel `shops` sudah punya kolom `latitude`, `longitude`, `address`, `city` — **tapi belum ada UI** untuk owner mengisi koordinat.
- Halaman `/toko/$slug/map` sudah ada (pakai embed OpenStreetMap + tombol Google Maps/Direction). Sudah jalan kalau lat/lng terisi.
- Belum ada halaman discovery "terdekat" untuk pembeli, dan belum ada filter lokasi di marketplace.
- Belum ada koneksi Google Maps Platform.

## Rencana Pengerjaan (3 Fase)

### Fase 1 — Owner: input lokasi toko & outlet
**A. Picker peta di Pengaturan Toko (`/pos-app/settings`)**
- Tambah section "Lokasi Toko" di tab Brand/Profil, di bawah field `address`.
- Komponen `ShopLocationPicker` baru: peta interaktif (Leaflet + OpenStreetMap, no API key) — drag pin / klik untuk set, tombol "Pakai lokasi saya" (Geolocation API), input manual lat/lng, tombol "Cari dari alamat" (geocoding via Nominatim publik gratis).
- Simpan `latitude`, `longitude` ke `shops`. Tambah juga kolom `google_maps_url` (opsional, override link share).
- Preview link "Buka di Google Maps".

**B. Picker yang sama di Outlet (`/pos-app/outlets`)**
- Outlet sudah punya `address`; tambah kolom `latitude`/`longitude` di tabel `outlets` (migrasi) + picker yang sama saat add/edit outlet.

**C. Onboarding nudge**
- Banner di dashboard owner kalau `latitude IS NULL` → "Tandai lokasi toko agar muncul di pencarian terdekat".

### Fase 2 — Pembeli: cari berdasarkan lokasi
**A. Tombol "📍 Toko di sekitar saya" di marketplace home (`/`)**
- Minta izin GPS sekali. Cache lokasi di `sessionStorage` (15 menit).
- Fetch shops + hitung jarak (haversine, dilakukan di RPC Postgres `shops_nearby(lat, lng, radius_km, limit)` agar paginated & ringan).
- Sort by distance, tampilkan badge "1.2 km" di kartu toko.

**B. Halaman dedicated `/sekitar` (atau `/cari/sekitar`)**
- Daftar toko + slider radius (1/3/5/10/25 km), filter kategori bisnis.
- Map view (toggle list ↔ peta) dengan Leaflet markers — klik marker = popup nama + tombol "Lihat toko".
- Empty state ramah kalau belum kasih izin / tidak ada toko di radius.

**C. Filter lokasi di marketplace yang sudah ada**
- Tambah opsi "Urut: Terdekat" di list view (`kategori.$slug` & index) ketika user sudah punya koordinat.

### Fase 3 — Polish & integrasi
- Update `/toko/$slug` halaman publik: tambah card "Lokasi" dengan mini-map + jarak (kalau user share lokasi) + tombol "Petunjuk Arah" (sudah ada di `/toko/$slug/map`, tinggal expose).
- Tambah JSON-LD `LocalBusiness` (geo coordinates) di SEO toko untuk SEO lokal.
- Sitemap kota (`CITIES` di `src/lib/cities.ts`) tetap dipakai untuk landing SEO.

## Detail Teknis
- **Map library**: Leaflet + OpenStreetMap tiles (gratis, tidak butuh API key). Sudah dipakai sebagai iframe; upgrade ke `react-leaflet` untuk interaktif.
- **Geocoding alamat→koordinat**: Nominatim (`https://nominatim.openstreetmap.org/search`) — fair-use, kasih header `User-Agent`, debounce 1s.
- **Jarak**: RPC `public.shops_nearby(_lat, _lng, _radius_km, _limit)` pakai formula haversine, return `{ id, name, slug, logo_url, distance_km, ... }`. Order by distance.
- **Migrasi DB**:
  - `ALTER TABLE shops ADD COLUMN google_maps_url text;`
  - `ALTER TABLE outlets ADD COLUMN latitude numeric, ADD COLUMN longitude numeric;`
  - Index: `CREATE INDEX shops_geo_idx ON shops (latitude, longitude) WHERE latitude IS NOT NULL;`
  - Buat function `shops_nearby(...)` (SECURITY INVOKER, RLS-friendly hanya baca toko aktif/published).
- **Privasi**: lokasi user tidak disimpan di DB, hanya di memori/sessionStorage browser.
- **Tidak butuh Google Maps Platform connector** di tahap awal (hemat & no-key). Tombol "Buka di Google Maps" hanya deeplink publik `https://maps.google.com/?q=lat,lng` — boleh tanpa API. Bisa di-upgrade ke Google Maps nanti kalau perlu autocomplete alamat yang lebih akurat.

## Hasil Akhir
- Owner: pin lokasi sekali → muncul di profil toko & hasil pencarian terdekat.
- Pembeli: 1 tap "Toko di sekitar saya" → list toko terdekat dengan jarak & petunjuk arah.
- Tetap gratis (tanpa API key) di rilis pertama; siap upgrade ke Google Maps Platform kalau dibutuhkan.

Saya mulai dari **Fase 1** dulu (migrasi + picker lokasi di settings & outlets), lalu lanjut Fase 2 setelah owner bisa isi koordinat — setuju?
