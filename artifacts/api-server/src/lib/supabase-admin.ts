
import { pool } from "@workspace/db";
import { logger } from "./logger.js";

import { httpFetch } from "./fetch-types.js";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";


/**
 * Update a single row by id in a local Neon DB table.
 */
export async function supabaseUpdate(
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {

  const keys = Object.keys(patch);
  if (keys.length === 0) return;

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = [id, ...Object.values(patch)];
  const sql = `UPDATE public.${table} SET ${setClause} WHERE id = $1`;

  try {
    await pool.query(sql, values);
  } catch (err) {
    logger.error({ err, table, sql }, "[db-admin] update failed");
    throw err;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[supabase-admin] SUPABASE_URL or service key not set; skipping update");
    return;
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
  const res = await httpFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${table} failed ${res.status}: ${text}`);

  }
}

/**
 * Select rows from a local Neon DB table.
 * `filters` is a map of column → value (all joined with AND using =).
 */
export async function supabaseSelect(
  table: string,
  filters: Record<string, string>,
  columns = "*",
): Promise<Record<string, unknown>[]> {

  const entries = Object.entries(filters);
  const whereClause = entries.length > 0
    ? "WHERE " + entries.map(([k], i) => `${k} = $${i + 1}`).join(" AND ")
    : "";
  const values = entries.map(([, v]) => v);
  const sql = `SELECT ${columns} FROM public.${table} ${whereClause}`;

  try {
    const result = await pool.query(sql, values);
    return result.rows;
  } catch (err) {
    logger.error({ err, table, sql }, "[db-admin] select failed");
    return [];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];
  const query = Object.entries(filters)
    .map(([col, val]) => `${encodeURIComponent(col)}=eq.${encodeURIComponent(val)}`)
    .join("&");
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}&${query}`;
  const res = await httpFetch(url, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase SELECT ${table} failed ${res.status}: ${text}`);

  }
}

/**
 * Insert a single row into a local Neon DB table.
 */
export async function supabaseInsert(
  table: string,
  row: Record<string, unknown>,
): Promise<void> {

  const keys = Object.keys(row);
  if (keys.length === 0) return;

  const cols = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = Object.values(row);
  const sql = `INSERT INTO public.${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  try {
    await pool.query(sql, values);
  } catch (err) {
    logger.error({ err, table, sql }, "[db-admin] insert failed");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await httpFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase INSERT ${table} failed ${res.status}: ${text}`);

  }
}
