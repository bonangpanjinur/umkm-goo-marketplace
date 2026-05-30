// F17-2 — WhatsApp Broadcast via Fonnte API
// POST /api/wa/send-bulk   — kirim WA ke array contacts via Fonnte
// GET  /api/wa/config      — cek apakah Fonnte API key terkonfigurasi

import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

// ── GET /api/wa/config ────────────────────────────────────────────────────────
router.get("/wa/config", (_req, res) => {
  const token = process.env["FONNTE_API_KEY"] ?? "";
  res.json({ enabled: !!token });
});

// ── POST /api/wa/send-bulk ────────────────────────────────────────────────────
// Body:
// {
//   contacts: { phone: string; name: string }[]
//   message:  string  — template sudah di-render per contact
// }
//
// Atau kirim per-contact dengan pesan berbeda:
// {
//   messages: { phone: string; message: string }[]
// }
router.post("/wa/send-bulk", async (req, res) => {
  const token = process.env["FONNTE_API_KEY"] ?? "";
  if (!token) {
    res.status(503).json({
      error:   "Fonnte API key belum dikonfigurasi",
      hint:    "Set FONNTE_API_KEY di Replit Secrets. Daftar di https://fonnte.com",
      enabled: false,
    });
    return;
  }

  const { contacts, messages, message } = req.body as {
    contacts?: { phone: string; name: string }[];
    messages?: { phone: string; message: string }[];
    message?:  string;
  };

  // Bangun daftar pesan
  let tasks: { phone: string; message: string }[] = [];

  if (messages && messages.length > 0) {
    tasks = messages;
  } else if (contacts && contacts.length > 0 && message) {
    tasks = contacts.map((c) => ({
      phone:   c.phone,
      message: message.replace(/{{nama}}/g, c.name || "Kak"),
    }));
  } else {
    res.status(400).json({ error: "Sediakan contacts+message atau messages[]" });
    return;
  }

  // Kirim ke Fonnte satu per satu (rate limit aman)
  const results: { phone: string; status: "ok" | "error"; reason?: string }[] = [];
  let delay = 0;

  const sendOne = async (phone: string, msg: string) => {
    try {
      const resp = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target:   phone,
          message:  msg,
          countryCode: "62",
        }),
      });
      const json = await resp.json() as { status: boolean; reason?: string };
      return json.status ? "ok" : (json.reason ?? "error");
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "network_error";
    }
  };

  // Proses dengan jeda 1 detik antar pesan (Fonnte limit)
  const DELAY_MS = 1000;
  for (const task of tasks) {
    await new Promise((r) => setTimeout(r, delay));
    delay = DELAY_MS;
    const result = await sendOne(task.phone, task.message);
    results.push({
      phone:  task.phone,
      status: result === "ok" ? "ok" : "error",
      reason: result !== "ok" ? result : undefined,
    });
  }

  const ok     = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  logger.info({ ok, failed, total: tasks.length }, "wa-send-bulk");

  res.json({
    sent:    ok,
    failed,
    total:   tasks.length,
    results: results.slice(0, 50),
  });
});

// ── POST /api/wa/send-bulk-stream — SSE streaming progress per-kontak ────────
// Body: { messages: { phone: string; message: string }[] }
// Response: text/event-stream; setiap baris: data: {...}\n\n
// Event types: progress { phone, status:"ok"|"error", reason?, sent, failed, total }
//              done     { sent, failed, total }
router.post("/wa/send-bulk-stream", async (req, res) => {
  const token = process.env["FONNTE_API_KEY"] ?? "";
  if (!token) {
    res.status(503).json({
      error:   "Fonnte API key belum dikonfigurasi",
      hint:    "Set FONNTE_API_KEY di Replit Secrets",
      enabled: false,
    });
    return;
  }

  const { messages } = req.body as { messages?: { phone: string; message: string }[] };
  if (!messages || messages.length === 0) {
    res.status(400).json({ error: "messages[] kosong" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const write = (obj: object) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  let sent   = 0;
  let failed = 0;
  const DELAY_MS = 1200;

  for (let i = 0; i < messages.length; i++) {
    const task = messages[i]!;
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    try {
      const resp = await fetch("https://api.fonnte.com/send", {
        method:  "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body:    JSON.stringify({ target: task.phone, message: task.message, countryCode: "62" }),
      });
      const json = (await resp.json()) as { status: boolean; reason?: string };
      if (json.status) {
        sent++;
        write({ type: "progress", phone: task.phone, status: "ok", sent, failed, total: messages.length });
      } else {
        failed++;
        write({ type: "progress", phone: task.phone, status: "error", reason: json.reason ?? "rejected", sent, failed, total: messages.length });
      }
    } catch (e) {
      failed++;
      write({ type: "progress", phone: task.phone, status: "error", reason: e instanceof Error ? e.message : "network_error", sent, failed, total: messages.length });
    }
  }

  write({ type: "done", sent, failed, total: messages.length });
  res.end();
  logger.info({ sent, failed, total: messages.length }, "wa-send-bulk-stream");
});

export default router;
