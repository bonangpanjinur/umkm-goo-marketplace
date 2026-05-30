---
name: Fresh Schema Migration
description: How to apply the full marketplace schema to the Neon dev DB
---

# Fresh Schema Migration

Full marketplace schema lives in `scripts/fresh_schema/`.

**Files (run in order):**
1. `01_core_schema.sql` — all 200+ tables
2. `02_indexes_views_triggers.sql`
3. `03_constraints_foreign_keys.sql` (some `auth` schema errors expected — ignore)
4. `04_policies_and_storage.sql` (Postgres RLS policies — OK on plain PG; `transaction_timeout` error expected)
5. `05_seed_reference_data.sql`
6. `06_post_consolidation.sql` — includes `shops_nearby` function; `anon`/`authenticated` role errors expected

**Run command:**
```bash
psql "$DATABASE_URL" --set ON_ERROR_STOP=0 -f scripts/fresh_schema/01_core_schema.sql
```

**Additional migrations:** `scripts/fase2_migrations.sql`, `fase3_fase4_migrations.sql`, `fase6_fase7_migrations.sql`, `fase8_fase9_migrations.sql`, `fase10_migrations.sql`

**Why:** Supabase CLI/direct access not available; Neon DB used as local dev store.

**How to apply:** Run scripts against `DATABASE_URL` with `ON_ERROR_STOP=0` — auth/storage schema errors are safe to ignore.
