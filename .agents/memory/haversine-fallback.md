---
name: shops_nearby Haversine fallback
description: sekitar.tsx copes with missing Postgres RPC by computing distance client-side
---

## Rule
`shops_nearby` RPC doesn't exist in Supabase DB. sekitar.tsx tries the RPC first; on any error it falls back to:
1. Query `shops` table with `.not("latitude","is",null)` filter (limit 300)
2. Map each row through `haversineKm(userLat, userLng, shopLat, shopLng)`
3. Filter by radius, sort ascending, slice to 60

**Why:** Creating the RPC requires DB superuser access. Client-side Haversine is accurate enough for UMKM use-case (≤50 km radius).

**How to apply:** The `haversineKm()` helper is defined at module scope in sekitar.tsx. If the RPC is ever created in the DB, the fallback becomes dead code (no harm).
