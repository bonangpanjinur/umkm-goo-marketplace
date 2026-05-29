/**
 * PostgREST-compatible proxy for Neon/Supabase database.
 * Routes /rest/v1/* to the DB so the frontend Supabase client works unchanged.
 *
 * F1-1: JWT auth middleware + TABLE_WHITELIST + shop_id scoping
 * F1-5: Full PostgREST operators incl. .in, .not, RETURNING *, UPSERT DO UPDATE
 */
import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { httpFetch } from "../lib/fetch-types.js";

const router = Router();

// ── F1-1: Tabel whitelist ────────────────────────────────────────────────────
// Hanya tabel-tabel ini yang bisa diakses via REST proxy.
// Tambahkan tabel baru di sini jika dibutuhkan.
const TABLE_WHITELIST = new Set([
  // Platform
  "shops", "outlets", "plans", "features", "plan_features", "themes", "plan_themes",
  "platform_settings", "platform_vouchers",
  // Produk & Menu
  "menu_items", "menu_categories", "product_variants", "product_options",
  "product_option_values", "menu_addons", "addon_groups",
  // Pesanan
  "orders", "order_items", "order_addons",
  // Pembayaran (via Drizzle — tapi tetap diwhitelist)
  "payment_transactions", "webhook_logs",
  // Pelanggan
  "customers", "customer_addresses", "customer_favorites", "loyalty_points",
  "loyalty_transactions", "loyalty_programs",
  // Booking
  "bookings", "booking_services", "booking_reschedule_tokens",
  // Staff & User
  "user_roles", "staff_members", "staff_permissions", "staff_invitations",
  "user_profiles",
  // Inventaris
  "inventory_items", "inventory_transactions", "raw_materials",
  // Keuangan & Laporan
  "cash_shifts", "cash_movements", "plan_invoices",
  // Notifikasi
  "owner_notifications", "push_subscriptions",
  // Ulasan
  "product_reviews", "menu_reviews",
  // Konten & Marketing
  "marketing_campaigns", "campaign_recipients", "email_campaigns",
  "storefront_layouts", "banners", "promo_codes", "flash_sales",
  "happy_hour_rules",
  // Digital
  "digital_product_versions",
  // Kurir
  "deliveries", "couriers",
  // Lainnya
  "business_categories", "renewal_notification_runs",
  "shop_api_keys", "ad_requests", "freelance_contracts", "job_deliverables",
  "custom_orders", "custom_order_attachments",
]);

// Tabel yang hanya boleh dibaca (GET) — tidak boleh ditulis via proxy
const READ_ONLY_TABLES = new Set([
  "plans", "features", "plan_features", "themes", "plan_themes",
  "platform_settings", "business_categories",
]);

// Tabel yang di-scope per shop_id (auto-inject filter user's shop)
const SHOP_SCOPED_TABLES = new Set([
  "menu_items", "menu_categories", "product_variants", "product_options",
  "product_option_values", "menu_addons", "addon_groups",
  "orders", "order_items", "order_addons",
  "customers", "customer_addresses", "loyalty_points", "loyalty_transactions",
  "bookings", "booking_services",
  "staff_members", "staff_permissions", "staff_invitations",
  "inventory_items", "inventory_transactions",
  "cash_shifts", "cash_movements",
  "owner_notifications", "push_subscriptions",
  "product_reviews", "menu_reviews",
  "marketing_campaigns", "campaign_recipients",
  "storefront_layouts", "banners", "promo_codes", "flash_sales",
  "happy_hour_rules", "digital_product_versions",
  "ad_requests", "shop_api_keys",
]);

// ── helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_OPS = new Set([
  "eq","neq","gt","gte","lt","lte","like","ilike","in","is","cs","cd",
  "sl","sr","nxl","nxr","adj","fts","plfts","phfts","wfts",
]);

