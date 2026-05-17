## Ringkasan Audit

Aplikasi UMKMgo sudah punya **240+ file route** dan **8+ tabel role/staff/kurir**, tapi ada beberapa lubang struktural yang membuat sebagian besar role tidak bisa benar-benar dipakai end-to-end.

Temuan paling kritis:
- Tabel `user_roles` **kosong total** → tidak ada super_admin → `/admin/*` praktis tidak bisa diakses sah.
- Belum ada SQL function `public.has_role(_user_id, _role)` (`SECURITY DEFINER`) — semua cek role dilakukan client-side via `supabase.from("user_roles").select(...)` yang rawan privilege escalation.
- Tidak ada route guard berbasis `_authenticated/_admin/_courier/...` — proteksi hanya di komponen (flash of content + bypass mudah).
- Role `customer` tidak punya portal terpisah; tercampur antara `/akun/*`, `/s/$slug/*`, dan `/toko/$slug/*` (3 namespace yang overlap).
- Role `courier` punya tabel + 1 halaman (`/pos-app/courier`) yang **dipasang di shell POS owner/staff** — tidak ada portal kurir mandiri, tidak ada onboarding, tidak ada penugasan order resmi.
- Belum ada data dummy untuk order/menu → 90% flow tidak bisa ditest.

---

## Status per Role

### 1. Super Admin (`/admin/*`)

Sudah ada (~58 halaman):
- Dashboard, analytics, KYC, shops, invoices, withdrawals, vouchers, disputes
- Plans + paket matrix, catalog, kategori usaha, booking config
- Komisi, payment gateway config, AI settings, branding, broadcast
- Auto-cancel, impersonation, audit log, domain, settings, feature flags
- Fee simulator, reconciliation, notif templates, banner/ads
- Users buyer, moderasi, revenue, churn, financial report, fraud
- Auto-renewal, expiry reminders, override reminder per toko, push config
- Revenue leakage, health score, merchant tiers, payout scheduler, tax report
- SLA monitor, cohort analytics, churn re-engagement, GDPR tools
- Multi-admin, broadcast buyers, buyer actions, fraud-scoring

**Gap kritis**:
- ❌ Tidak ada user dengan `role='super_admin'` di `user_roles` → akses `/admin` selalu ditolak.
- ❌ `useIsSuperAdmin` baca langsung dari `user_roles` di client; tidak ada RPC `has_role()` SECURITY DEFINER. Risk: RLS recursion + bypass.
- ❌ Tidak ada `_authenticated/_admin.tsx` layout route. Halaman admin loading dulu, baru cek role di komponen → flash konten + UX jelek.
- ❌ Tidak ada halaman "Kelola Admin" untuk grant/revoke role `super_admin` (multi-admin ada tapi belum lengkap).
- ⚠️ Tidak ada audit khusus untuk aksi admin destruktif (banned shop, refund, edit RLS data).

### 2. Owner Toko (`/pos-app/*`)

Sudah ada (~140 halaman): POS, KDS, kitchen-load, antrian, open-bills, orders, marketplace-orders, online-orders, inventory, recipes, purchase-orders, suppliers, menu, bundles, variants, promos/flash-sale/happy-hour/vouchers, loyalty, membership, customers, reviews, QA, schedule/shifts/attendance/employees, keuangan/tarik, billing, subscriptions, reports.profit, reports, settings, outlets, printers, tables/table-maps/table-qr, storefront/website builder, courier admin (`couriers`, `outlet-shipping`, `rajaongkir`), KYC, domain, custom-css, broadcast-wa, email-marketing, dst.

**Gap kritis**:
- ❌ Tidak ada onboarding wizard untuk owner yang **wajib** isi: shop, outlet, jam buka, metode bayar, rekening tarik, kategori usaha, KYC → langsung dilempar ke dashboard kosong.
- ❌ Belum ada "Setup Wajib" health checklist di dashboard `/pos-app/index` (mis. "0/8 langkah selesai").
- ⚠️ Banyak halaman P3 (rental-*, studio-*, umroh-*, medical-*) untuk vertikal spesifik dimuat tanpa gate kategori → owner toko F&B lihat menu tidak relevan.
- ⚠️ Halaman `staff_members` vs `user_roles` vs `staff_permissions` bertumpang tindih; sumber kebenaran role pekerja tidak konsisten.
- ⚠️ Tidak ada notifikasi realtime saat order online masuk (sudah ada Notification Bell tapi belum subscribe Postgres changes secara konsisten).

### 3. Staff / Pegawai (`/pos-app/*` filtered)

