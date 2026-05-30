// F17-2 — WhatsApp Broadcast via Fonnte API
// POST /api/wa/send-bulk   — kirim WA ke array contacts via Fonnte
// GET  /api/wa/config      — cek apakah Fonnte API key terkonfigurasi

import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

// ── GET /api/wa/config ────────────────────────────────────────────────────────
router.get("/api/wa/config", (_req, res) => {
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
router.post("/api/wa/send-bulk", async (req, res) => {
  const token = process.env["FONNTE_API_KEY"] ?? "";
  if (!token) {
    return res.status(503).json({
      error:   "Fonnte API key belum dikonfigurasi",
      hint:    "Set FONNTE_API_KEY di Replit Secrets. Daftar di https://fonnte.com",
      enabled: false,
    });
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
    return res.status(400).json({ error: "Sediakan contacts+message atau messages[]" });
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
    results: results.slice(0, 50), // Trim hasil untuk response kecil
  });
});

export default router;
