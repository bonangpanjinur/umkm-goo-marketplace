import { Router } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

export type RenewalResult = {
  ran_at: string;
  total_found: number;
  total_sent: number;
  total_skipped: number;
  details: Array<{
    shop_id: string;
    shop_name: string;
    days_remaining: number;
    notification_type: string;
    status: "sent" | "skipped_dedupe" | "skipped_no_shop";
  }>;
  error?: string;
};

/**
 * Core renewal notification logic.
 * Scans for Pro shops expiring in the configured day-windows,
 * inserts in-app notifications via owner_notifications, and deduplicates.
 */
export async function runRenewalNotifications(
  dayWindows: number[] = [1, 3, 7, 14],
): Promise<RenewalResult> {
  const ran_at = new Date().toISOString();
  const result: RenewalResult = {
    ran_at,
    total_found: 0,
    total_sent: 0,
    total_skipped: 0,
    details: [],
  };

  const today = new Date().toISOString().slice(0, 10);

  const candidateShops: Array<{
    shop_id: string;
    shop_name: string;
    plan_expires_at: string;
    days_remaining: number;
    window: number;
    dedupe_key: string;
  }> = [];

  for (const days of dayWindows) {
    const winStart = new Date(Date.now() + (days - 0.5) * 86_400_000);
    const winEnd = new Date(Date.now() + (days + 0.5) * 86_400_000);

    try {
      const { rows } = await pool.query<{ id: string; name: string; plan_expires_at: string }>(
        `SELECT id, name, plan_expires_at
           FROM shops
          WHERE plan = 'pro'
            AND plan_expires_at >= $1
            AND plan_expires_at <= $2`,
        [winStart.toISOString(), winEnd.toISOString()],
      );

      for (const s of rows) {
        const daysRemaining = Math.ceil(
          (new Date(s.plan_expires_at).getTime() - Date.now()) / 86_400_000,
        );
        const dedupeKey = `renewal_${days}d_${s.id}_${today}`;
        candidateShops.push({
          shop_id: s.id,
          shop_name: s.name,
          plan_expires_at: s.plan_expires_at,
          days_remaining: daysRemaining,
          window: days,
          dedupe_key: dedupeKey,
        });
      }
    } catch (err) {
      logger.warn({ err, days }, "[renewal] Failed to query shops for window");
    }
  }

  result.total_found = candidateShops.length;
  if (candidateShops.length === 0) return result;

  const allKeys = candidateShops.map((c) => c.dedupe_key);
  let existingKeys = new Set<string>();
  try {
    const { rows } = await pool.query<{ dedupe_key: string }>(
      `SELECT dedupe_key FROM owner_notifications WHERE dedupe_key = ANY($1)`,
      [allKeys],
    );
    existingKeys = new Set(rows.map((r) => r.dedupe_key));
  } catch {
    // Table may not exist yet — non-fatal, proceed without deduplication
  }

  const toInsert: Array<{
    shop_id: string;
    type: string;
    title: string;
    body: string;
    severity: string;
    link: string;
    dedupe_key: string;
  }> = [];

  for (const c of candidateShops) {
    if (existingKeys.has(c.dedupe_key)) {
      result.total_skipped++;
      result.details.push({
        shop_id: c.shop_id,
        shop_name: c.shop_name,
        days_remaining: c.days_remaining,
        notification_type: `renewal_${c.window}d`,
        status: "skipped_dedupe",
      });
      continue;
    }

    const daysLabel =
      c.days_remaining <= 1
        ? "HARI INI"
        : `${c.days_remaining} hari lagi`;

    const urgency = c.days_remaining <= 1 ? "error" : c.days_remaining <= 3 ? "warning" : "info";

    toInsert.push({
      shop_id: c.shop_id,
      type: "renewal_reminder",
      title: `⏰ Paket Pro Anda berakhir ${daysLabel}`,
      body:
        c.days_remaining <= 1
          ? "Paket Pro Anda berakhir hari ini! Perpanjang sekarang agar fitur premium tetap aktif dan toko Anda tidak terdampak."
          : `Paket Pro Anda akan berakhir dalam ${c.days_remaining} hari (${new Date(c.plan_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}). Perpanjang sekarang dan dapatkan layanan tanpa gangguan.`,
      severity: urgency,
      link: "/pos-app/invoice",
      dedupe_key: c.dedupe_key,
    });

    result.details.push({
      shop_id: c.shop_id,
      shop_name: c.shop_name,
      days_remaining: c.days_remaining,
      notification_type: `renewal_${c.window}d`,
      status: "sent",
    });
  }

  if (toInsert.length > 0) {
    try {
      for (const n of toInsert) {
        await pool.query(
          `INSERT INTO owner_notifications (shop_id, type, title, body, severity, link, dedupe_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (dedupe_key) DO NOTHING`,
          [n.shop_id, n.type, n.title, n.body, n.severity, n.link, n.dedupe_key],
        );
      }
      result.total_sent = toInsert.length;
      logger.info({ total_sent: toInsert.length, ran_at }, "[renewal] Notifications sent");
    } catch (err) {
      logger.warn({ err }, "[renewal] Failed to insert notifications");
    }
  }

  try {
    await pool.query(
      `INSERT INTO renewal_notification_runs (ran_at, total_found, total_sent, total_skipped, triggered_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [ran_at, result.total_found, result.total_sent, result.total_skipped, "auto"],
    );
  } catch {
    // Table may not exist yet — non-fatal
  }

  return result;
}

// ── Routes ────────────────────────────────────────────────────────────────

router.post("/cron/renewal-notifications", async (req, res) => {
  const cronSecret = process.env["CRON_SECRET"];
  if (cronSecret) {
    const auth = (req.headers["authorization"] as string | undefined) ?? "";
    const bodySecret = (req.body as Record<string, unknown>)?.["secret"] as string | undefined;
    if (auth !== `Bearer ${cronSecret}` && bodySecret !== cronSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const rawWindows = (req.body as Record<string, unknown>)?.["day_windows"];
  const dayWindows: number[] =
    Array.isArray(rawWindows) && rawWindows.every((x) => typeof x === "number")
      ? (rawWindows as number[])
      : [1, 3, 7, 14];

  try {
    const result = await runRenewalNotifications(dayWindows);
    res.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "[renewal] Job failed");
    res.status(500).json({ ok: false, error: msg });
  }
});

router.get("/cron/renewal-preview", async (req, res) => {
  const rawDays = req.query["days"];
  const maxDays = Number(rawDays) || 14;
  const cutoff = new Date(Date.now() + maxDays * 86_400_000);

  try {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      slug: string;
      plan_expires_at: string;
    }>(
      `SELECT id, name, slug, plan_expires_at
         FROM shops
        WHERE plan = 'pro'
          AND plan_expires_at <= $1
          AND plan_expires_at > NOW()
        ORDER BY plan_expires_at ASC
        LIMIT 100`,
      [cutoff.toISOString()],
    );

    const enriched = rows.map((s) => ({
      ...s,
      days_remaining: Math.ceil(
        (new Date(s.plan_expires_at).getTime() - Date.now()) / 86_400_000,
      ),
    }));

    res.json({ shops: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ shops: [], error: msg });
  }
});

router.get("/cron/renewal-history", async (_req, res) => {
  try {
    const { rows } = await pool.query<{
      id: string;
      ran_at: string;
      total_found: number;
      total_sent: number;
      total_skipped: number;
      triggered_by: string;
    }>(
      `SELECT id, ran_at, total_found, total_sent, total_skipped, triggered_by
         FROM renewal_notification_runs
        ORDER BY ran_at DESC
        LIMIT 30`,
    );
    res.json({ runs: rows });
  } catch {
    res.json({ runs: [] });
  }
});

export default router;
