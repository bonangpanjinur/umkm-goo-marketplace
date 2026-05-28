/**
 * PostgREST-compatible proxy for Neon database.
 * Routes /rest/v1/* to the Neon DB so the frontend Supabase client
 * (which expects PostgREST) works unchanged.
 */
import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_OPS = new Set(["eq","neq","gt","gte","lt","lte","like","ilike","in","is","cs","cd","sl","sr","nxl","nxr","adj","fts","plfts","phfts","wfts"]);

/** Table name whitelist: only letters, digits, underscores. */
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

  if (!ALLOWED_OPS.has(op)) {
    return { sql: "TRUE", params: [] };
  }

  if (!validIdent(column)) {
    return { sql: "TRUE", params: [] };
  }

  const p = `$${paramOffset}`;
  let sql: string;
  let params: unknown[];

  switch (op) {
    case "eq":
      if (val === "null") { sql = negate ? `${column} IS NOT NULL` : `${column} IS NULL`; params = []; break; }
      if (val === "true") { sql = `${column} = ${p}`; params = [true]; break; }
      if (val === "false") { sql = `${column} = ${p}`; params = [false]; break; }
      sql = `${column} = ${p}`; params = [val]; break;
    case "neq":
      sql = `${column} != ${p}`; params = [val]; break;
    case "gt":
      sql = `${column} > ${p}`; params = [val]; break;
    case "gte":
      sql = `${column} >= ${p}`; params = [val]; break;
    case "lt":
      sql = `${column} < ${p}`; params = [val]; break;
    case "lte":
      sql = `${column} <= ${p}`; params = [val]; break;
    case "like":
      sql = `${column} LIKE ${p}`; params = [val.replace(/\*/g, "%")]; break;
    case "ilike":
      sql = `${column} ILIKE ${p}`; params = [val.replace(/\*/g, "%")]; break;
    case "in": {
      const items = val.replace(/^\(|\)$/g, "").split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      sql = `${column} = ANY(${p})`; params = [items]; break;
    }
    case "is":
      if (val === "null") { sql = `${column} IS NULL`; params = []; break; }
      if (val === "true") { sql = `${column} IS TRUE`; params = []; break; }
      if (val === "false") { sql = `${column} IS FALSE`; params = []; break; }
      sql = `${column} IS NULL`; params = []; break;
    case "fts":
    case "plfts":
    case "phfts":
    case "wfts":
      sql = `to_tsvector('indonesian', ${column}::text) @@ plainto_tsquery('indonesian', ${p})`; params = [val]; break;
    default:
      sql = "TRUE"; params = [];
  }

  if (negate && params.length > 0) sql = `NOT (${sql})`;
  return { sql, params };
}

/** Parse all PostgREST filter query params into a WHERE clause. */
function buildWhere(
  query: Record<string, string | string[]>,
  reservedKeys: Set<string>,
): { whereClause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

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

/** Parse ?select=col1,col2 safely. Returns `*` if missing or unsafe. */
function parseSelect(selectParam: string | undefined): string {
  if (!selectParam || selectParam === "*") return "*";
  const cols = selectParam.split(",").map((c) => c.trim());
  const safe = cols.filter((c) => {
    const base = c.split("::")[0]!.trim();
    return validIdent(base);
  });
  return safe.length > 0 ? safe.join(", ") : "*";
}

/** Parse Range header → { offset, limit } */
function parseRange(rangeHeader: string | undefined): { limit: number; offset: number } | null {
  if (!rangeHeader) return null;
  const m = rangeHeader.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const start = parseInt(m[1]!, 10);
  const end = parseInt(m[2]!, 10);
  return { offset: start, limit: end - start + 1 };
}

/** Extract user UUID from Supabase JWT (not verifying signature — done server side). */
function extractUserId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as Record<string, unknown>;
    return (payload["sub"] as string) ?? null;
  } catch {
    return null;
  }
}

const RESERVED_KEYS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns", "apikey"]);

// ── GET /rest/v1/:table ───────────────────────────────────────────────────────

