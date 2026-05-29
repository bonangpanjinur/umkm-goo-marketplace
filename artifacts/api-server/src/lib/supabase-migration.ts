/**
 * Supabase Migration Runner — Fase A
 * Menjalankan SQL migration files ke Supabase PostgreSQL secara langsung.
 * Butuh SUPABASE_DB_URL (Connection String dari Supabase Dashboard → Settings → Database).
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger.js";

const { Pool } = pg;

export const MIGRATION_FILES = [
  {
    id: "fase2",
    label: "Fase 2 — Marketing Campaigns, Storefront Layouts, Digital Products",
    file: "fase2_migrations.sql",
    check_table: "marketing_campaigns",
  },
  {
    id: "fase3_4",
    label: "Fase 3 & 4 — Flash Sales, Promo Codes, Happy Hour Rules",
    file: "fase3_fase4_migrations.sql",
    check_table: "flash_sales",
  },
  {
    id: "fase6_7",
    label: "Fase 6 & 7 — Group Buy, Subscription Plans, Live Sessions, Nearby RPC",
    file: "fase6_fase7_migrations.sql",
    check_table: "group_buys",
  },
  {
    id: "fase8_9",
    label: "Fase 8 & 9 — Bulk Pricing, Restock, Webhook Events, API Keys, GDPR",
    file: "fase8_fase9_migrations.sql",
    check_table: "bulk_pricing_rules",
  },
  {
    id: "fase10",
    label: "Fase 10 — Courier Ratings, Withdrawal Requests",
    file: "fase10_migrations.sql",
    check_table: "courier_ratings",
  },
] as const;

export type MigrationId = (typeof MIGRATION_FILES)[number]["id"];

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  const dbUrl = process.env["SUPABASE_DB_URL"];
  if (!dbUrl) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
    });
    _pool.on("error", (err) => logger.error({ err }, "[migration-pool] idle client error"));
  }
  return _pool;
}

function getScriptsDir(): string {
  return path.join(process.cwd(), "..", "..", "scripts");
}

export type MigrationStatus = {
  id: string;
  label: string;
  applied: boolean;
  error?: string;
};

export async function checkMigrationStatus(): Promise<MigrationStatus[]> {
  const pool = getPool();
  if (!pool) {
    return MIGRATION_FILES.map((m) => ({
      id: m.id,
      label: m.label,
      applied: false,
      error: "SUPABASE_DB_URL belum dikonfigurasi",
    }));
  }

  const results = await Promise.all(
    MIGRATION_FILES.map(async (m) => {
      try {
        const { rows } = await pool.query<{ t: string | null }>(
          `SELECT to_regclass('public.${m.check_table}')::text AS t`,
        );
        const applied = rows[0]?.t !== null && rows[0]?.t !== undefined;
        return { id: m.id, label: m.label, applied };
      } catch (err: any) {
        return { id: m.id, label: m.label, applied: false, error: err?.message };
      }
    }),
  );
  return results;
}

export async function runMigration(id: string): Promise<{ ok: boolean; error?: string }> {
  const pool = getPool();
  if (!pool) {
    return {
      ok: false,
      error: "SUPABASE_DB_URL belum dikonfigurasi. Tambahkan ke Replit Secrets.",
    };
  }

  const migration = MIGRATION_FILES.find((m) => m.id === id);
  if (!migration) {
    return { ok: false, error: `Migration '${id}' tidak ditemukan` };
  }

  let sql: string;
  try {
    sql = readFileSync(path.join(getScriptsDir(), migration.file), "utf-8");
  } catch (err: any) {
    return { ok: false, error: `Gagal baca file migration: ${err?.message}` };
  }

  const client = await pool.connect();
  try {
    await client.query(sql);
    logger.info({ migration: id }, "[migration] Berhasil");
    return { ok: true };
  } catch (err: any) {
    logger.error({ err, migration: id }, "[migration] Gagal");
    return { ok: false, error: err?.message ?? "Unknown error" };
  } finally {
    client.release();
  }
}

export async function runAllMigrations(): Promise<
  Array<{ id: string; label: string; ok: boolean; error?: string }>
> {
  const results: Array<{ id: string; label: string; ok: boolean; error?: string }> = [];
  for (const m of MIGRATION_FILES) {
    const result = await runMigration(m.id);
    results.push({ id: m.id, label: m.label, ...result });
    if (!result.ok) {
      logger.warn({ migration: m.id }, "[migration] Berhenti karena error");
      break;
    }
  }
  return results;
}
