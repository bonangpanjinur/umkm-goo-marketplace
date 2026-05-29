import { pool } from "@workspace/db";
import { logger } from "./logger.js";

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
  }
}
