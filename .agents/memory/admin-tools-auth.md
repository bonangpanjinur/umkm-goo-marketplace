---
name: Admin tools auth pattern
description: Express api-server cannot use @supabase/supabase-js; admin endpoints authenticate via x-admin-secret header.
---

## Rule
`artifacts/api-server` does NOT have `@supabase/supabase-js` as a dependency. Importing it causes esbuild failure: "Could not resolve @supabase/supabase-js".

**Why:** api-server uses `@workspace/db` (Drizzle/pg pool) for DB access. Supabase JS client lives only in the frontend (`artifacts/kopihub`).

**How to apply:**
- Admin auth in Express: check `req.headers['x-admin-secret']` against `process.env.ADMIN_SECRET`
- DB calls in Express: use `pool.query()` from `@workspace/db` or helpers from `../lib/supabase-admin.js`
- Never import `@supabase/supabase-js` directly in any api-server `.ts` file
