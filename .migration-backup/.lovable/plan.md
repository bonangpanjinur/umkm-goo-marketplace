# Update PRD Marketplace — Fokus Fitur & UI/UX

Menambahkan **2 bab baru** di akhir `PRD_MARKETPLACE.md` (bab 1–19 lama tidak diubah). Backend tetap di-list di bab existing; bab baru fokus ke pengalaman pakai dan integrasi antar role.

---

## Bab 20 — Feature Gap Matrix (Lintas Role & Terintegrasi)

Setiap fitur ditandai status: ✅ ada · 🟡 sebagian (UI ada, alur belum nyambung) · 🔴 belum. Setiap baris menjelaskan **siapa pakai, hand-off antar role, dan kenapa perlu**.

### 20.1 Pesanan & Operasional

| Fitur | Status | Pembeli | Staff/Kasir | Pemilik Toko | Super Admin |
|---|---|---|---|---|---|
| Unified Orders Hub (POS · Web · Marketplace dalam 1 inbox + filter chip) | 🟡 | — | terima & proses | overview semua channel | monitor lintas toko |
| Live order tracking + ETA + map sederhana | 🔴 | lihat status realtime | update status di POS/KDS | SLA dashboard | dispute escalation hook |
| In-app chat per order (text + foto) | 🔴 | tanya kurir/toko | balas dari panel | moderasi | baca-only saat dispute |
| Dispute & refund center | 🟡 | ajukan | tandai bukti | proses refund | putusan akhir + escrow hold |
| Notifikasi terpadu (push web + email + in-app bell) | 🟡 | order, promo, chat | order baru, low stock | payout, dispute | sistem health, KYC baru |
| Auto-cancel & reminder bayar | 🔴 | countdown | — | aturan per toko | aturan global default |

### 20.2 Discovery & Engagement Pembeli

| Fitur | Status | Catatan |
|---|---|---|
| Marketplace home (kategori, flash sale, rekomendasi) | 🟡 | hub publik belum penuh |
| Search lintas toko + filter (kategori, harga, lokasi, rating) | 🔴 | wajib untuk model marketplace |
| Wishlist / simpan produk | 🔴 | sinkron lintas device |
| Follow toko + feed update | 🔴 | trigger notifikasi promo baru |
| Voucher platform vs voucher toko (stacking rules) | 🟡 | UI ada, aturan belum jelas |
| Review & rating dengan foto + balasan toko | 🟡 | komponen ada, belum ke-port |
| Riwayat lihat & "lanjutkan belanja" | 🔴 | retensi |

### 20.3 Toko & Katalog (Owner + Staff)

| Fitur | Status | Catatan |
|---|---|---|
| Produk varian (size, warna, kombinasi harga/stok) | 🔴 | utk non-F&B |
| Produk digital (file/lisensi auto-deliver) | 🔴 | sudah disebut di PRD §9.4 |
| Bundling & add-on | 🟡 | resep ada, bundle marketplace belum |
| Bulk import/export produk (CSV) | 🔴 | onboarding cepat |
| Manajemen stok lintas channel (POS = Web = Marketplace) | 🟡 | risiko oversell |
| Kalender promo + scheduler flash sale | 🔴 | preview kalender |
| Storefront live preview (tema + branding) sebelum publish | 🟡 | tema ada, preview belum |
| Onboarding wizard 5 langkah (KYC, brand, produk pertama, payout, publish) | 🔴 | menurunkan TTV |

### 20.4 Pengiriman, Pembayaran, Keuangan

| Fitur | Status | Catatan |
|---|---|---|
| Multi kurir + tarif realtime + label print | 🟡 | API belum integrasi |
| Pickup point / self-pickup di toko | 🔴 | F&B & retail |
| COD dengan limit & risk score | 🟡 | rule engine belum |
| Saldo toko + escrow visual (pending → available → withdrawn) | 🟡 | timeline UI belum |
| Withdraw mandiri + 2FA + jadwal otomatis | 🟡 | 2FA belum |
| Invoice & e-faktur unduh PDF | 🔴 | pajak |
| Payment retry & alternatif metode otomatis | 🔴 | turunkan failed payment |

### 20.5 Tim, Akses, Audit