router.get("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table)) { res.status(400).json({ message: "Invalid table name" }); return; }

  const q = req.query as Record<string, string>;
  const selectCols = parseSelect(q["select"]);
  const rangeH = parseRange(req.headers["range"] as string | undefined);
  const limitParam = q["limit"] ? parseInt(q["limit"], 10) : null;
  const offsetParam = q["offset"] ? parseInt(q["offset"], 10) : null;
  const orderParam = q["order"];

  const { whereClause, params } = buildWhere(q, RESERVED_KEYS);

  let orderClause = "";
  if (orderParam) {
    const parts = orderParam.split(",").map((p) => {
      const [col, dir] = p.split(".");
      if (!validIdent(col ?? "")) return null;
      const d = dir === "desc" ? "DESC" : "ASC";
      return `${col} ${d}`;
    }).filter(Boolean);
    if (parts.length > 0) orderClause = `ORDER BY ${parts.join(", ")}`;
  }

  let limitClause = "";
  const limit = rangeH?.limit ?? limitParam ?? null;
  const offset = rangeH?.offset ?? offsetParam ?? 0;
  if (limit !== null) limitClause = `LIMIT ${limit} OFFSET ${offset}`;

  const sql = `SELECT ${selectCols} FROM public.${table} ${whereClause} ${orderClause} ${limitClause}`;

  try {
    let result = await pool.query(sql, params);
    if (rangeH) {
      res.setHeader("Content-Range", `${offset}-${offset + result.rows.length - 1}/*`);
    }
    res.setHeader("Prefer", "return=representation");
    res.json(result.rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    // Column doesn't exist — likely a PostgREST embedded-resource select.
    // Fall back to SELECT * so the query still succeeds.
    if (msg.includes("does not exist") && selectCols !== "*") {
      const fallbackSql = `SELECT * FROM public.${table} ${whereClause} ${orderClause} ${limitClause}`;
      try {
        const result = await pool.query(fallbackSql, params);
        if (rangeH) {
          res.setHeader("Content-Range", `${offset}-${offset + result.rows.length - 1}/*`);
        }
        res.setHeader("Prefer", "return=representation");
        res.json(result.rows);
        return;
      } catch (err2: unknown) {
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

  const conflictParam = (req.query as Record<string, string>)["on_conflict"];
  let onConflict = "";
  if (conflictParam && validIdent(conflictParam)) {
    onConflict = `ON CONFLICT (${conflictParam}) DO NOTHING`;
  }

  const ret = returning ? "RETURNING *" : "";
  const sql = `INSERT INTO public.${table} (${cols.join(", ")}) VALUES ${placeholders} ${onConflict} ${ret}`;

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

  const prefer = (req.headers["prefer"] as string) ?? "";
  const returning = prefer.includes("return=representation");

  const body = req.body as Record<string, unknown>;
  const cols = Object.keys(body).filter(validIdent);
  if (cols.length === 0) { res.status(400).json({ message: "No columns to update" }); return; }

  const q = req.query as Record<string, string>;
  const { whereClause, params: whereParams } = buildWhere(q, RESERVED_KEYS);

  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const setValues = cols.map((c) => body[c]);

  const allParams = [...setValues, ...whereParams.map((p, i) => p)];
  const whereSql = whereClause.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + cols.length}`);

  const ret = returning ? "RETURNING *" : "";
  const sql = `UPDATE public.${table} SET ${setClause} ${whereSql} ${ret}`;

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

  const q = req.query as Record<string, string>;
  const { whereClause, params } = buildWhere(q, RESERVED_KEYS);

  if (!whereClause) {
    res.status(400).json({ message: "Refusing to delete without a WHERE clause" });
    return;
  }

  const sql = `DELETE FROM public.${table} ${whereClause}`;

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

router.post("/rest/v1/rpc/:func", async (req: Request, res: Response) => {
  const func = req.params["func"] as string;
  if (!validIdent(func)) { res.status(400).json({ message: "Invalid function name" }); return; }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);

  let sql: string;
  let params: unknown[];

  if (keys.length === 0) {
    sql = `SELECT * FROM public.${func}()`;
    params = [];
  } else {
    const named = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
    sql = `SELECT * FROM public.${func}(${named})`;
    params = keys.map((k) => body[k]);
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows.length === 1 && result.fields.length === 1 ? result.rows[0]![result.fields[0]!.name] : result.rows);
  } catch (err: unknown) {
    logger.error({ err, func, sql }, "REST RPC error");
    res.status(400).json({ message: err instanceof Error ? err.message : "RPC failed", code: "PGRST" });
  }
});

// ── HEAD /rest/v1/:table (count) ─────────────────────────────────────────────

router.head("/rest/v1/:table", async (req: Request, res: Response) => {
  const table = req.params["table"] as string;
  if (!validIdent(table)) { res.status(400).end(); return; }

  const q = req.query as Record<string, string>;
  const { whereClause, params } = buildWhere(q, RESERVED_KEYS);
  const sql = `SELECT count(*) FROM public.${table} ${whereClause}`;

  try {
    const result = await pool.query(sql, params);
    const count = parseInt((result.rows[0] as { count: string }).count, 10);
    res.setHeader("Content-Range", `*/${count}`);
    res.end();
  } catch {
    res.status(400).end();
  }
});

// ── Auth proxy — forward auth calls to original Supabase ─────────────────────

const UPSTREAM_SUPABASE = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["VITE_SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";

router.all("/auth/v1/*", async (req: any, res: any) => {
  if (!UPSTREAM_SUPABASE) {
    res.status(500).json({ message: "UPSTREAM_SUPABASE not configured" });
    return;
  }
  const path = req.path.replace("/rest/v1", ""); // although this is /auth/v1
  const url = `${UPSTREAM_SUPABASE}${path}${Object.keys(req.query).length ? "?" + new URLSearchParams(req.query as any).toString() : ""}`;

  try {
    const fetchRes = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": req.headers["authorization"] as string || `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const data = await fetchRes.json();
    res.status(fetchRes.status).json(data);
  } catch (err: unknown) {
    logger.error({ err, url }, "Auth proxy error");
    res.status(500).json({ message: "Auth proxy failed" });
  }
});

export default router;