function validIdent(s: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

interface FilterClause {
  sql: string;
  params: unknown[];
}

function parseOneFilter(column: string, rawVal: string, paramOffset: number): FilterClause {
  let negate = false;
  if (rawVal.startsWith("not.")) {
    negate = true;
    rawVal = rawVal.slice(4);
  }
  const dotIdx = rawVal.indexOf(".");
  const op = dotIdx === -1 ? rawVal : rawVal.slice(0, dotIdx);
  const val = dotIdx === -1 ? "" : rawVal.slice(dotIdx + 1);

  if (!ALLOWED_OPS.has(op)) return { sql: "TRUE", params: [] };
  if (!validIdent(column)) return { sql: "TRUE", params: [] };

  const p = `$${paramOffset}`;
  let sql: string;
  let params: unknown[];

  switch (op) {
    case "eq":
      if (val === "null") { sql = negate ? `"${column}" IS NOT NULL` : `"${column}" IS NULL`; params = []; break; }
      if (val === "true") { sql = `"${column}" = ${p}`; params = [true]; break; }
      if (val === "false") { sql = `"${column}" = ${p}`; params = [false]; break; }
      sql = `"${column}" = ${p}`; params = [val]; break;
    case "neq":
      sql = `"${column}" != ${p}`; params = [val]; break;
    case "gt":
      sql = `"${column}" > ${p}`; params = [val]; break;
    case "gte":
      sql = `"${column}" >= ${p}`; params = [val]; break;
    case "lt":
      sql = `"${column}" < ${p}`; params = [val]; break;
    case "lte":
      sql = `"${column}" <= ${p}`; params = [val]; break;
    case "like":
      sql = `"${column}" LIKE ${p}`; params = [val.replace(/\*/g, "%")]; break;
    case "ilike":
      sql = `"${column}" ILIKE ${p}`; params = [val.replace(/\*/g, "%")]; break;
    case "in": {
      // F1-5: .in() — parse "(val1,val2,...)" format
      const items = val.replace(/^\(|\)$/g, "").split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      sql = `"${column}" = ANY(${p})`; params = [items]; break;
    }
    case "is":
      if (val === "null") { sql = `"${column}" IS NULL`; params = []; break; }
      if (val === "true") { sql = `"${column}" IS TRUE`; params = []; break; }
      if (val === "false") { sql = `"${column}" IS FALSE`; params = []; break; }
      sql = `"${column}" IS NULL`; params = []; break;
    case "fts": case "plfts": case "phfts": case "wfts":
      sql = `to_tsvector('indonesian', "${column}"::text) @@ plainto_tsquery('indonesian', ${p})`; params = [val]; break;
    default:
      sql = "TRUE"; params = [];
  }

  if (negate && params.length > 0) sql = `NOT (${sql})`;
  return { sql, params };
}

function buildWhere(
  query: Record<string, string | string[]>,
  reservedKeys: Set<string>,
  extra?: { sql: string; params: unknown[] },
): { whereClause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Inject extra condition first (e.g. shop_id scope)
  if (extra) {
    conditions.push(extra.sql);
    params.push(...extra.params);
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (reservedKeys.has(key)) continue;
    if (!validIdent(key)) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const v of values) {
      const { sql, params: p } = parseOneFilter(key, v, params.length + 1);
      conditions.push(sql);
      params.push(...p);
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function parseSelect(selectParam: string | undefined): string {
  if (!selectParam || selectParam === "*") return "*";
  const cols = selectParam.split(",").map((c) => c.trim());
  const safe = cols.filter((c) => {
    const base = c.split("::")[0]!.trim().replace(/^"([^"]+)"$/, "$1");
    return validIdent(base) || base === "*";
  });
  return safe.length > 0 ? safe.map((c) => {
    const base = c.split("::")[0]!.trim().replace(/^"([^"]+)"$/, "$1");
    return validIdent(base) ? `"${base}"` : c;
  }).join(", ") : "*";
}

function parseRange(rangeHeader: string | undefined): { limit: number; offset: number } | null {
  if (!rangeHeader) return null;
  const m = rangeHeader.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const start = parseInt(m[1]!, 10);
  const end = parseInt(m[2]!, 10);
  return { offset: start, limit: end - start + 1 };
}

/** F1-1: Extract user UUID from JWT (decode only — signature check optional). */
function extractUserId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (!token || token === process.env["SUPABASE_ANON_KEY"]) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString()) as Record<string, unknown>;
    const sub = payload["sub"] as string | undefined;
    if (!sub || !/^[0-9a-f-]{36}$/i.test(sub)) return null;
    return sub;
  } catch {
    return null;
  }
}

