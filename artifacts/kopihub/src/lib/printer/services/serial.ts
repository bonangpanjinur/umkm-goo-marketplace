// ============================================================
// Serial / COM Port Printer Service — Web Serial API
// (navigator.serial) — Electron + Chrome/Edge on Windows.
// Covers: USB-to-Serial adapters, RS232 printers, COM port BT.
// ============================================================

import type { IPrinterDriver, PrinterConfig, DiscoveredDevice } from "../types";

export class SerialPrinterService implements IPrinterDriver {
  readonly type = "serial" as const;

  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  isConnected(): boolean {
    return this.port !== null && this.writer !== null;
  }

  async connect(config: PrinterConfig): Promise<void> {
    if (!this.isSupported()) throw new Error("Web Serial tidak didukung. Gunakan Electron atau Chrome desktop.");

    await this.disconnect();

    let port: SerialPort | null = null;

    // Try to get previously authorized port
    const ports = await (navigator as any).serial.getPorts() as SerialPort[];
    if (ports.length > 0) port = ports[0];

    if (!port) {
      port = await (navigator as any).serial.requestPort({
        filters: [],
      });
    }

    const baudRate = config.baudRate ?? 9600;
    await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none" });
    this.port = port;
    this.writer = port.writable!.getWriter();

    port.addEventListener("disconnect", async () => {
      await this.disconnect();
    });
  }

  async disconnect(): Promise<void> {
    if (this.writer) {
      try { await this.writer.close(); } catch {}
      this.writer = null;
    }
    if (this.port) {
      try { await this.port.close(); } catch {}
      this.port = null;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error("Serial printer tidak terhubung.");
    await this.writer.write(data);
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
