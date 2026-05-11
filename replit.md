# UMKMgo

Platform Marketplace & POS untuk UMKM Indonesia — multi-toko, multi-outlet, dengan fitur marketplace, kasir POS, manajemen inventori, loyalty, dan payment gateway.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 3001)
- `pnpm --filter @workspace/kopihub run dev` — jalankan frontend (port 8080)
- `pnpm run typecheck` — typecheck seluruh workspace
- `pnpm run build` — typecheck + build semua packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks & Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + TanStack Router + Tailwind CSS 4
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (Replit Neon DB)
- Auth: Supabase Auth
- Realtime: Supabase Realtime + BroadcastChannel
- Validation: Zod, drizzle-zod
- Payments: Midtrans, Xendit (via env vars)
- Build: esbuild (api-server)

## Where things live

- `artifacts/kopihub/src/routes/` — semua halaman (TanStack file-based routing)
- `artifacts/kopihub/src/components/` — komponen UI reusable
- `artifacts/kopihub/src/hooks/` — shared React hooks (termasuk `use-notifications.ts`)
- `artifacts/kopihub/src/lib/` — utilities, auth, cart, loyalty, dll
- `artifacts/kopihub/src/integrations/supabase/` — Supabase client & types
- `artifacts/api-server/src/routes/` — Express routes (payments, webhooks, health)
- `lib/db/src/schema/` — Drizzle schema (payment_transactions, webhook_logs)
- `lib/api-spec/` — OpenAPI spec + Orval codegen

## Architecture decisions

- Supabase digunakan untuk Auth + Realtime; Drizzle/Postgres untuk data payment server-side
- BroadcastChannel dipakai untuk sinkronisasi status notifikasi lintas tab tanpa roundtrip DB
- API server Express terpisah dari frontend Vite — frontend proxy `/api` ke port 3001
- Semua secret disimpan di Replit Secrets, bukan di `.env` atau hardcode

## User preferences

- Nama platform: **UMKMgo**
- Bahasa UI: Indonesia (Bahasa)
