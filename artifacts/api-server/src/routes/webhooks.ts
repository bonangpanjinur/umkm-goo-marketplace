import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { pool } from "@workspace/db";

const router = Router();

async function dbQuery(sql: string, params: unknown[] = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    logger.error({ err, sql }, "[webhooks] db query failed");
    throw err;
  }
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS merchant_webhooks (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id     UUID NOT NULL,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      events      TEXT[] NOT NULL DEFAULT '{}',
      secret      TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS merchant_webhook_deliveries (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      webhook_id    UUID NOT NULL REFERENCES merchant_webhooks(id) ON DELETE CASCADE,
      event         TEXT NOT NULL,
      payload       JSONB,
      response_code INT,
      response_body TEXT,
      duration_ms   INT,
      status        TEXT NOT NULL DEFAULT 'pending',
      delivered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_merchant_webhooks_shop_id ON merchant_webhooks(shop_id);
    CREATE INDEX IF NOT EXISTS idx_merchant_webhook_deliveries_webhook_id ON merchant_webhook_deliveries(webhook_id);
  `).catch(() => {});
}

ensureTable();

router.get("/webhooks", async (req: Request, res: Response) => {
  const shopId = req.query["shop_id"] as string | undefined;
  if (!shopId) {
    res.status(400).json({ error: "shop_id wajib diisi" });
    return;
  }
  try {
    const rows = await dbQuery(
      `SELECT id, shop_id, name, url, events, is_active, created_at, updated_at
       FROM merchant_webhooks WHERE shop_id = $1 ORDER BY created_at DESC`,
      [shopId],
    );
    res.json({ webhooks: rows });
  } catch {
    res.status(500).json({ error: "Gagal memuat webhook" });
  }
});

router.post("/webhooks", async (req: Request, res: Response) => {
  const { shop_id, name, url, events, secret } = req.body as {
    shop_id: string;
    name: string;
    url: string;
    events: string[];
    secret?: string;
  };
  if (!shop_id || !name || !url) {
    res.status(400).json({ error: "shop_id, name, url wajib diisi" });
    return;
  }
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: "Pilih minimal satu event" });
    return;
  }
  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "URL tidak valid" });
    return;
  }
  try {
    const rows = await dbQuery(
      `INSERT INTO merchant_webhooks (shop_id, name, url, events, secret)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [shop_id, name.trim(), url.trim(), events, secret ?? null],
    );
    res.status(201).json({ webhook: rows[0] });
  } catch {
    res.status(500).json({ error: "Gagal membuat webhook" });
  }
});

router.put("/webhooks/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const { name, url, events, secret, is_active } = req.body as {
    name?: string;
    url?: string;
    events?: string[];
    secret?: string;
    is_active?: boolean;
  };
  if (url) {
    try { new URL(url); } catch {
      res.status(400).json({ error: "URL tidak valid" });
      return;
    }
  }
  const sets: string[] = ["updated_at = now()"];
  const vals: unknown[] = [id];
  let p = 2;
  if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name.trim()); }
  if (url !== undefined) { sets.push(`url = $${p++}`); vals.push(url.trim()); }
  if (events !== undefined) { sets.push(`events = $${p++}`); vals.push(events); }
  if (secret !== undefined) { sets.push(`secret = $${p++}`); vals.push(secret || null); }
  if (is_active !== undefined) { sets.push(`is_active = $${p++}`); vals.push(is_active); }

  try {
    const rows = await dbQuery(
      `UPDATE merchant_webhooks SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      vals,
    );
    if (rows.length === 0) { res.status(404).json({ error: "Webhook tidak ditemukan" }); return; }
    res.json({ webhook: rows[0] });
  } catch {
    res.status(500).json({ error: "Gagal memperbarui webhook" });
  }
});

router.delete("/webhooks/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  try {
    await dbQuery(`DELETE FROM merchant_webhooks WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Gagal menghapus webhook" });
  }
});

router.get("/webhooks/:id/deliveries", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  try {
    const rows = await dbQuery(
      `SELECT * FROM merchant_webhook_deliveries WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT 50`,
      [id],
    );
    res.json({ deliveries: rows });
  } catch {
    res.status(500).json({ error: "Gagal memuat riwayat pengiriman" });
  }
});

router.post("/webhooks/:id/test", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const rows = await dbQuery(
    `SELECT * FROM merchant_webhooks WHERE id = $1`,
    [id],
  ).catch(() => []);
  const webhook = rows[0] as { url: string; secret: string | null; shop_id: string } | undefined;
  if (!webhook) {
    res.status(404).json({ error: "Webhook tidak ditemukan" });
    return;
  }

  const payload = {
    event: "test.ping",
    shop_id: webhook.shop_id,
    timestamp: new Date().toISOString(),
    data: { message: "Ini adalah test event dari UMKMgo" },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "UMKMgo-Webhooks/1.0",
    "X-UMKMgo-Event": "test.ping",
  };
  if (webhook.secret) {
    const crypto = await import("node:crypto");
    const sig = crypto.createHmac("sha256", webhook.secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    headers["X-UMKMgo-Signature"] = `sha256=${sig}`;
  }

  const start = Date.now();
  let responseCode = 0;
  let responseBody = "";
  let status = "success";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    responseCode = resp.status;
    responseBody = await resp.text().catch(() => "");
    if (!resp.ok) status = "failed";
  } catch (err) {
    status = "failed";
    responseBody = err instanceof Error ? err.message : "Request gagal";
  }

  const durationMs = Date.now() - start;

  await dbQuery(
    `INSERT INTO merchant_webhook_deliveries (webhook_id, event, payload, response_code, response_body, duration_ms, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, "test.ping", payload, responseCode, responseBody.slice(0, 1000), durationMs, status],
  ).catch(() => {});

  res.json({ ok: true, status, response_code: responseCode, response_body: responseBody, duration_ms: durationMs });
});

export async function dispatchWebhookEvent(
  shopId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  const rows = await dbQuery(
    `SELECT * FROM merchant_webhooks WHERE shop_id = $1 AND is_active = TRUE AND $2 = ANY(events)`,
    [shopId, event],
  ).catch(() => []);

  for (const webhook of rows as { id: string; url: string; secret: string | null }[]) {
    const payload = { event, shop_id: shopId, timestamp: new Date().toISOString(), data };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "UMKMgo-Webhooks/1.0",
      "X-UMKMgo-Event": event,
    };
    if (webhook.secret) {
      const crypto = await import("node:crypto");
      const sig = crypto.createHmac("sha256", webhook.secret)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-UMKMgo-Signature"] = `sha256=${sig}`;
    }

    const start = Date.now();
    let responseCode = 0;
    let responseBody = "";
    let status = "success";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      responseCode = resp.status;
      responseBody = await resp.text().catch(() => "");
      if (!resp.ok) status = "failed";
    } catch (err) {
      status = "failed";
      responseBody = err instanceof Error ? err.message : "Request gagal";
    }

    const durationMs = Date.now() - start;
    await dbQuery(
      `INSERT INTO merchant_webhook_deliveries (webhook_id, event, payload, response_code, response_body, duration_ms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [webhook.id, event, payload, responseCode, responseBody.slice(0, 1000), durationMs, status],
    ).catch(() => {});

    logger.info({ webhookId: webhook.id, event, status, durationMs }, "[webhooks] dispatched");
  }
}

export default router;