/** F1-1: Get shop_id for a given user (cached in request context via memo). */
const shopIdMemo = new Map<string, string | null>();
async function getUserShopId(userId: string): Promise<string | null> {
  if (shopIdMemo.has(userId)) return shopIdMemo.get(userId) ?? null;
  try {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM public.shops WHERE owner_id = $1 LIMIT 1`,
      [userId],
    );
    const shopId = r.rows[0]?.id ?? null;
    shopIdMemo.set(userId, shopId);
    // Evict cache after 2 min to avoid stale data
    setTimeout(() => shopIdMemo.delete(userId), 2 * 60 * 1000);
    return shopId;
  } catch {
    return null;
  }
}

const RESERVED_KEYS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns", "apikey"]);

function tableBlockedResponse(res: Response, table: string) {
  res.status(403).json({ message: `Tabel "${table}" tidak diizinkan via proxy ini`, code: "PGRST" });
}

// ── GET /rest/v1/:table ───────────────────────────────────────────────────────
router.get("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table)) { res.status(400).json({ message: "Invalid table name" }); return; }
  if (!TABLE_WHITELIST.has(table)) { tableBlockedResponse(res, table); return; }

  const q = req.query as Record<string, string>;
  const selectCols = parseSelect(q["select"]);
  const rangeH = parseRange(req.headers["range"] as string | undefined);
  const limitParam = q["limit"] ? parseInt(q["limit"], 10) : null;
  const offsetParam = q["offset"] ? parseInt(q["offset"], 10) : null;
  const orderParam = q["order"];

  // F1-1: For shop-scoped tables, inject shop_id filter when user is authenticated
  let extraFilter: { sql: string; params: unknown[] } | undefined;
  if (SHOP_SCOPED_TABLES.has(table)) {
    const userId = extractUserId(req.headers["authorization"] as string | undefined);
    if (userId) {
      const shopId = await getUserShopId(userId);
      if (shopId) {
        extraFilter = { sql: `"shop_id" = $1`, params: [shopId] };
      }
    }
  }

  const { whereClause, params } = buildWhere(q, RESERVED_KEYS, extraFilter);

  let orderClause = "";
  if (orderParam) {
    const parts = orderParam.split(",").map((p) => {
      const [col, dir] = p.split(".");
      if (!validIdent(col ?? "")) return null;
      const d = dir === "desc" ? "DESC" : "ASC";
      return `"${col}" ${d}`;
    }).filter(Boolean);
    if (parts.length > 0) orderClause = `ORDER BY ${parts.join(", ")}`;
  }

  let limitClause = "";
  const limit = rangeH?.limit ?? limitParam ?? null;
  const offset = rangeH?.offset ?? offsetParam ?? 0;
  if (limit !== null) limitClause = `LIMIT ${limit} OFFSET ${offset}`;

  const sql = `SELECT ${selectCols} FROM public."${table}" ${whereClause} ${orderClause} ${limitClause}`;

  try {
    const result = await pool.query(sql, params);
    if (rangeH) res.setHeader("Content-Range", `${offset}-${offset + result.rows.length - 1}/*`);
    res.setHeader("Prefer", "return=representation");
    res.json(result.rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("does not exist") && selectCols !== "*") {
      const fallbackSql = `SELECT * FROM public."${table}" ${whereClause} ${orderClause} ${limitClause}`;
      try {
        const result = await pool.query(fallbackSql, params);
        if (rangeH) res.setHeader("Content-Range", `${offset}-${offset + result.rows.length - 1}/*`);
        res.setHeader("Prefer", "return=representation");
        res.json(result.rows);
        return;
      } catch (err2) {
        logger.error({ err: err2, table, sql: fallbackSql }, "REST GET fallback error");
      }
    }
    logger.error({ err, table, sql }, "REST GET error");
    res.status(400).json({ message: msg || "Query failed", code: "PGRST" });
  }
});

// ── POST /rest/v1/:table ──────────────────────────────────────────────────────
router.post("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table)) { res.status(400).json({ message: "Invalid table name" }); return; }
  if (!TABLE_WHITELIST.has(table)) { tableBlockedResponse(res, table); return; }
  if (READ_ONLY_TABLES.has(table)) { res.status(405).json({ message: "Tabel ini read-only" }); return; }

  const prefer = (req.headers["prefer"] as string) ?? "";
  const returning = prefer.includes("return=representation");

  const rows = Array.isArray(req.body) ? req.body : [req.body];
  if (rows.length === 0) { res.json([]); return; }

  const cols = Object.keys(rows[0] as object).filter(validIdent);
  if (cols.length === 0) { res.status(400).json({ message: "No columns provided" }); return; }

  const placeholders = rows.map((_, ri) =>
    `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`
  ).join(", ");
  const values = rows.flatMap((row) => cols.map((c) => (row as Record<string, unknown>)[c]));

  // F1-5: Support both DO NOTHING and DO UPDATE for upserts
  const q = req.query as Record<string, string>;
  const conflictParam = q["on_conflict"];
  const preferUpsert = prefer.includes("resolution=merge-duplicates");

  let onConflict = "";
  if (conflictParam && validIdent(conflictParam)) {
    if (preferUpsert) {
      // DO UPDATE: update all non-conflict columns
      const updateCols = cols.filter((c) => c !== conflictParam);
      if (updateCols.length > 0) {
        const updateClause = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
        onConflict = `ON CONFLICT ("${conflictParam}") DO UPDATE SET ${updateClause}`;
      } else {
        onConflict = `ON CONFLICT ("${conflictParam}") DO NOTHING`;
      }
    } else {
      onConflict = `ON CONFLICT ("${conflictParam}") DO NOTHING`;
    }
  }

  const ret = returning ? "RETURNING *" : "";
  const quotedCols = cols.map((c) => `"${c}"`).join(", ");
  const sql = `INSERT INTO public."${table}" (${quotedCols}) VALUES ${placeholders} ${onConflict} ${ret}`;

  try {
    const result = await pool.query(sql, values);
    if (returning) {
      res.setHeader("Content-Range", `*/${result.rowCount}`);
      res.status(201).json(result.rows);
    } else {
      res.status(201).json([]);
    }
  } catch (err: unknown) {
    logger.error({ err, table, sql }, "REST POST error");
    res.status(400).json({ message: err instanceof Error ? err.message : "Insert failed", code: "PGRST" });
  }
});

// ── PATCH /rest/v1/:table ─────────────────────────────────────────────────────
router.patch("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table)) { res.status(400).json({ message: "Invalid table name" }); return; }
  if (!TABLE_WHITELIST.has(table)) { tableBlockedResponse(res, table); return; }
  if (READ_ONLY_TABLES.has(table)) { res.status(405).json({ message: "Tabel ini read-only" }); return; }

  const prefer = (req.headers["prefer"] as string) ?? "";
  const returning = prefer.includes("return=representation");

  const body = req.body as Record<string, unknown>;
  const cols = Object.keys(body).filter(validIdent);
  if (cols.length === 0) { res.status(400).json({ message: "No columns to update" }); return; }

  const q = req.query as Record<string, string>;

  // F1-1: For shop-scoped tables, inject shop_id filter
  let extraFilter: { sql: string; params: unknown[] } | undefined;
  if (SHOP_SCOPED_TABLES.has(table)) {
    const userId = extractUserId(req.headers["authorization"] as string | undefined);
    if (userId) {
      const shopId = await getUserShopId(userId);
      if (shopId) {
        extraFilter = { sql: `"shop_id" = $1`, params: [shopId] };
      }
    }
  }

  const { whereClause, params: whereParams } = buildWhere(q, RESERVED_KEYS, extraFilter);
  const setClause = cols.map((c, i) => `"${c}" = $${i + 1}`).join(", ");
  const setValues = cols.map((c) => body[c]);
  const allParams = [...setValues, ...whereParams];
  const whereSql = whereClause.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + cols.length}`);

  const ret = returning ? "RETURNING *" : "";
  const sql = `UPDATE public."${table}" SET ${setClause} ${whereSql} ${ret}`;

  try {
    const result = await pool.query(sql, allParams);
    if (returning) {
      res.json(result.rows);
    } else {
      res.setHeader("Content-Range", `*/${result.rowCount}`);
      res.json([]);
    }
  } catch (err: unknown) {
    logger.error({ err, table, sql }, "REST PATCH error");
    res.status(400).json({ message: err instanceof Error ? err.message : "Update failed", code: "PGRST" });
  }
});

