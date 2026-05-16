
# Analisis Kekurangan Fitur Pencarian (`/search`) — Fokus Section Toko

Berikut audit dari halaman `search.tsx` setelah iterasi terakhir (cache, refresh, dialog konfirmasi, loading indicator). Saya pisahkan menjadi: **kekurangan section Toko**, **kekurangan section Produk**, dan **kekurangan umum**.

---

## 1. Section Toko — Kekurangan Utama

### A. Informasi kartu toko terlalu minim
Kartu toko hanya menampilkan: logo, nama, kyc badge, rating, dan tagline. Padahal field berikut sudah di-fetch tapi tidak ditampilkan:
- `rating_count` — tidak ditampilkan (user tidak tahu apakah rating 5.0 dari 1 atau 1000 ulasan)
- `address` (kota) — tidak ditampilkan padahal user bisa memfilter berdasarkan kota
- `payment_methods_enabled` — tidak ditampilkan sebagai badge

Akibat: user sulit membandingkan toko, sulit tahu jarak/lokasi, dan filter "kota/metode bayar" terasa tidak transparan.

### B. Tidak ada jumlah produk per toko
Tidak ada indikator "120 produk" atau "5 produk baru". Toko kosong dan toko aktif tampak identik.

### C. Tidak ada sort khusus untuk Toko
Sort dropdown (`termurah`, `termahal`, `rating`, `relevan`) dibuat untuk Produk. Untuk Toko, sort `termurah`/`termahal` tidak relevan — saat ini diam-diam jatuh ke sort rating. Tidak ada opsi:
- Toko terdekat (geo)
- Toko terbaru / terlama bergabung
- Paling banyak produk
- Paling banyak transaksi

### D. Filter tidak punya opsi khusus toko
- Tidak ada filter "hanya toko terverifikasi (KYC approved)"
- Tidak ada filter "buka sekarang" (jam operasional)
- Tidak ada filter level/tier merchant (`merchant_tiers` ada di admin)
- Tidak ada filter "punya promo aktif"

### E. UX interaksi toko
- Klik kartu langsung lompat ke `/toko/$slug`, tidak ada preview/quick-view
- Tidak ada tombol "Ikuti toko" / favorit langsung dari hasil pencarian
- Tidak ada CTA "Lihat produk" sebagai shortcut langsung ke katalog

### F. Section header kurang informatif
`Toko · menampilkan X dari Y` — tidak ada konteks waktu cache, tidak ada indikator "diambil dari cache · 3 menit lalu" walaupun TTL cache 10 menit sudah diimplementasi.

### G. Skeleton terlalu sederhana
`ShopSkeletonCards` hanya kotak abu-abu 80px tanpa shape avatar/teks — kontras dengan `ProductSkeletonCards` yang sudah punya placeholder gambar+teks.

### H. Empty state tidak menawarkan "buat toko"
Saat pencarian toko nol hasil, tidak ada CTA mengarahkan ke pendaftaran merchant — peluang akuisisi yang terlewat.

---

## 2. Section Produk — Kekurangan Pendukung

- Tidak ada badge "Flash Sale aktif" walaupun field `flash_price`, `flash_starts_at`, `flash_ends_at` di-fetch
- Tidak ada nama toko di kartu produk (user harus klik dulu untuk tahu produk dari toko mana)
- Tidak ada filter "stok tersedia" / "siap kirim"
- Filter harga min/max tanpa visual range slider

---

## 3. Kekurangan Umum (lintas section)

### A. Pencarian & Input
- Tidak ada input search di halaman ini sendiri (hanya bergantung pada header) — user harus scroll ke atas untuk mengubah keyword
- Tidak ada autocomplete / saran pencarian
- Tidak ada "pencarian terakhir" / riwayat (padahal localStorage sudah dipakai untuk cache & filter)
- Tidak ada koreksi typo / "did you mean"

### B. URL & Sharing
- Tidak ada tombol "Bagikan hasil pencarian" (copy URL)
- Tab aktif tersimpan di URL ✓ tapi scroll position tidak dipulihkan saat back

### C. Pagination
- Pakai pola "Muat lebih banyak" — tidak ada infinite scroll opsional, tidak ada "loncat ke halaman X"
- Tidak ada indikator total halaman / progress (mis. "48 dari 240 produk")

### D. Cache & Refresh (sudah ada, tapi belum lengkap)
- Tombol Refresh & Hapus cache sudah ada ✓
- Tidak ada indikator visual "data dari cache" vs "data segar"
- Tidak ada auto-revalidate saat tab di-fokus ulang (`visibilitychange`)
- Cache key tidak include `tab` — switching tab tidak memengaruhi, tapi rasa konsistensinya bisa membingungkan saat debugging

### E. SEO & Aksesibilitas
- `head()` static — title tidak refleksi keyword `q` (mis. "Hasil 'kopi susu' — UMKMgo")
- Tidak ada structured data (ItemList / Product / LocalBusiness)
- Tombol-tombol ikon (Refresh, Hapus cache) tidak punya `aria-label` saat label disembunyikan di mobile

### F. Mobile / Responsive
- Filter panel jadi 1 kolom di mobile — tombol "Terapkan" jauh di bawah, tidak sticky
- Tab pills bisa overflow tanpa indikator scroll
- 3 tombol di header (Filter / Refresh / Hapus cache) berdesakan di viewport sempit

### G. State edge case
- Saat user blur jaringan offline, error generik "Failed to fetch" — tidak ada deteksi `navigator.onLine`
- Saat semua hasil di-filter habis oleh `shop.is_active === false`, `productTotal` masih hitung mentah dari Supabase (count tidak match panjang list)

---

## Rekomendasi Prioritas

Kalau ingin saya implementasikan, urutan yang saya sarankan (impact-vs-effort):

1. **Lengkapi kartu Toko**: tambah `rating_count`, kota, badge payment methods, jumlah produk per toko (perlu 1 query agregasi tambahan atau view).
2. **Filter khusus Toko**: checkbox "Hanya terverifikasi", "Buka sekarang".
3. **Sort khusus Toko** saat tab=`toko` (terbaru, paling banyak produk).
4. **Badge Flash Sale** & nama toko di kartu Produk.
5. **Dynamic SEO title** + structured data.
6. **Indikator "dari cache"** & auto-revalidate on visibility.
7. **Empty state Toko → CTA daftar merchant**.
8. **Akses sortir, refresh, hapus cache** dipindah ke menu kebab di mobile.

---

## Pertanyaan untuk Anda

Sebelum saya buat plan implementasi:
1. Fokus dulu ke **section Toko saja**, atau sekaligus rapikan Produk juga?
2. Untuk "jumlah produk per toko", boleh tambah kolom denormalized `product_count` di tabel `coffee_shops` (lebih cepat), atau pakai query agregasi realtime?
3. Untuk "Buka sekarang" — apakah tabel jam operasional toko (`shop_hours`) sudah ada datanya, atau perlu diisi dulu di sisi Owner?