| Fitur | Status | Catatan |
|---|---|---|
| Role granular per modul (lihat memory `staff-permissions`) | ✅ | perluas ke marketplace modul |
| Aktivitas staff per shift (timeline) | 🟡 | shifts ada, timeline belum |
| Audit log dengan filter & export | 🟡 | UI minim |
| Impersonation aman utk Super Admin (dgn banner + audit) | 🔴 | support tooling |
| Multi-toko per owner (switcher) | 🟡 | cek di dashboard |

### 20.6 Super Admin Platform

| Fitur | Status | Catatan |
|---|---|---|
| Dashboard kesehatan platform (GMV, take rate, churn, SLA) | 🟡 | analytics ada, KPI belum |
| KYC review queue (KTP, NPWP) dgn keputusan & alasan | 🔴 | wajib §7 |
| Config wizard (nama platform, logo, gateway secret, kategori) | 🟡 | tersebar, belum 1 wizard |
| Broadcast tersegmen (paket, kategori, kota) + jadwal | 🟡 | segmentasi belum |
| Feature flag & A/B per toko/paket | 🔴 | rilis bertahap |
| Marketplace fee simulator | 🔴 | bantu pricing decision |

### 20.7 Lintas Role — Integrasi Penting

Setiap item di sini menyentuh ≥3 role dan jadi tulang punggung "marketplace terasa hidup":

1. **Order timeline tunggal** — pembeli, kasir, kurir, owner, admin lihat event yang sama.
2. **Inbox terpadu** — chat, notifikasi sistem, dan komentar review masuk satu bell ikon di setiap role.
3. **Saldo & payout transparan** — pembeli lihat status dana refund-nya = owner lihat escrow = admin lihat ledger.
4. **Stok single source of truth** — kasir POS & pembeli marketplace tidak pernah lihat stok beda.
5. **Identitas & verifikasi** — KYC owner muncul sebagai badge di toko publik & filter di admin.

---

## Bab 21 — UI/UX Blueprint per Role (Responsif Penuh)

Prinsip: **setiap layout wajib jalan mulus di mobile, tablet, desktop** — tapi tiap role punya **device utama** yang dioptimalkan ekstra.

### 21.1 Prinsip Global

- **Design tokens** dari `src/styles.css` (oklch). Tidak ada hex langsung di komponen.
- **Breakpoints**: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.
- **Touch target** minimum 44px di semua role (POS jadi 56px).
- **Empty state, loading skeleton, error state** wajib ada di setiap layar.
- **Aksesibilitas**: kontras AA, fokus terlihat, label form, ARIA pada dialog.
- **Konsistensi**: 1 sistem ikon (lucide), 1 sistem toast (sonner), 1 pola tabel (shadcn `Table` + virtualization saat >100 row).

### 21.2 Pembeli (Customer) — Mobile-first

Device utama: **mobile**. Wajib mulus di tablet/desktop.

```text
Mobile (<768)         Tablet (768-1023)       Desktop (≥1024)
[ top search bar ]    [ search + kategori ]   [ header + mega-menu ]
[ kategori chips ]    [ grid 2 kolom produk ] [ sidebar filter | grid 4 ]
[ feed produk 1 ]     [ bottom nav            [ sticky cart drawer ]
[ bottom nav 5 ikon ] menjadi sidebar tab ]
```

- **Bottom nav 5 ikon** di mobile: Home, Cari, Keranjang, Pesanan, Akun.
- **Sticky CTA** "Beli Sekarang" di detail produk (mobile) → fixed bottom bar.
- **Checkout 1 layar** (alamat, kurir, bayar) dengan accordion; desktop jadi 2 kolom (form | summary).
- **Tracking pesanan** = stepper vertikal mobile, horizontal desktop, peta lazy-load.
- **Chat & notifikasi** = bottom sheet mobile, side drawer desktop.

### 21.3 Pemilik Toko (Owner) — Tablet & Desktop

Device utama: **desktop** untuk manajemen, **tablet** sebagai mode lapangan.

```text
Mobile                Tablet 10"             Desktop ≥1280
[ KPI cards swipe ]   [ KPI 2x2 grid ]       [ Sidebar | KPI 4 col | chart ]
[ tab Pesanan/Stok/   [ split view: list |   [ 3 panel: nav | list | detail ]
  Keuangan ]            detail ]             [ command palette (⌘K) ]
[ FAB tambah ]
```

