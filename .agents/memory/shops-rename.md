---
name: shops table rename
description: coffee_shops (Supabase) vs shops (Neon DB + code) — naming mismatch
---

# shops Table Rename

**Situation:** Real Supabase project has `coffee_shops`; all code + Neon DB uses `shops`.

**types.ts:** Manually maintained (no `supabase gen types` available). The `coffee_shops` entry was renamed to `shops` with all 6 location columns added:
- `latitude: number | null`
- `longitude: number | null`
- `city: string | null`
- `province: string | null`
- `postal_code: string | null`
- `google_maps_url: string | null`

`shops_nearby` function added to `Functions` section of types.ts.

**TABLE_WHITELIST in `artifacts/api-server/src/routes/rest.ts`:** Expanded from ~35 to ~100 tables to cover all marketplace tables now in Neon DB.

**Why:** Code migration happened before DB migration; types.ts must be manually kept in sync since Supabase CLI is unavailable.

**How to apply:** Any new columns added to shops in Neon DB must also be manually added to types.ts `shops` Row/Insert/Update. Same for any new tables added to Neon DB — add to TABLE_WHITELIST in rest.ts.