// ── DELETE /rest/v1/:table ────────────────────────────────────────────────────
router.delete("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table)) { res.status(400).json({ message: "Invalid table name" }); return; }
  if (!TABLE_WHITELIST.has(table)) { tableBlockedResponse(res, table); return; }
  if (READ_ONLY_TABLES.has(table)) { res.status(405).json({ message: "Tabel ini read-only" }); return; }

  const q = req.query as Record<string, string>;

  // F1-1: For shop-scoped tables, inject shop_id filter
  let extraFilter: { sql: string; params: unknown[] } | undefined;
  if (SHOP_SCOPED_TABLES.has(table)) {
    const userId = extractUserId(req.headers["authorization"] as string | undefined);
    if (userId) {
      const shopId = await getUserShopId(userId);
      if (shopId) {
        extraFilter = { sql: `"shop_id" = $1`, params: [shopId] };
      }
    }
  }

  const { whereClause, params } = buildWhere(q, RESERVED_KEYS, extraFilter);

  if (!whereClause) {
    res.status(400).json({ message: "Refusing to delete without a WHERE clause" });
    return;
  }

  const sql = `DELETE FROM public."${table}" ${whereClause}`;

  try {
    const result = await pool.query(sql, params);
    res.setHeader("Content-Range", `*/${result.rowCount}`);
    res.json([]);
  } catch (err: unknown) {
    logger.error({ err, table, sql }, "REST DELETE error");
    res.status(400).json({ message: err instanceof Error ? err.message : "Delete failed", code: "PGRST" });
  }
});