Sudah ada:
- Enum `manager`, `cashier`, `barista` di `app_role`.
- Tabel `staff_permissions(allowed_modules text[])` + hook `useStaffRole()` + `isModuleAllowed()` filter NAV.
- Halaman undang staff via `pos-app/employees`, `staff_invitations`.

**Gap kritis**:
- ❌ Label role masih **legacy kopi** (`barista`) — multi-UMKM mestinya: kasir, pelayan, gudang, koki/produksi, helper, supervisor. Default `MODULE_MAP` masih `barista: [orders, online-orders]`.
- ❌ Tidak ada UI untuk owner edit `allowed_modules` per staff (tabel ada, halaman manage tidak ada — hanya dialog parsial).
- ❌ Staff yang dibuat lewat invitation tidak otomatis ditulis ke `user_roles` (auth.tsx hanya tulis ke `staff_permissions`) → `useStaffRole` fallback ke legacy path.
- ❌ Tidak ada portal mobile khusus staff (mis. `/staff` ringkas) — semua dilempar ke shell `pos-app` desktop owner.
- ⚠️ `staff_audit_logs` tabel ada tapi tidak ada writer di event sensitif (refund, void, edit harga).

### 4. Pembeli / Customer

Sudah ada (banyak namespace overlap):
- `/akun/*` — profil global (pesanan, saldo, loyalty, alamat, wishlist, kursus, custom-orders, returns, dst).
- `/s/$slug/*` — storefront per toko (index/menu/cart/checkout/orders/login/me).
- `/toko/$slug/*` — view publik toko (antrian, booking, chat, custom-order, map, membership, produk, reservasi, saldo, ulasan).
- Marketplace global: `/index`, `/search`, `/kategori`, `/katalog`, `/promo`, `/leaderboard`, `/bandingkan`, `/checkout`, `/keranjang`, `/track`, `/pesanan`, `/download`, `/quote`, `/booking`, `/invite`, `/d/$token`.

**Gap kritis**:
- ❌ **3 namespace toko** (`/s/$slug`, `/toko/$slug`, dan custom domain via `domain-bridge`) — tidak ada single source of truth. SEO confusing, link share inkonsisten.
- ❌ Tidak ada onboarding pembeli (verifikasi nomor HP, alamat default, izin notifikasi) — langsung lempar ke `/akun`.
- ❌ Tidak ada halaman "Riwayat aktivitas + insight" pembeli (cashback flow ada, tapi tidak terhubung ke order completion trigger).
- ⚠️ Banyak halaman membutuhkan login tapi tidak punya `_authenticated` guard → user belum login lihat skeleton kosong + error.
- ⚠️ Tidak ada flow "guest checkout" yang jelas — sebagian checkout butuh login, sebagian tidak.

### 5. Kurir

Sudah ada:
- Enum `courier` di `app_role`.
- Tabel `couriers(shop_id, user_id, name, phone, plate_number, is_active, ...)` — kurir milik toko.
- Tabel `outlet_couriers` — konfigurasi layanan kurir pihak ke-3 per outlet (GoSend, GrabExpress, dll).
- 1 halaman `/pos-app/courier` (PWA list order siap diambil + claim) — dipasang di shell owner.
- 1 halaman `/pos-app/couriers` (admin daftar kurir).
- 1 halaman `/pos-app/delivery` (atur pengiriman).

**Gap kritis**:
- ❌ Tidak ada **portal kurir** (`/kurir/*`) terpisah dari `/pos-app` — kurir login langsung dapat shell owner penuh nav (90+ menu) yang tidak relevan.
- ❌ Tidak ada flow assignment: order `ready` → broadcast/pick → notifikasi kurir → terima → tracking GPS → POD (proof of delivery + foto + signature).
- ❌ Tidak ada halaman "Penghasilan kurir" / "Riwayat antaran".
- ❌ Tidak ada onboarding kurir (KYC sederhana: SIM, STNK, foto plat).
- ❌ Tidak ada notif realtime ke kurir saat order baru ready.
- ⚠️ `pos-app/courier` filter `outlet_couriers.user_id IN (...)` — tapi `outlet_couriers` adalah config 3PL, bukan kurir manusia. Logic ini bug.

---

## Rencana Perbaikan

### P0 — Wajib (1–2 hari)

1. **Setup role infra yang benar** (security memory + auth guards):
   - Migration: buat fungsi `public.has_role(_user_id uuid, _role app_role)` `SECURITY DEFINER`.
   - Migration: seed minimal 1 user `super_admin` (mis. `admin@umkmgo.id` / `demo1234`) ke `user_roles`.
   - Rewrite `useIsSuperAdmin` & `useStaffRole` agar pakai RPC `has_role()` server-side (lebih aman, single source of truth).
   - Tambah layout guard: `src/routes/_authenticated.tsx`, `_authenticated/_admin.tsx`, `_authenticated/_courier.tsx` → `beforeLoad` cek role, `throw redirect()` ke `/login` atau `/unauthorized`. Pindahkan route file admin ke bawahnya (atau pasang `beforeLoad` di `/admin` route grouper saat ini).

