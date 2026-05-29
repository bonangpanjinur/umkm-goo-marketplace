import { Router } from "express";
import { logger } from "../lib/logger.js";
import { httpFetch } from "../lib/fetch-types.js";

const router = Router();

const SUPABASE_URL = () => process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const SUPABASE_KEY = () =>
  process.env["SUPABASE_SERVICE_KEY"] ??
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  "";

function headers() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY(),
    "Authorization": `Bearer ${SUPABASE_KEY()}`,
  };
}

async function sbGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`${SUPABASE_URL()}/rest/v1/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("apikey", SUPABASE_KEY());
  const res = await httpFetch<T[]>(url.toString(), {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} failed ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T[]>;
}

async function sbInsertBatch(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const url = `${SUPABASE_URL()}/rest/v1/${table}`;
  const res = await httpFetch(url, {
    method: "POST",
    headers: { ...headers(), "Prefer": "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${table} failed ${res.status}: ${await res.text()}`);
}

async function sbCountDedupeKeys(table: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const inList = keys.map(k => `"${k}"`).join(",");
  const url = `${SUPABASE_URL()}/rest/v1/${table}?select=dedupe_key&dedupe_key=in.(${inList})`;
  const res = await httpFetch<Array<{ dedupe_key: string }>>(url, {
    headers: headers(),
  });
  if (!res.ok) return new Set();
  const data = (await res.json()) as Array<{ dedupe_key: string }>;
  return new Set(data.map(d => d.dedupe_key));
}

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

  if (!SUPABASE_URL() || !SUPABASE_KEY()) {
    result.error = "SUPABASE_URL or service key not configured";
    logger.warn("[renewal] Supabase env not configured, skipping");
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Build all dedup keys we'll check
  const candidateShops: Array<{
    shop_id: string;
    shop_name: string;
    plan_expires_at: string;
    days_remaining: number;
    window: number;
    dedupe_key: string;
  }> = [];

  for (const days of dayWindows) {
    // Window: expires within [days - 0.5, days + 0.5] days from now
    const winStart = new Date(Date.now() + (days - 0.5) * 86_400_000).toISOString();
    const winEnd = new Date(Date.now() + (days + 0.5) * 86_400_000).toISOString();

    let shops: Array<{ id: string; name: string; plan_expires_at: string }> = [];
    try {
      shops = await sbGet<{ id: string; name: string; plan_expires_at: string }>(
        "coffee_shops",
        {
          select: "id,name,plan_expires_at",
          plan: "eq.pro",
          plan_expires_at: `gte.${winStart}`,
          // Supabase REST: need to add second filter for <=winEnd via a different approach
        },
      );
      // Filter client-side for the upper bound (simpler than chaining params)
      shops = shops.filter((s) => s.plan_expires_at && s.plan_expires_at <= winEnd);
    } catch (err) {
      logger.warn({ err, days }, "[renewal] Failed to query shops for window");
      continue;
    }

    for (const s of shops) {
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
  }

  result.total_found = candidateShops.length;
  if (candidateShops.length === 0) return result;

  // Check which dedupe keys already exist
  const allKeys = candidateShops.map((c) => c.dedupe_key);
  const existingKeys = await sbCountDedupeKeys("owner_notifications", allKeys);

  // Build notifications for new ones only
  const toInsert: Record<string, unknown>[] = [];

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
        : c.days_remaining <= 3
          ? `${c.days_remaining} hari lagi`
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
    await sbInsertBatch("owner_notifications", toInsert);
    result.total_sent = toInsert.length;
    logger.info({ total_sent: toInsert.length, ran_at }, "[renewal] Notifications sent");
  }

  // Log the run to renewal_notification_runs (best effort)
  try {
    await sbInsertBatch("renewal_notification_runs", [
      {
        ran_at,
        total_found: result.total_found,
        total_sent: result.total_sent,
        total_skipped: result.total_skipped,
        triggered_by: "auto",
      },
    ]);
  } catch {
    // Table may not exist yet — non-fatal
  }

  return result;
}

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * POST /api/cron/renewal-notifications
 * Trigger the renewal notification job manually or from a scheduler.
 * Body: { day_windows?: number[], secret?: string }
 */
router.post("/cron/renewal-notifications", async (req, res) => {
  // Optional bearer-token guard
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

/**
 * GET /api/cron/renewal-preview
 * Returns a dry-run list of shops that *would* be notified without inserting anything.
 */
router.get("/cron/renewal-preview", async (req, res) => {
  if (!SUPABASE_URL() || !SUPABASE_KEY()) {
    res.json({ shops: [], error: "Supabase not configured" });
    return;
  }

  const rawDays = req.query["days"];
  const maxDays = Number(rawDays) || 14;
  const cutoff = new Date(Date.now() + maxDays * 86_400_000).toISOString();

  try {
    const shops = await sbGet<{
      id: string;
      name: string;
      slug: string;
      plan_expires_at: string;
    }>("coffee_shops", {
      select: "id,name,slug,plan_expires_at",
      plan: "eq.pro",
      plan_expires_at: `lte.${cutoff}`,
      "plan_expires_at.gte": new Date().toISOString(),
      order: "plan_expires_at.asc",
      limit: "100",
    });

    const enriched = shops
      .filter((s) => s.plan_expires_at > new Date().toISOString())
      .map((s) => ({
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

/**
 * GET /api/cron/renewal-history
 * Returns the last N run logs from renewal_notification_runs.
 */
router.get("/cron/renewal-history", async (_req, res) => {
  if (!SUPABASE_URL() || !SUPABASE_KEY()) {
    res.json({ runs: [] });
    return;
  }
  try {
    const runs = await sbGet<{
      id: string;
      ran_at: string;
      total_found: number;
      total_sent: number;
      total_skipped: number;
      triggered_by: string;
    }>("renewal_notification_runs", {
      select: "id,ran_at,total_found,total_sent,total_skipped,triggered_by",
      order: "ran_at.desc",
      limit: "30",
    });
    res.json({ runs });
  } catch {
    res.json({ runs: [] });
  }
});

export default router;
