/**
 * Admin Tools API Routes
 *
 * POST /admin/auto-cancel         — run fn_auto_cancel_expired()
 * DELETE /admin/user/:userId/data — GDPR erasure via fn_gdpr_erase_user()
 * POST /admin/churn/snapshot      — run fn_churn_metrics_snapshot()
 * POST /admin/restock-notify      — trigger fn_notify_restock() for a menu_item
 * POST /admin/commission/apply    — apply commission to a specific order
 * GET  /admin/migrations/status   — cek status migration Fase A
 * POST /admin/migrations/run      — jalankan migration (requires SUPABASE_DB_URL)
 * POST /admin/credentials/invalidate-cache — hapus cache platform credentials
 */
import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";
import {
  checkMigrationStatus,
  runMigration,
  runAllMigrations,
} from "../lib/supabase-migration.js";
import { invalidateCredentialsCache, getCredential } from "../lib/platform-credentials.js";

const router = Router();

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";

/** Verify a Supabase JWT belongs to a super_admin user */
async function verifySuperAdminJWT(token: string): Promise<boolean> {
  if (!SUPABASE_URL || !token) return false;
  try {
    const serviceKey =
      (await getCredential("supabase_service_key")) ??
      process.env["SUPABASE_SERVICE_KEY"] ??
      process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
      "";
    if (!serviceKey) return false;
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!userRes.ok) return false;
    const user = await userRes.json() as { id?: string };
    if (!user?.id) return false;
    const roleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.super_admin&select=id&limit=1`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!roleRes.ok) return false;
    const roles = await roleRes.json() as unknown[];
    return Array.isArray(roles) && roles.length > 0;
  } catch {
    return false;
  }
}

async function requireSuperAdmin(req: Request, res: Response): Promise<boolean> {
  const headerSecret = (req.headers["x-admin-secret"] ?? "") as string;

  // 1. Check env ADMIN_SECRET
  const envSecret = process.env["ADMIN_SECRET"];
  if (envSecret && headerSecret === envSecret) return true;

  // 2. Check platform_settings admin_secret (DB-stored secret)
  if (headerSecret) {
    const dbSecret = await getCredential("admin_secret").catch(() => undefined);
    if (dbSecret && headerSecret === dbSecret) return true;
  }

  // 3. Accept Supabase JWT with super_admin role
  const authHeader = (req.headers["authorization"] ?? "") as string;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (await verifySuperAdminJWT(token)) return true;
  }

  res.status(401).json({ error: "Unauthorized" });
  return false;
}

// ── POST /admin/auto-cancel ────────────────────────────────────────────────
router.post("/admin/auto-cancel", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  try {
    const result = await pool.query("SELECT fn_auto_cancel_expired() AS cancelled");
    res.json({ ok: true, cancelled: result.rows[0]?.cancelled ?? 0 });
  } catch (e: any) {
    logger.error({ err: e }, "[admin-tools] auto-cancel failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── DELETE /admin/user/:userId/data ───────────────────────────────────────
router.delete("/admin/user/:userId/data", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT fn_gdpr_erase_user($1::uuid) AS tables_cleared",
      [userId],
    );
    res.json({ ok: true, tables_cleared: result.rows[0]?.tables_cleared ?? 0 });
  } catch (e: any) {
    logger.error({ err: e, userId }, "[admin-tools] gdpr-erase failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── POST /admin/churn/snapshot ─────────────────────────────────────────────
router.post("/admin/churn/snapshot", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  try {
    await pool.query("SELECT fn_churn_metrics_snapshot()");
    res.json({ ok: true });
  } catch (e: any) {
    logger.error({ err: e }, "[admin-tools] churn-snapshot failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── POST /admin/restock-notify ─────────────────────────────────────────────
router.post("/admin/restock-notify", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  const { menu_item_id } = req.body ?? {};
  if (!menu_item_id) {
    res.status(400).json({ error: "menu_item_id required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT fn_notify_restock($1::uuid) AS notified",
      [menu_item_id],
    );
    res.json({ ok: true, notified: result.rows[0]?.notified ?? 0 });
  } catch (e: any) {
    logger.error({ err: e, menu_item_id }, "[admin-tools] restock-notify failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── POST /admin/commission/apply ───────────────────────────────────────────
router.post("/admin/commission/apply", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  const { order_id } = req.body ?? {};
  if (!order_id) {
    res.status(400).json({ error: "order_id required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT fn_apply_commission($1::uuid) AS commission_fee",
      [order_id],
    );
    res.json({ ok: true, commission_fee: result.rows[0]?.commission_fee ?? 0 });
  } catch (e: any) {
    logger.error({ err: e, order_id }, "[admin-tools] apply-commission failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── GET /admin/migrations/status ──────────────────────────────────────────
router.get("/admin/migrations/status", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  try {
    const status = await checkMigrationStatus();
    const hasDbUrl = Boolean(process.env["SUPABASE_DB_URL"]);
    res.json({ ok: true, has_db_url: hasDbUrl, migrations: status });
  } catch (e: any) {
    logger.error({ err: e }, "[admin-tools] migration-status failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── POST /admin/migrations/run ────────────────────────────────────────────
router.post("/admin/migrations/run", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  const { id } = req.body ?? {};

  try {
    if (id === "all" || !id) {
      const results = await runAllMigrations();
      const allOk = results.every((r) => r.ok);
      res.json({ ok: allOk, results });
    } else {
      const result = await runMigration(id);
      res.json({ ok: result.ok, results: [{ id, ...result }] });
    }
  } catch (e: any) {
    logger.error({ err: e }, "[admin-tools] migration-run failed");
    res.status(500).json({ error: e?.message ?? "Internal error" });
  }
});

// ── POST /admin/credentials/invalidate-cache ──────────────────────────────
router.post("/admin/credentials/invalidate-cache", async (req: Request, res: Response) => {
  if (!(await requireSuperAdmin(req, res))) return;

  invalidateCredentialsCache();
  res.json({ ok: true, message: "Cache credentials dihapus. Credentials baru akan dimuat pada request berikutnya." });
});

export default router;
