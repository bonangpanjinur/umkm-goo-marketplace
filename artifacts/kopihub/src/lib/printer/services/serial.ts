// ============================================================
// Serial / COM Port Printer Service — Web Serial API
// (navigator.serial) — Electron + Chrome/Edge on Windows.
// Covers: USB-to-Serial adapters, RS232 printers, COM port BT.
// ============================================================

import type { IPrinterDriver, PrinterConfig, DiscoveredDevice } from "../types";

export class SerialPrinterService implements IPrinterDriver {
  readonly type = "serial" as const;

  private port: SerialPort | null = null;
  private baudRate = 9600;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  async connect(config: PrinterConfig): Promise<void> {
    if (!this.isSupported()) throw new Error("Web Serial tidak didukung. Gunakan Electron atau Chrome desktop.");

    await this.disconnect();

    let port: SerialPort | null = null;

    // Try to get previously authorized port
    const ports = await (navigator as any).serial.getPorts() as SerialPort[];
    if (ports.length > 0) port = ports[0];

    if (!port) {
      port = await (navigator as any).serial.requestPort({ filters: [] });
    }

    this.baudRate = config.baudRate ?? 9600;

    // Verify the port opens successfully, then close — actual send opens fresh each time
    await port.open({ baudRate: this.baudRate, dataBits: 8, stopBits: 1, parity: "none" });
    await port.close();

    this.port = port;

    port.addEventListener("disconnect", () => {
      this.port = null;
    });
  }

  async disconnect(): Promise<void> {
    if (this.port) {
      try { await this.port.close(); } catch {}
      this.port = null;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.port) throw new Error("Serial printer tidak terhubung.");

    // Open fresh per-send to avoid stale writer state after idle disconnect/reconnect
    await this.port.open({ baudRate: this.baudRate, dataBits: 8, stopBits: 1, parity: "none" });
    try {
      const writer = this.port.writable!.getWriter();
      try {
        await writer.write(data);
      } finally {
        writer.releaseLock();
      }
    } finally {
      try { await this.port.close(); } catch {}
    }
  }

  async discover(): Promise<DiscoveredDevice[]> {
    if (!this.isSupported()) return [];
    const ports = await (navigator as any).serial.getPorts() as SerialPort[];
    return ports.map((p, i) => {
      const info = (p as any).getInfo?.() ?? {};
      return {
        id: `serial-${i}`,
        name: `COM Port ${i + 1}${info.usbProductId ? ` (${info.usbProductId})` : ""}`,
        connectionType: "serial" as const,
        suggestedConfig: { baudRate: 9600 },
      };
    });
  }

  getBaudRate(): number { return (this.port as any)?.baudRate ?? 9600; }
}
