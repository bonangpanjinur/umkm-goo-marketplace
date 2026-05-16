## Ringkasan temuan

Saya menyusuri route `toko.$slug.*`, `akun.*`, dan `pesanan.*`. Fondasinya sudah ada: chat toko, booking layanan, reservasi meja (redirect ke `/booking?type=table`), custom order, membership, ulasan, map, chat per-pesanan. Yang kurang adalah **discoverability, kelengkapan UX, dan hub di sisi customer**.

### Kekurangan utama

**1. Action bar di halaman toko (`toko.$slug.tsx`) tidak lengkap**
Hanya ada 3 tombol: Booking Layanan, Reservasi Meja, Chat. Belum ada:
- Custom Order (rute `/toko/$slug/custom-order` ada, tapi cuma bisa diakses dari halaman produk)
- Membership (`/toko/$slug/membership` orphan)
- Lihat Lokasi/Map (`/toko/$slug/map` orphan — alamat di header bukan link)
- Tombol/anchor ke section Ulasan (`/toko/$slug/ulasan` orphan)
- Telepon (`tel:`) — nomor cuma teks

**2. Chat toko (`toko.$slug.chat.tsx`) masih versi minimum**
- Tidak ada **inbox terpusat** di `/akun` — customer tidak bisa lihat daftar semua chat toko mereka
- Tidak ada **badge unread** di header marketplace
- Tidak ada **typing indicator**, **status online toko**, **last seen**
- Tidak ada **attachment** (gambar/foto produk) — penting untuk tanya soal kerusakan, custom request
- Tidak ada **kartu referensi produk/pesanan** yang bisa di-attach ke pesan (tanya soal SKU tertentu / komplain pesanan tertentu)
- Tidak ada **quick replies** dari toko ("Stok ready", "Cek dulu ya", "Harga grosir")
- Tidak ada **block/report**, tidak ada **arsip**
- Pengiriman pakai client-side `update last_message_at` — race-prone, harusnya trigger DB

**3. Reservasi meja & Booking**
- Logic dileburkan ke `booking?type=table` — OK, tapi UX entry-point bingung; tidak ada landing terpisah yang menjelaskan beda "reservasi makan" vs "booking layanan" untuk toko coffee shop multi-mode
- Tidak ada tombol **"Booking saya"** dari halaman toko (link ke `/akun/bookings` filter shop tertentu)
- Tidak ada **reminder H-1 / H-jam** (push/email) ke customer
- Tidak ada **rating otomatis** muncul setelah booking selesai
- Tidak ada **walk-in/waitlist on the spot** untuk antrian meja saat full (waitlist step ada di booking layanan, belum di meja)
- Tidak ada **estimasi antrian** atau **nomor antrian publik** yang customer bisa pantau

**4. Custom order & Membership**
- Custom order: tidak ada **upload file** (cuma URL gambar referensi) — bottleneck nyata
- Custom order: status diakses via `localStorage` contact — fragile, customer ganti device hilang
- Membership: rute ada, tapi tidak pernah ditautkan dari shop page; tidak ada **kartu member** di `/akun`

**5. Notifikasi & hub customer**
- `/akun/notifikasi` ada, tapi event chat masuk / booking confirmed / custom order direspon belum dipastikan menulis ke sana
- Tidak ada **realtime toast** ketika dapat balasan chat sambil browsing toko lain
- Tidak ada email/WA reminder

**6. Akun pelanggan**
- Tidak ada `/akun/inbox` (chat toko)
- Tidak ada `/akun/custom-orders` (daftar permintaan custom)
- `/akun/bookings` ada — perlu link masuk dari halaman toko

---

## Rencana perbaikan (3 fase)

### Fase 1 — Discoverability & hub (frontend, tanpa migrasi DB)
1. **Lengkapi action bar `toko.$slug.tsx`**: tambah tombol Custom Order, Membership, Peta Lokasi, Telepon (tel:), dan anchor ke section ulasan. Tata responsive: 3 tombol primer + menu "Lainnya" di mobile.
2. **Tautkan alamat toko** ke `/toko/$slug/map`, nomor telepon ke `tel:`.
3. **Tombol "Pesanan & Booking saya di sini"** yang membuka `/akun/bookings?shop=<slug>` dan `/akun/pesanan?shop=<slug>`.
4. **Halaman `/akun/inbox`** (baru) — daftar semua `shop_chats` milik user, urut `last_message_at`, dengan badge unread per-chat.
5. **Badge unread global** di `MarketplaceHeader` (ikon chat) — query count `shop_chat_messages` yang `sender_role='seller' AND read_at IS NULL`, plus realtime channel.
6. **Halaman `/akun/custom-orders`** (baru) — daftar `custom_order_requests` milik user (match by `customer_contact` + user_id jika login).

### Fase 2 — Chat upgrade
1. **Lampiran gambar** di chat (Supabase Storage bucket `chat-attachments` private, signed URL).
2. **Kartu referensi produk** — saat user klik "Tanya soal produk ini" di halaman produk, kirim pesan sistem dengan kartu produk (nama, harga, link).
3. **Quick replies** untuk seller (config di pos-app, render sebagai chip di chat customer side juga: "Lihat respon cepat").
4. **Typing indicator + presence** via Supabase Realtime presence channel.
5. **DB trigger** `set_last_message_at` di `shop_chat_messages` (hapus update client-side, hilangkan race).

### Fase 3 — Reservasi/booking pengalaman
1. **Reminder otomatis** (cron + email/WA) H-1 dan H-1 jam untuk booking & reservasi meja.
2. **Status antrian publik** `/toko/$slug/antrian` — customer pantau nomor antrian meja realtime.
3. **Walk-in waitlist meja** — jika slot meja penuh, customer bisa "daftar tunggu" + notifikasi saat meja siap.
4. **Prompt ulasan otomatis** 2 jam setelah booking `completed` (toast di akun + email).
5. **Custom order**: upload file ke storage, simpan `user_id` saat customer login (bukan hanya kontak).

---

## Pertanyaan keputusan sebelum eksekusi

1. **Mulai dari Fase 1 saja**, atau langsung gabung Fase 1+2 (chat upgrade)?
2. Untuk **inbox di `/akun/inbox`**, gabung dengan chat pesanan (`pesanan/$orderId/chat`) jadi satu inbox, atau pisah?
3. Untuk **reminder H-1** (Fase 3), pakai email saja (sudah ada infra) atau perlu WA juga (butuh provider)?

Jika kamu OK dengan arah ini, jawab pertanyaan di atas — saya implementasi Fase 1 dulu (paling cepat dampaknya, tanpa migrasi besar).
