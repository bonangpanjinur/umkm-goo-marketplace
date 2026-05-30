// F13-2 — Push Notification API
// POST /api/push/send     — kirim push ke satu atau semua subscriber
// POST /api/push/vapid-keys — generate VAPID key pair (admin only)
// GET  /api/push/vapid-public — return public key untuk frontend

import { Router } from "express";
import webpush from "web-push";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Helper: init VAPID kalau sudah dikonfigurasi ──────────────────────────────
function getVapid() {
  const pub  = process.env["VAPID_PUBLIC_KEY"]  ?? "";
  const priv = process.env["VAPID_PRIVATE_KEY"] ?? "";
  const subj = process.env["VAPID_SUBJECT"]     ?? "mailto:admin@umkmgo.id";
  return { pub, priv, subj, ready: !!(pub && priv) };
}

// ── GET /api/push/vapid-public ─────────────────────────────────────────────────
router.get("/push/vapid-public", (_req, res) => {
  const { pub, ready } = getVapid();
  if (!ready) {
    res.json({ enabled: false, publicKey: null });
    return;
  }
  res.json({ enabled: true, publicKey: pub });
});

// ── POST /api/push/vapid-keys ─────────────────────────────────────────────────
// Hanya dipakai saat setup awal. Kembalikan key pair baru.
router.post("/push/vapid-keys", (_req, res) => {
  const keys = webpush.generateVAPIDKeys();
  res.json({
    publicKey:  keys.publicKey,
    privateKey: keys.privateKey,
    hint: "Simpan kedua key ini di Replit Secrets sebagai VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY",
  });
});

// ── POST /api/push/send ────────────────────────────────────────────────────────
// Body:
// {
//   subscriptions: PushSubscription[]  — array dari web push subscription objects
//   title: string
//   body: string
//   icon?: string
//   url?: string
//   tag?: string
// }
router.post("/push/send", async (req, res) => {
  const { pub, priv, subj, ready } = getVapid();
  if (!ready) {
    res.status(503).json({
      error: "Push notification belum dikonfigurasi. Set VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di Secrets.",
    });
    return;
  }

  const { subscriptions, title, body, icon, url, tag } = req.body as {
    subscriptions: webpush.PushSubscription[];
    title: string;
    body: string;
    icon?: string;
    url?: string;
    tag?: string;
  };

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    res.status(400).json({ error: "subscriptions harus berupa array non-kosong" });
    return;
  }
  if (!title || !body) {
    res.status(400).json({ error: "title dan body wajib diisi" });
    return;
  }

  webpush.setVapidDetails(subj, pub, priv);

  const payload = JSON.stringify({
    title,
    body,
    icon:  icon  ?? "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    url:   url   ?? "/",
    tag:   tag   ?? "umkmgo-broadcast",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload)),
  );

  const ok      = results.filter((r) => r.status === "fulfilled").length;
  const failed  = results.filter((r) => r.status === "rejected").length;

  logger.info({ ok, failed, total: subscriptions.length }, "push-send");

  res.json({ sent: ok, failed, total: subscriptions.length });
});

// ── POST /api/push/send-to-all ─────────────────────────────────────────────────
// Ambil semua subscriptions dari Supabase dan kirim broadcast.
// Body: { title, body, icon?, url?, tag?, audience?: "all"|"shop" shopId?: string }
router.post("/push/send-to-all", async (req, res) => {
  const { pub, priv, subj, ready } = getVapid();
  if (!ready) {
    res.status(503).json({
      error: "Push notification belum dikonfigurasi. Set VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY.",
    });
    return;
  }

  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey  = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({ error: "SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi" });
    return;
  }

  const { title, body, icon, url, tag, shopId } = req.body as {
    title: string; body: string; icon?: string; url?: string; tag?: string; shopId?: string;
  };
  if (!title || !body) {
    res.status(400).json({ error: "title dan body wajib diisi" });
    return;
  }

  // Ambil subscriptions dari Supabase
  let apiUrl = `${supabaseUrl}/rest/v1/push_subscriptions?select=subscription`;
  if (shopId) apiUrl += `&shop_id=eq.${shopId}`;

  const resp = await fetch(apiUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  const rows = (await resp.json()) as { subscription: webpush.PushSubscription }[];
  if (!Array.isArray(rows) || rows.length === 0) {
    res.json({ sent: 0, failed: 0, total: 0, message: "Tidak ada subscriber" });
    return;
  }

  webpush.setVapidDetails(subj, pub, priv);
  const payload = JSON.stringify({
    title, body,
    icon:  icon  ?? "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    url:   url   ?? "/",
    tag:   tag   ?? "umkmgo-broadcast",
  });

  const results = await Promise.allSettled(
    rows.map((r) => webpush.sendNotification(r.subscription, payload)),
  );

  const ok     = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  logger.info({ ok, failed, total: rows.length }, "push-send-to-all");

  res.json({ sent: ok, failed, total: rows.length });
});

export default router;