2. **Seed data dummy realistis** supaya flow bisa ditest:
   - Migration tambah ~30 menu_items per shop (campuran F&B, retail, jasa).
   - 5 order dummy per outlet dengan status berbeda (pending, ready, delivering, completed, cancelled).
   - 2 kurir per shop (1 internal + 1 3PL via outlet_couriers).
   - 1 buyer demo (`buyer@umkmgo.id`) + 1 courier demo (`kurir@umkmgo.id`).

3. **Portal Kurir terpisah** (`/kurir/*`):
   - Buat layout `src/routes/_authenticated/_courier.tsx` + halaman: `kurir/index` (list order siap), `kurir/active` (sedang diantar), `kurir/history`, `kurir/earnings`, `kurir/profile`.
   - Fix logic `pos-app/courier`: ganti filter `outlet_couriers` → `couriers.user_id = auth.uid()`.
   - Tambah kolom `assigned_courier_id`, `picked_up_at`, `delivered_at`, `proof_photo_url`, `customer_signature_url` di `orders`.

### P1 — Penting (3–5 hari)

4. **Owner onboarding wizard** (`/onboarding` saat ini ada, perlu di-rework):
   - Step: shop info → outlet → jam buka → kategori usaha → metode bayar → rekening tarik (opsional) → KYC (opsional).
   - "Setup checklist" widget di `/pos-app/index` dengan progress bar.
   - Gate halaman vertikal-spesifik (rental/studio/umroh/medical) di belakang `business_category_id` toko — sembunyikan dari NAV bila tidak relevan.

5. **Rapikan namespace pembeli**: Pilih satu canonical (`/s/$slug` untuk owned subdomain UMKMgo, `/toko/$slug` redirect ke `/s/$slug`), atau sebaliknya. Tambahkan canonical tag + 301.

6. **Standardisasi role staff multi-UMKM**:
   - Tambah enum values: `pelayan`, `gudang`, `koki`, `helper`, `supervisor` (atau pakai role generik: `staff_l1`, `staff_l2`, dst).
   - UI manage permission staff (`/pos-app/employees/$id`) — form checkbox modul yang dialokasikan.
   - Saat invite staff diterima → tulis `user_roles` + `staff_permissions` dalam 1 transaksi.

7. **Notifikasi realtime + audit**:
   - Subscribe Postgres `orders` insert untuk role owner & courier → toast + sound.
   - Writer `staff_audit_logs` di event: void order, refund, edit menu price, delete record, akses laporan keuangan.

### P2 — Polish (1–2 minggu)

8. **Customer onboarding ringan** (verif HP via OTP optional, alamat default, izin push) — 1 modal di akun pertama.
9. **Flow penugasan kurir lengkap** (broadcast vs assign manual, POD upload, refund kalau gagal antar, rating kurir).
10. **Insight dashboard** per role (owner: omzet hari ini vs minggu lalu, staff: jumlah transaksi shift ini, kurir: total earning bulan ini, admin: GMV harian).
11. **Hapus 3 namespace toko** → konsolidasi ke 1 (`/s/$slug`); update sitemap.xml.

### P3 — Nice-to-have

12. Push notification VAPID untuk semua role (config halaman sudah ada).
13. GPS tracking realtime kurir (kirim koordinat tiap 30 detik via Supabase Realtime).
14. Multi-admin granular permission (super_admin vs admin_finance vs admin_support).

---

## Detail Teknis Penting (untuk implementasi)

**Migration role infra:**
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Seed super admin demo
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE email='admin@umkmgo.id'
ON CONFLICT DO NOTHING;
```

**Auth guard pattern** (per knowledge `tanstack-auth-guards`):
```tsx
// src/routes/_authenticated/_admin.tsx
beforeLoad: async ({ context, location }) => {
  const { data } = await supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'super_admin' });
  if (!data) throw redirect({ to: '/login', search: { redirect: location.href } });
}
```

**Yang TIDAK termasuk** rencana ini:
- Tidak refactor 240 route file — fokus pada infrastruktur + gap fungsional.
- Tidak ganti Supabase ke backend lain.
- Tidak implement payment gateway production (sudah ada config, perlu kredensial user).

Setelah approval, saya akan mulai dari **P0** (role infra + portal kurir + seed data) karena tanpa itu role-role lain tidak bisa ditest.
