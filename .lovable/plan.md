# Rencana Perbaikan: Visual Card, Not-Found, dan Konsolidasi Booking/Reservasi

## 1. Upgrade visual Card Produk (estetika premium)

Saat ini `ProductCard` (di `src/routes/index.tsx`, dipakai juga di `toko.$slug`) masih sangat standar: border tipis + sedikit hover shadow. Akan dirombak menjadi card berkelas "marketplace modern":

- Rounded `2xl`, border halus `border-border/60`, ring transparan yang muncul saat hover (`hover:ring-2 hover:ring-primary/30`).
- Shadow berlapis: idle `shadow-sm`, hover `shadow-xl shadow-primary/10` + lift `-translate-y-0.5`.
- Image area: overlay gradient bawah (`from-black/40 to-transparent`), zoom halus `group-hover:scale-110` (700ms ease-out), skeleton shimmer saat loading.
- Badge baru: **Stok menipis**, **Terjual N**, **Gratis Ongkir** (jika ada), badge **Flash Sale** dengan animasi pulse + countdown chip kaca (backdrop-blur).
- Tipografi: nama produk `text-sm font-semibold tracking-tight`, harga lebih kontras (`text-base font-bold`), harga coret muncul di baris terpisah dengan persen diskon kecil pill.
- Footer card: avatar toko + nama + verified check (jika `is_verified`), rating + jumlah ulasan, semua dalam baris ringkas.
- Tombol "Quick Add" floating muncul di kanan-bawah image saat hover (desktop), tap target full di mobile.

Semua warna ambil dari token semantik di `src/styles.css` (tidak ada hex langsung). Akan ditambah token `--shadow-card-hover` dan `--gradient-card-overlay` agar konsisten lintas tema.

## 2. Memperbaiki Not Found di salah satu route

Saya butuh konfirmasi singkat: route mana yang selalu "not found"? (URL persisnya). Sementara itu rencana investigasi:

- Audit semua `loader` di `src/routes/` yang melempar `notFound()` pada query gagal — beberapa kemungkinan penyebab: shop slug case-sensitive, kolom `is_active` di-filter ketat, atau join `business_category` kembalikan null sehingga seluruh row dianggap tidak ada.
- Cek route yang punya parameter dinamis (mis. `toko.$slug.produk.$productId`, `katalog.$slug`, `kategori.$slug`, `d.$token`, `download.$token`) — pastikan pola `maybeSingle()` + guard yang benar.
- Tambah logging sekali jalan (console.warn) di loader yang dicurigai agar terlihat alasan not-found (slug tidak ditemukan vs RLS block vs is_active=false).
- Setelah penyebab ketahuan: perbaiki query (mis. `ilike` untuk slug, longgarkan filter, atau redirect ke halaman alternatif), bukan sekadar mengganti `notFound()` jadi halaman kosong.

> Mohon sebutkan route persisnya supaya langsung ke akar masalah.

## 3. Konsolidasi Booking Layanan vs Reservasi Meja

Saat ini ada duplikasi modul:

```text
Customer side:
  toko.$slug.booking.tsx     (2344 baris) — booking layanan/jasa
  toko.$slug.reservasi.tsx   ( 786 baris) — reservasi meja

Merchant side:
  pos-app.booking.tsx        (2202 baris)
  pos-app.reservasi.tsx      ( 438 baris)
  pos-app.tables.tsx, table-maps, table-qr, booking-analytics, booking-reminders, booking-reviews
```

Banyak logika tumpang tindih (slot waktu, kalender, konfirmasi, reminder, cancel/reschedule token). Rencana refactor:

### Konsep terpadu: "Booking" sebagai modul tunggal dengan dua **tipe**
- `service` → booking layanan (durasi, staff, paket)
- `table` → reservasi meja (kapasitas, table_id, area)

### Langkah teknis (tanpa menghapus data lama)

1. **Schema**: tambah kolom `booking_type` ENUM('service','table') pada tabel `bookings` (default 'service'); migrasi `reservations` → `bookings` dengan `booking_type='table'` (script idempoten, simpan tabel lama sebagai view back-compat `reservations_legacy`).
2. **Hook bersama** `useBookings({ type })` di `src/lib/` untuk fetch/mutate kedua tipe.
3. **Komponen UI bersama**:
   - `<BookingCalendar />`, `<BookingSlotPicker />`, `<BookingStatusBadge />`, `<BookingDetailDrawer />`, `<BookingListTable />` — semua menerima prop `type`.
4. **Route customer**: ganti dua route lama menjadi satu `toko.$slug.booking.tsx` dengan tab "Layanan" / "Meja" (atau auto-pilih dari `business_subtype`). Route `toko.$slug.reservasi.tsx` dijadikan **redirect** ke `?type=table` agar link lama tetap hidup.
5. **Route merchant**: gabungkan `pos-app.booking.tsx` + `pos-app.reservasi.tsx` menjadi satu dashboard dengan filter tipe. Sub-modul `pos-app.booking-analytics`, `booking-reminders`, `booking-reviews` otomatis cover keduanya karena sumber data sama.
6. **Akun pelanggan**: `akun.bookings.tsx` menampilkan kedua tipe dengan ikon berbeda.
7. **Token URL** `booking.cancel.$token`, `booking.reschedule.$token` sudah generic — dipertahankan, hanya perlu cek `type` saat render.

### Hasil akhir
- 4 file route besar (~5,7k baris) → ~2 file gabungan + komponen reusable, target turun 35-45% LOC.
- Satu pintu konfigurasi di `admin.booking-config.tsx` untuk kedua tipe.
- UX customer lebih jelas (tidak bingung "booking" vs "reservasi").

## Urutan eksekusi yang diusulkan
1. Konfirmasi route not-found dari Anda.
2. Upgrade `ProductCard` + token di `styles.css` (cepat, langsung terlihat).
3. Perbaiki loader not-found berdasarkan jawaban.
4. Refactor booking/reservasi (paling besar — akan dipecah jadi 3 commit: schema → komponen bersama → migrasi route).

## Catatan teknis
- Semua perubahan dibatasi pada `artifacts/kopihub/`.
- Migrasi DB akan dipanggil via tool migration (butuh approval).
- Tidak ada perubahan ke `src/integrations/supabase/*` yang auto-generated.
