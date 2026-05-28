// ============================================================
// Network / LAN Printer Service — TCP RAW (port 9100)
// Strategy: POST to local API server (/api/printer/tcp) which
// opens the TCP socket in Node.js — renderer can't do raw TCP.
// Falls back to Electron IPC bridge if window.electronAPI exists.
// ============================================================

import type { IPrinterDriver, PrinterConfig, DiscoveredDevice } from "../types";

// Local API server base URL — same-origin in Electron/dev
const API_BASE = typeof window !== "undefined"
  ? (import.meta.env.VITE_API_URL ?? "http://localhost:3001")
  : "http://localhost:3001";

async function sendViaTcp(host: string, port: number, data: Uint8Array): Promise<void> {
  // 1. Try Electron IPC bridge first (fastest, direct TCP)
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.printTcp) {
    const result = await electronAPI.printTcp({ host, port, data: Array.from(data) });
    if (!result.ok) throw new Error(result.error ?? "Electron TCP print failed");
    return;
  }

  // 2. Fall back to API server TCP bridge
  const body = JSON.stringify({
    host,
    port,
    data: btoa(String.fromCharCode(...data)),
  });

  const res = await fetch(`${API_BASE}/api/printer/tcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Network print gagal: ${msg}`);
  }
}

export class NetworkPrinterService implements IPrinterDriver {
  readonly type = "network" as const;

  private host = "";
  private port = 9100;
  private _connected = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  isSupported(): boolean { return true; }

  isConnected(): boolean { return this._connected; }

  async connect(config: PrinterConfig): Promise<void> {
    if (!config.networkHost) throw new Error("Alamat IP printer belum diisi.");
    this.host = config.networkHost;
    this.port = config.networkPort ?? 9100;

    // Verify connectivity with a ping via API
    await this._ping();
    this._connected = true;

    // Periodic ping to detect offline
    this.pingTimer = setInterval(async () => {
      try { await this._ping(); this._connected = true; }
      catch { this._connected = false; }
    }, 30_000);
  }

  async disconnect(): Promise<void> {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this._connected = false;
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.host) throw new Error("Network printer belum dikonfigurasi.");
    await sendViaTcp(this.host, this.port, data);
    this._connected = true;
  }

  async discover(): Promise<DiscoveredDevice[]> {
    // Network discovery requires ARP/mDNS — not feasible from browser.
    // Return empty; users enter IP manually.
    return [];
  }

  private async _ping(): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.pingPrinter) {
      const r = await electronAPI.pingPrinter({ host: this.host, port: this.port });
      if (!r.ok) throw new Error("Printer tidak dapat dijangkau");
      return;
    }
    const res = await fetch(`${API_BASE}/api/printer/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: this.host, port: this.port }),
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
    if (!res?.ok) throw new Error("Printer tidak dapat dijangkau");
  }
}
