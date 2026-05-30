/**
 * F5-1 · F5-2 · F5-3 — Server-Sent Events (SSE) Relay
 *
 * Broker pattern: frontend (POS terminal dengan Supabase Realtime) publish events;
 * semua SSE subscriber (KDS tablet, layar display, kurir) menerima events tanpa
 * perlu koneksi Supabase langsung.
 *
 * Endpoints:
 *   GET  /api/sse/stream?shop_id=X&channel=pos|courier|notifications
 *   POST /api/sse/publish   { shop_id, channel, event, payload }
 */
import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

// ── In-memory client registry ─────────────────────────────────────────────────
// key = "<shop_id>:<channel>"
const clients = new Map<string, Set<Response>>();

function registryKey(shopId: string, channel: string) {
  return `${shopId}:${channel}`;
}

function registerClient(key: string, res: Response) {
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key)!.add(res);
}

function unregisterClient(key: string, res: Response) {
  const set = clients.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(key);
}

function broadcastToKey(key: string, event: string, data: unknown) {
  const subs = clients.get(key);
  if (!subs || subs.size === 0) return 0;
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let sent = 0;
  subs.forEach((res) => {
    try {
      res.write(chunk);
      sent++;
    } catch {
      // client already disconnected — will be cleaned up via "close" event
    }
  });
  return sent;
}

// ── F5-1 / F5-2 / F5-3 — SSE Subscribe ──────────────────────────────────────
/**
 * GET /api/sse/stream?shop_id=X&channel=pos|courier|notifications
 *
 * Channel meanings:
 *   pos           → order INSERT/UPDATE events (F5-1)
 *   courier       → order-ready / new-available events (F5-2)
 *   notifications → merchant notification events (F5-3)
 */
router.get("/sse/stream", (req: Request, res: Response) => {
  const shopId = (req.query["shop_id"] as string | undefined)?.trim();
  const channel = ((req.query["channel"] as string | undefined) ?? "pos").trim();

  const VALID_CHANNELS = new Set(["pos", "courier", "notifications"]);
  if (!shopId) {
    res.status(400).json({ error: "Parameter shop_id diperlukan" });
    return;
  }
  if (!VALID_CHANNELS.has(channel)) {
    res.status(400).json({ error: `Channel tidak valid. Gunakan: ${[...VALID_CHANNELS].join(", ")}` });
    return;
  }

  // ── SSE headers ──────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  res.setHeader("Access-Control-Allow-Origin", req.headers["origin"] ?? "*");
  res.flushHeaders();

  const key = registryKey(shopId, channel);

  // ── Initial connection event ─────────────────────────────────────────────
  res.write(
    `event: connected\ndata: ${JSON.stringify({ shop_id: shopId, channel, ts: Date.now() })}\n\n`,
  );

  registerClient(key, res);
  logger.debug({ shopId, channel, total: clients.get(key)?.size }, "SSE client connected");

  // ── Heartbeat every 25s to prevent proxy/LB timeouts ────────────────────
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  // ── Cleanup on disconnect ────────────────────────────────────────────────
  req.on("close", () => {
    clearInterval(heartbeat);
    unregisterClient(key, res);
    logger.debug({ shopId, channel }, "SSE client disconnected");
  });
});

// ── F5-1 / F5-2 / F5-3 — SSE Publish ────────────────────────────────────────
/**
 * POST /api/sse/publish
 * Headers: Authorization: Bearer <supabase-jwt>
 * Body: { shop_id, channel, event, payload }
 *
 * Dipanggil oleh frontend (POS terminal utama) yang sudah subscribe ke Supabase
 * Realtime, agar event tersebut diteruskan ke semua SSE subscriber.
 */
router.post("/sse/publish", (req: Request, res: Response) => {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header dengan Bearer token diperlukan" });
    return;
  }

  const body = req.body as {
    shop_id?: string;
    channel?: string;
    event?: string;
    payload?: unknown;
  };

  const shopId = body.shop_id?.trim();
  const channel = (body.channel ?? "pos").trim();
  const event = (body.event ?? "order_update").trim();
  const payload = body.payload ?? {};

  if (!shopId) {
    res.status(400).json({ error: "shop_id diperlukan" });
    return;
  }

  const key = registryKey(shopId, channel);
  const sent = broadcastToKey(key, event, {
    ...(payload as object),
    _ts: Date.now(),
  });

  logger.debug({ shopId, channel, event, sent }, "SSE event published");
  res.json({ ok: true, subscribers: sent });
});

// ── Diagnostics — jumlah subscriber aktif ────────────────────────────────────
router.get("/sse/status", (_req: Request, res: Response) => {
  const status: Record<string, number> = {};
  clients.forEach((set, key) => {
    status[key] = set.size;
  });
  res.json({ channels: status, total: [...clients.values()].reduce((s, v) => s + v.size, 0) });
});

export default router;
