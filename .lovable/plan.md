# Analisis Error & Rencana Perbaikan UMKMgo

## 1. Akar Masalah Error yang Terjadi

### A. Error Vercel: `business_categories` not found in schema cache
**Bukan masalah database** — tabel ada (11 baris, verified via `read_query`). Penyebabnya: **environment variable di Vercel menunjuk ke project Supabase yang berbeda**.

- Lovable Cloud URL: `umuycjajkkzkrqlbqhgb.supabase.co`
- URL yang dipakai Vercel (dari screenshot sebelumnya): `ttodwsivzskaogyewjzf.supabase.co`

Dua project Supabase berbeda → schema cache di project Vercel memang tidak punya tabel itu.

### B. Error pnpm lockfile mismatch (sudah diperbaiki)
Sudah ditangani dengan regenerasi `pnpm-lock.yaml`.

### C. Endpoint `/api/public/health-db` TIDAK akan berfungsi
**Critical finding**: project ini adalah **Vite SPA murni**, bukan TanStack Start. Bukti:
- `package.json` hanya punya `@tanstack/react-router` (router-only), **bukan** `@tanstack/react-start`
- Script build: `vite build` (frontend statis), tidak ada SSR/server bundle
- Deploy ke Vercel sebagai static site

Konsekuensi:
- File `src/routes/api/public/health-db.ts` dengan `server: { handlers }` **tidak akan dijalankan** sebagai HTTP endpoint. Vercel hanya men-serve static files dari `dist/public`. Memanggil `/api/public/health-db` di production → 404 atau fallback ke index.html.
- Semua file `src/server/*.functions.ts` yang pakai `createServerFn` **tidak punya runtime**. Mereka di-bundle ke client, dan import `client.server` di dalamnya berpotensi bocor service-role key ke browser.

### D. Folder `src/server/` melanggar konvensi TanStack
Aturannya: file yang di-import client tidak boleh ada di `src/server/`. Beberapa file `.functions.ts` di sana ada pasangan `.server.ts`-nya — kalau client mengimport `.functions.ts` dan file itu transitively import `.server.ts`, plugin `block-server-only-imports` akan menggagalkan build.

## 2. Kekurangan Fitur (Yang Harus Diisi)

### A. Backend layer hilang
Project punya banyak server logic (admin, billing, tenant, observability) tapi **tidak ada runtime untuk menjalankannya**. Pilihan:
- **Opsi 1 (recommended)**: Migrasi ke TanStack Start penuh (tambah `@tanstack/react-start`, ubah entry, deploy ke runtime yang support — Vercel functions/Cloudflare Workers)
- **Opsi 2 (paling cepat)**: Pindahkan semua server logic ke **Supabase Edge Functions** (sudah didukung native Lovable Cloud)
- **Opsi 3**: Buat server Node terpisah pakai `server/db.ts` (sudah ada Drizzle) — paling besar effort-nya

### B. Health/observability tidak terhubung
`db-health-badge` memanggil endpoint yang tidak ada → akan selalu menampilkan "Database bermasalah" di production.

### C. Auth & RLS belum diverifikasi end-to-end
Roles infrastructure (has_role RPC) sudah ada, tapi belum dicek apakah semua route Owner/Staff/Courier/Customer benar-benar terlindungi RLS, atau hanya client-side gating (bisa dilewati).

### D. Vercel env vars tidak konsisten dengan Lovable Cloud
Tidak ada dokumentasi/script yang mengingatkan: "kalau deploy di Vercel, pakai VITE_SUPABASE_URL & KEY dari Lovable Cloud" — sehingga error ini akan terus berulang setiap deploy baru.

## 3. Potensi Error Lain yang Saya Lihat

1. **`supabase_migrations` table query di health-db.ts** — schema ini biasanya tidak exposed via PostgREST → query selalu gagal walau endpoint berjalan.
2. **`src/server/*.functions.ts` di-import client** — jika ada komponen yang `import { x } from "@/server/billing.functions"`, build akan error karena `block-server-only-imports` plugin di `vite.config.ts`.
3. **`server/db.ts` (root)** — pakai `pg` + Drizzle, tapi tidak ada Node server yang menjalankannya. Dead code yang membingungkan.
4. **PWA & service worker** (`pwa.d.ts` ada) — bisa cache versi lama dengan URL Supabase lama, user butuh hard reload setelah env var diganti.
5. **Routes sangat banyak (~250 file)** — risiko bundle size besar, perlu lazy-loading per role.
6. **`google/gemini-3.x-preview` model di knowledge** — kalau ada kode yang memanggil model preview, bisa rate-limited/deprecated.

