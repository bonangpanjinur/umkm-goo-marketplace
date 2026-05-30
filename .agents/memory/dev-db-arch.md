---
name: Dev DB Architecture
description: How the dev environment routes data — API server, Neon DB, real Supabase
---

# Dev DB Architecture

The dev environment does NOT query the real Supabase project for marketplace data.

**How it works:**
- Frontend Supabase client uses `window.location.origin` as base URL (browser)
- Vite dev server proxies `/rest/v1/*` → API server (port 3001/8080)
- API server is a custom PostgREST-compatible proxy → queries **Neon/local PostgreSQL** (`DATABASE_URL`)
- `/auth/v1/*` is proxied directly to real Supabase (`VITE_SUPABASE_URL`) for Auth only

**Real Supabase** (`gbbbispqqcsabwgmhlls.supabase.co`):
- Has `coffee_shops` table (old name, not `shops`)
- Used ONLY for Auth (login/register/session)
- Anon key only — no service role key available

**Neon DB** (`DATABASE_URL=postgresql://postgres:password@helium/heliumdb`):
- Has ALL 209+ marketplace tables (via fresh schema migration)
- Queried by API server for all REST operations
- Access: `psql "$DATABASE_URL" ...`

**Why:** Supabase project is the "production" schema source; Neon is the local dev DB.

**How to apply:** When debugging REST failures, query Neon DB, not real Supabase. To add tables/columns, use `psql "$DATABASE_URL"` or run migration scripts.
