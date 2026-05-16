## Tujuan

1. **Booking F&B**: sembunyikan tab "Layanan", paksa mode meja saja → tombol di storefront jadi langsung "Reservasi Meja".
2. **Chat aktif end-to-end**: pastikan owner/staff bisa balas dari dashboard, perjelas masuknya.
3. **Hapus semua tampilan "Not Found"** → auto-redirect ke beranda marketplace tanpa countdown.

---

## 1. Booking F&B mode — sembunyikan tab Layanan

File: `artifacts/kopihub/src/routes/toko.$slug.booking.tsx`

- Tambah deteksi `is_fnb` dari toko (cek field `business_type`/`vertical` di `coffee_shops`; kalau tidak ada, anggap default = F&B karena ini KopiHub).
- Kalau F&B: paksa `bookingType = "table"`, **hapus** render `<Tabs>` di atas wizard, label statis "Reservasi Meja".
- Kalau non-F&B (salon/studio): tab tetap muncul seperti sekarang.

File: `artifacts/kopihub/src/routes/toko.$slug.tsx`

- Tombol action bar yang sekarang "Booking & Reservasi" → rename jadi **"Reservasi Meja"** (icon `UtensilsCrossed`) saat F&B; tetap "Booking & Reservasi" untuk vertical lain.
- Default link: `/toko/$slug/booking?type=table`.

---

## 2. Chat — pastikan owner/staff bisa balas

Investigasi: `pos-app.inbox.tsx` SUDAH ada (thread list + kirim balasan + realtime). Yang kurang: signal & discoverability.

Perubahan:

- **`artifacts/kopihub/src/routes/pos-app.tsx`** (sidebar): tambah badge angka unread di samping label "Inbox Chat" — pakai query `shop_chat_messages WHERE sender_role='buyer' AND read_at IS NULL AND shop_id = current`. Realtime refresh on new INSERT.
- **`artifacts/kopihub/src/routes/pos-app.index.tsx`**: tambah kartu "Chat Pelanggan" di dashboard utama dengan jumlah unread + CTA "Buka Inbox".
- **Verifikasi `pos-app.inbox.tsx`**:
  - Saat owner kirim balasan, juga panggil `shop_chats.update({ last_message_at, last_sender_role: 'seller' })` agar buyer dapat notif.
  - Tambah broadcast typing event (seller side) supaya indicator "sedang mengetik…" di `toko.$slug.chat.tsx` jalan.
  - Auto-mark `read_at = now()` untuk pesan buyer saat thread dibuka (sudah ada — verifikasi sekali lagi).
- Tidak ada perubahan schema DB — semua kolom sudah ada.

---

## 3. Hilangkan semua "Not Found" → instant redirect ke marketplace

Strategi: ganti semua tampilan 404 jadi `<Navigate to="/" replace />` + toast info, baik untuk URL yang benar-benar tidak ada (router-level) maupun untuk halaman yang gagal load data (component-level).

### 3a. Router-level (URL tidak match)

- **`artifacts/kopihub/src/main.tsx`** → `DefaultNotFoundComponent` diganti komponen yang langsung `useEffect(() => router.navigate({ to: "/", replace: true }))` + tampilkan spinner kecil "Mengalihkan ke beranda…". Hilangkan teks "404".
- **`artifacts/kopihub/src/routes/__root.tsx`** → `NotFoundComponent` diganti dengan logika yang sama: redirect instan tanpa countdown 6 detik. (Optional: pertahankan delay 800ms cuma untuk show toast "Halaman tidak ditemukan, kembali ke beranda".)

### 3b. Component-level (data tidak ditemukan)

Cari setiap halaman yang punya state `notFound` lalu render layar "Tidak ditemukan" dan ganti jadi `Navigate to="/"` + toast:

Target file utama yang relevan dengan storefront publik:
- `artifacts/kopihub/src/routes/toko.$slug.tsx` (toko tidak ada)
- `artifacts/kopihub/src/routes/toko.$slug.produk.$productId.tsx` (produk tidak ada) — ganti blok `if (notFound) { return <div>Produk tidak ditemukan...</div> }` jadi `useEffect → navigate({ to: "/", replace: true })` + `toast.info("Produk sudah tidak tersedia")`.
- `artifacts/kopihub/src/routes/toko.$slug.chat.tsx` (toko tidak ada) — sama.

Halaman milik user yang login (akun, pos-app) **tidak** diganti — biarkan tampilkan pesan kontekstual; ini cuma untuk storefront publik agar customer tidak ketemu jalan buntu.

### 3c. Sanity-check data
URL yang user buka (`/toko/tes-1yf0/produk/5a63...`) memang tidak ada di DB. Setelah perubahan ini, URL itu langsung lempar ke `/` (beranda marketplace) — tidak pernah lagi muncul "Not Found".

---

## Catatan teknis

- Schema `coffee_shops` perlu dicek: kalau belum punya kolom penanda F&B/vertical, fallback ke flag konstan `isFnB = true` di tingkat aplikasi (KopiHub = coffee shop secara default). Tidak perlu migrasi.
- Tidak ada migrasi DB di plan ini.
- Tidak ada perubahan auth/RLS.

## Tidak termasuk

- Tidak menyentuh logic POS / KDS / inventory.
- Tidak menambah notifikasi push baru (in-app badge saja).
- Tidak mengubah halaman 404 di area admin/owner login (mereka butuh info eksplisit).