## 4. Rencana Perbaikan (Prioritas)

### Fase 1 — Stabilkan Production (urgent, hari ini)
1. **Fix Vercel env vars** (manual oleh user):
   - Vercel → Settings → Environment Variables → set `VITE_SUPABASE_URL=https://umuycjajkkzkrqlbqhgb.supabase.co` dan `VITE_SUPABASE_PUBLISHABLE_KEY=<anon key Lovable>`
   - Redeploy dengan "Clear Build Cache"
2. **Hapus / non-aktifkan endpoint yang tidak jalan**:
   - Hapus `src/routes/api/public/health-db.ts` (atau migrasi ke Edge Function)
   - Ubah `DbHealthBadge` agar query langsung ke Supabase: `supabase.from('business_categories').select('id', { count: 'exact', head: true })` — tanpa endpoint perantara
3. **Audit `src/server/`**:
   - Cari semua import dari `@/server/*.functions` di komponen client
   - Untuk yang dipakai client → ubah jadi RPC Supabase atau Edge Function
   - Untuk yang murni server (tapi tidak punya runtime) → hapus / arsipkan

### Fase 2 — Pilih & Wire Backend Runtime (1–2 minggu)
4. **Putuskan opsi backend**:
   - **Rekomendasi: Supabase Edge Functions** (sudah ada infra Lovable Cloud, no extra deploy). Pindahkan logic dari `src/server/*.functions.ts` ke `supabase/functions/<name>/index.ts`.
   - Atau migrasi ke TanStack Start penuh kalau ingin SSR.
5. **Buat health Edge Function** `supabase/functions/health-db` yang cek tabel + return schema info. Update `DbHealthBadge` panggil itu via `supabase.functions.invoke()`.
6. **Hapus `server/db.ts`** kalau tidak dipakai, atau dokumentasikan tujuannya.

### Fase 3 — Hardening (2–4 minggu)
7. **Audit RLS** semua tabel terutama: `shops`, `orders`, `staff_audit_logs`, `user_roles`, `business_categories`. Pastikan tidak ada policy `USING (true)` di tabel sensitif.
8. **Verifikasi role gating** server-side via `has_role` RPC di Edge Function (jangan cuma client-side di nav).
9. **Lazy-load routes per role** (admin.*, pos-app.*, kurir.*, akun.*, s.*) untuk turunkan bundle awal.
10. **Tambah CI check**: script yang gagal kalau ada client component import `*.server.ts` atau `@/server/*.functions` di luar pattern resmi.
11. **PWA cache invalidation** — bump versi service worker tiap deploy supaya env baru kepake.

### Fase 4 — Dokumentasi
12. Tambah `DEPLOYMENT.md` dengan checklist Vercel env vars + langkah verifikasi.
13. Tambah `ARCHITECTURE.md` yang jelaskan: SPA vs Edge Function boundary, kapan pakai RPC vs Edge Function.

## 5. Detail Teknis Penting

- Stack saat ini: **Vite 7 + React 19 + TanStack Router (SPA)** — bukan TanStack Start
- Deploy: Vercel sebagai static site, build `vite build` → `dist/public`
- Backend: Supabase via Lovable Cloud (`umuycjajkkzkrqlbqhgb`)
- Aturan: file `*.server.ts` tidak boleh diimport static dari client; node builtins hanya di `*.server.ts` — ditegakkan oleh plugin `block-server-only-imports` di `vite.config.ts`
- Konsekuensi arsitektur: semua server-side logic harus pindah ke Supabase Edge Functions (atau RPC Postgres), karena tidak ada Node runtime di produksi.

## 6. Yang Saya Sarankan Dikerjakan Dulu (next message)

Fase 1 step 1–3 (sekitar 30 menit kerja):
- Refactor `DbHealthBadge` agar query Supabase langsung (hilangkan dependensi endpoint API yang tidak jalan)
- Hapus `src/routes/api/public/health-db.ts`
- Sweep import `@/server/*` dari komponen client, list mana yang harus dipindah ke Edge Function

Setuju untuk lanjut ke Fase 1?