- **Sidebar baru** (sudah dimulai) dengan grup collapsible — di mobile jadi `Sheet` dari kiri; di tablet auto-collapse jadi ikon-only.
- **Pesanan Hub** unified: tab `Semua · POS · Web · Marketplace` + filter chip status, kurir, channel.
- **Quick actions strip** di top bar: tambah produk, broadcast, lihat saldo, scan QR.
- **Form berat** (produk, promo) → 2 kolom desktop (form | live preview), stepper di mobile.
- **Tabel besar** → di mobile jadi card list dgn aksi swipe.
- **Storefront live preview** sebagai panel kanan saat edit tema.

### 21.4 Staff / Kasir — Tablet-first (POS)

Device utama: **tablet landscape 10–13"**. Mobile = mode "manajer keliling", desktop dukung.

```text
POS Tablet Landscape
[ Header: shift, search, customer  ]
[ Kategori grid | Produk grid (3-4 col) | Cart panel ]
[ Bottom: total, diskon, charge button (full width) ]
```

- **Touch-first**: tombol min 56px, font ≥16px, no hover-only state.
- **Keyboard shortcut** dukung di desktop (F2 cari, F3 diskon, Enter charge).
- **KDS** terpisah: kartu order auto-flow kanan → kiri, warna status, sound saat order baru.
- **Mode offline ringan**: cart bertahan di local storage, sync saat online.
- **Mobile staff view** terbatas: ambil pesanan online, update status, lihat jadwal — tanpa POS penuh.

### 21.5 Super Admin — Desktop-first

Device utama: **desktop ≥1280**. Tablet untuk monitoring, mobile untuk emergency.

```text
Desktop
[ Top bar: env switch, search global, alerts bell ]
[ Sidebar grup: Operasi · Toko · Keuangan · Konten · Sistem ]
[ Workspace: tab + split pane (list | detail) ]
[ Right rail opsional: activity log realtime ]

Tablet → sidebar collapse, split pane jadi tabs
Mobile → focus mode: 1 layar = 1 tugas (approve KYC, baca alert)
```

- **Command palette ⌘K** lintas modul (cari toko, user, invoice, broadcast).
- **Data dense table** dengan: column toggle, saved view, bulk action bar muncul saat ada selection, export CSV.
- **KYC review** = split: dokumen kiri zoomable, form keputusan kanan, riwayat di bawah.
- **Broadcast composer** dengan preview multi-channel (push/email/in-app) berdampingan.
- **Realtime alerts**: toast untuk hal baru + drawer log persistent.

### 21.6 Komponen Bersama Baru

Komponen yang dipakai ulang di semua role (semua responsif):

- `OrdersTabs` (sudah ada) → diperluas dgn badge counter realtime.
- `NotificationBell` + `NotificationDrawer` (channel terfilter per role).
- `ChatPanel` (bottom sheet / side drawer).
- `StatusTimeline` (vertikal mobile, horizontal desktop).
- `SaldoCard` dgn 3 segmen warna (pending/available/withdrawn).
- `EmptyState`, `ErrorState`, `Skeleton` set standar.
- `CommandPalette` (admin & owner).
- `MobileBottomNav` (customer & staff).

### 21.7 Roadmap UI (saran urutan implementasi)

1. **Komponen bersama** (NotificationBell, ChatPanel, StatusTimeline, EmptyState).
2. **Pembeli mobile polish** (bottom nav, sticky CTA, checkout 1 layar).
3. **Owner pesanan hub + sidebar responsif final**.
4. **Staff POS tablet refinement + KDS**.
5. **Super Admin command palette + KYC review split view**.
6. **Storefront live preview + onboarding wizard**.

---

## Detail Teknis Implementasi PRD

- File diedit: **`PRD_MARKETPLACE.md`** — append bab 20 & 21 setelah bab 19, update Daftar Isi (baris 12–34) menambah dua entry.
- Tidak ada perubahan kode, schema, atau migrasi di tahap ini.
- Bab existing (1–19) tidak diubah agar PRD backend tetap jadi sumber kebenaran.
- Setelah PRD diupdate, langkah berikutnya bisa diturunkan jadi task tracker per komponen di bab 21.6.
