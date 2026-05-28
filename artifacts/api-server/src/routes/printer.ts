// ============================================================
// Printer TCP Bridge — Node.js TCP socket for LAN printers
// POST /api/printer/tcp  — send raw bytes to IP:port
// POST /api/printer/ping — check TCP reachability
// ============================================================

import { Router } from "express";
import net from "net";

const router = Router();

const CONNECT_TIMEOUT = 5000;
const SEND_TIMEOUT = 8000;

function tcpConnect(host: string, port: number, timeoutMs = CONNECT_TIMEOUT): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection timeout (${host}:${port})`));
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

function sendToSocket(socket: net.Socket, data: Buffer, timeoutMs = SEND_TIMEOUT): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("Send timeout"));
    }, timeoutMs);

    socket.write(data, (err) => {
      clearTimeout(timer);
      socket.end();
      if (err) reject(err); else resolve();
    });
  });
}

// ── POST /api/printer/tcp ─────────────────────────────────────
router.post("/printer/tcp", async (req, res) => {
  const { host, port = 9100, data } = req.body as {
    host: string;
    port?: number;
    data: string; // base64-encoded bytes
  };

  if (!host || !data) {
    return res.status(400).json({ ok: false, error: "host dan data wajib diisi" });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(data, "base64");
  } catch {
    return res.status(400).json({ ok: false, error: "Format data tidak valid (harus base64)" });
  }

  try {
    const socket = await tcpConnect(host, Number(port));
    await sendToSocket(socket, bytes);
    return res.json({ ok: true, bytes: bytes.length });
  } catch (err: any) {
    return res.status(502).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ── POST /api/printer/ping ────────────────────────────────────
router.post("/printer/ping", async (req, res) => {
  const { host, port = 9100 } = req.body as { host: string; port?: number };
  if (!host) return res.status(400).json({ ok: false, error: "host wajib diisi" });

  try {
    const socket = await tcpConnect(host, Number(port), 3000);
    socket.destroy();
    return res.json({ ok: true, host, port });
  } catch (err: any) {
    return res.status(502).json({ ok: false, error: err?.message ?? String(err) });
  }
});

export default router;