// ── POST /rest/v1/rpc/:func ───────────────────────────────────────────────────
// Whitelist fungsi yang boleh dipanggil via RPC proxy
const RPC_WHITELIST = new Set([
  "has_role", "user_belongs_to_shop", "has_outlet_access",
  "fn_send_review_requests", "shops_nearby",
  "approve_plan_invoice", "reject_plan_invoice",
]);

router.post("/rest/v1/rpc/:func", async (req: Request, res: Response) => {
  const func = req.params["func"] as string;
  if (!validIdent(func)) { res.status(400).json({ message: "Invalid function name" }); return; }
  if (!RPC_WHITELIST.has(func)) {
    res.status(403).json({ message: `Fungsi "${func}" tidak diizinkan via proxy ini`, code: "PGRST" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);

  let sql: string;
  let params: unknown[];

  if (keys.length === 0) {
    sql = `SELECT * FROM public."${func}"()`;
    params = [];
  } else {
    const named = keys.map((k, i) => `"${k}" => $${i + 1}`).join(", ");
    sql = `SELECT * FROM public."${func}"(${named})`;
    params = keys.map((k) => body[k]);
  }

  try {
    const result = await pool.query(sql, params);
    res.json(
      result.rows.length === 1 && result.fields.length === 1
        ? result.rows[0]![result.fields[0]!.name]
        : result.rows,
    );
  } catch (err: unknown) {
    logger.error({ err, func, sql }, "REST RPC error");
    res.status(400).json({ message: err instanceof Error ? err.message : "RPC failed", code: "PGRST" });
  }
});

// ── HEAD /rest/v1/:table ──────────────────────────────────────────────────────
router.head("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table) || !TABLE_WHITELIST.has(table)) { res.status(400).end(); return; }

  const q = req.query as Record<string, string>;
  const { whereClause, params } = buildWhere(q, RESERVED_KEYS);
  const sql = `SELECT count(*) FROM public."${table}" ${whereClause}`;

  try {
    const result = await pool.query(sql, params);
    const count = parseInt((result.rows[0] as { count: string }).count, 10);
    res.setHeader("Content-Range", `*/${count}`);
    res.end();
  } catch {
    res.status(400).end();
  }
});

// ── Auth proxy — forward /auth/v1/* ke Supabase upstream ─────────────────────
const UPSTREAM_SUPABASE = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["VITE_SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";

router.all("/auth/v1/*path", async (req: any, res: Response) => {
  if (!UPSTREAM_SUPABASE) {
    res.status(500).json({ message: "UPSTREAM_SUPABASE not configured" });
    return;
  }
  const subPath = (req.params as any).path ?? "";
  const qs = Object.keys(req.query).length ? "?" + new URLSearchParams(req.query as any).toString() : "";
  const url = `${UPSTREAM_SUPABASE}/auth/v1/${subPath}${qs}`;

  try {
    const upstreamRes = await httpFetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": (req.headers["authorization"] as string) || `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const status = upstreamRes.status;
    const forwardHeaders = ["content-type", "x-supabase-api-version", "x-request-id"];
    for (const h of forwardHeaders) {
      const v = upstreamRes.headers.get(h);
      if (v) res.setHeader(h, v);
    }

    if (status === 204 || status === 304) { res.status(status).end(); return; }
    const body = await upstreamRes.text();
    if (!body || body.trim() === "") { res.status(status).end(); return; }

    try { res.status(status).json(JSON.parse(body)); }
    catch { res.status(status).send(body); }
  } catch (err: unknown) {
    logger.error({ err, url }, "Auth proxy error");
    res.status(500).json({ message: "Auth proxy gagal menghubungi Supabase" });
  }
});

export default router;
