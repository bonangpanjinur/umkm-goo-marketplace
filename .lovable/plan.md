## Tujuan

Rombak `toko/$slug/produk/$productId` agar terasa seperti marketplace besar: tombol Keranjang, Beli Sekarang, dan Chat Toko selalu terjangkau, info toko menonjol di sisi kanan, dan tata letak rapi di mobile maupun desktop.

## Yang akan ditambah / dirombak

**1. Kartu Info Toko (kolom kanan, di bawah harga)**
- Logo + nama toko + lokasi (kota/area) + rating toko + jumlah produk
- Tombol kembar: **Chat Toko** (warna outline) dan **Kunjungi Toko** (filled)
- Badge tipis: "Aktif baru saja", "Tepat waktu", dsb. (kalau datanya ada di tabel `shops`)
- Mengganti link kecil di atas judul yang sekarang terasa tipis

**2. Sticky Action Bar (bottom)**
- Mobile: bar penuh lebar di bawah berisi ikon Chat + Wishlist + tombol **+ Keranjang** + **Beli Sekarang**
- Desktop (≥ md): bar tetap menempel di bawah konten produk dengan ringkasan harga + tombol-tombol yang sama; tidak menutupi konten footer
- Memakai `position: fixed` di mobile dan `sticky` di desktop, padding bawah body disesuaikan agar konten tidak ketutup
- Tombol **Chat Toko** mengambang yang sekarang dihapus karena sudah ada di sticky bar (menghindari duplikasi)

**3. AddToCartBlock dirapikan**
- Selector qty + harga total di-stack lebih jelas
- Tombol Wishlist / Compare / Price Alert / Share dipindah jadi ikon kecil di header info produk (bukan deretan tombol besar) — lebih mirip marketplace
- Tombol primer (Keranjang / Beli Sekarang) hanya di sticky bar di mobile; di desktop tetap muncul di blok detail + di sticky bar

**4. Mini perapian visual**
- Galeri gambar utama dengan thumbnail kecil di bawah (kalau hanya 1 image, tetap satu — tidak break)
- Breadcrumb sedikit lebih kompak
- Section "Tanya & Jawab" dan "Ulasan" diberi heading + divider lebih kuat

## File yang disentuh

- `artifacts/kopihub/src/routes/toko.$slug.produk.$productId.tsx`
  - Tambah komponen `ShopInfoCard` (inline)
  - Tambah komponen `StickyActionBar` (inline)
  - Refactor `AddToCartBlock` untuk membaca callback "Beli Sekarang" dan "Tambah" agar bisa dipanggil dari sticky bar
  - Hapus FAB "Chat Toko" lama (digantikan tombol di sticky bar)
  - Tambah `pb-24 md:pb-28` di kontainer agar sticky bar tidak menutup konten

## Yang TIDAK diubah

- Logika data (query Supabase) — semua field sudah tersedia
- Schema database & RLS — tidak ada migrasi
- Halaman `/keranjang`, `/toko/$slug/chat`, dan rute lain — hanya halaman produk yang dirombak
- Komponen lain (Reviews, QA, FrequentlyBoughtTogether, dsb.) tetap di posisi yang sama

## Verifikasi setelah implement

- Buka `/toko/toko-berkah/produk/<id>` di viewport mobile (375px) → sticky bar bawah muncul, tombol Chat & Keranjang bisa ditekan
- Viewport desktop (≥ md) → kartu toko muncul di kanan, sticky bar tetap dapat dilihat saat scroll
- Klik **Chat Toko** → navigasi ke `/toko/$slug/chat`
- Klik **+ Keranjang** → toast sukses, badge bottom-nav update
- Klik **Beli Sekarang** → masuk ke `/keranjang`
