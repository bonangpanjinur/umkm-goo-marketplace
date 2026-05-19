# Audit Import `@/server/*` di Komponen Client

Tanggal: 2026-05-19
Status: **Tidak akan berfungsi di production** (Vite SPA, tanpa runtime server function)

## File client yang mengimport `@/server/*.functions`

| File client (importer) | Module server yang diimport |
|---|---|
| `src/routes/admin.activity.tsx` | `@/server/observability.functions` |
| `src/routes/admin.shops.$id.tsx` | `@/server/admin-shops.functions` |
| `src/routes/admin.settings.tsx` | `@/server/admin.functions` |
| `src/routes/admin.invoices.tsx` | `@/server/billing.functions` |
| `src/routes/admin.plans.$id.matrix.tsx` | `@/server/plan-matrix.functions` |
| `src/routes/pos-app.backup.tsx` | `@/server/backup.functions` |
| `src/routes/pos-app.website-builder.tsx` | `@/server/page-layouts.functions` |
| `src/routes/pos-app.website-builder.$layoutId.tsx` | `@/server/page-layouts.functions` |
| `src/routes/s.$slug.index.tsx` | `@/server/page-layouts.functions` |
| `src/builder/ImageUploadField.tsx` | (cek manual) |

## Risiko

1. **Tidak ada runtime** — file `*.functions.ts` pakai `createServerFn` dari `@tanstack/react-start`, tapi project ini SPA (`@tanstack/react-router` saja). Saat dipanggil di production, request HTTP ke fungsi tidak akan dijawab (404 → fallback index.html).
2. **Bocor secret** — kalau ada `process.env.X` di file `*.functions.ts` yang ke-trigger di module scope, value-nya `undefined` di browser, atau (lebih buruk) ke-bundle ke client jika ada VITE_ prefix.
3. **Build dapat fail** — plugin `block-server-only-imports` di `vite.config.ts` akan men-throw jika `*.functions.ts` transitively import `*.server.ts`.

## Rekomendasi mapping ke target runtime

| Module | Rekomendasi |
|---|---|
| `observability.functions` (admin activity) | Postgres VIEW + RLS admin-only |
| `admin-shops.functions` | RPC Postgres (security definer + `has_role`) |
| `admin.functions` (settings) | RPC Postgres + RLS admin |
| `billing.functions` (invoices) | Supabase Edge Function `billing-admin` |
| `plan-matrix.functions` | RPC Postgres |
| `backup.functions` | Edge Function `pos-backup` (butuh service role) |
| `page-layouts.functions` | Tabel `page_layouts` + RLS by `shop_id` owner |

## Langkah berikutnya

Fase 2 (1–2 minggu):
1. Cek tiap file di `src/server/` — apakah pakai `process.env` / `supabaseAdmin`?
2. Untuk yang tidak butuh service role → ganti dengan query Supabase langsung + RLS / RPC.
3. Untuk yang butuh service role → buat Edge Function dan panggil via `supabase.functions.invoke()`.
4. Hapus file `src/server/*.functions.ts` setelah migrasi.
