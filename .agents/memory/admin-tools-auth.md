---
name: Admin tools auth pattern & credentials management
description: How requireSuperAdmin works (3 auth paths) and how all API secrets are managed via admin UI at /admin/credentials.
---

## Rule — Express api-server has no @supabase/supabase-js
`artifacts/api-server` does NOT have `@supabase/supabase-js` as a dependency. Importing it causes esbuild failure.
**Why:** api-server uses `@workspace/db` (Drizzle/pg pool). Supabase JS lives only in the frontend.
**How to apply:** DB calls in Express: use `pool.query()` or helpers from `../lib/supabase-admin.js`. Never import `@supabase/supabase-js` in api-server.

## requireSuperAdmin — 3 auth paths (priority order)
1. `x-admin-secret` header vs `process.env.ADMIN_SECRET` (env var)
2. `x-admin-secret` header vs `platform_settings.system_credentials.admin_secret` (DB-stored fallback)
3. `Authorization: Bearer {supabase_jwt}` — calls Supabase `auth/v1/user` with service key, checks `user_roles` table for `super_admin` role

**Why:** All secrets settable via admin UI; no Replit Secrets dependency for operational config.

## Credentials storage architecture
| Secret | Supabase `platform_settings` key | field |
|---|---|---|
| admin_secret | system_credentials | admin_secret |
| rajaongkir_api_key | system_credentials | rajaongkir_api_key |
| supabase_service_key | system_credentials | supabase_service_key |
| midtrans_*, xendit_* | payment_credentials | — |
| resend_api_key, email_from | email_credentials | — |
| vapid_* | push_credentials | — |
| wa_* | wa_credentials | — |

## Admin UI
`/admin/credentials` — in Admin Nav "Sistem & Konfigurasi". Cache invalidation uses Supabase JWT (no manual secret prompt).

## Bootstrap constraint
`SUPABASE_SERVICE_ROLE_KEY` must be set as Replit Secret first (chicken-and-egg: needed to READ platform_settings). All other secrets can then be managed via the admin UI.
