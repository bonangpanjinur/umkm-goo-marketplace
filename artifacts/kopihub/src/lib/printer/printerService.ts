// ============================================================
// WebUSB Thermal Printer Service
// Uses navigator.usb — no window.print(), no browser dialog.
// Compatible: Electron + Chrome/Edge on Windows.
// ============================================================

export type PrinterStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

export type PrinterInfo = {
  vendorId: number;
  productId: number;
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
};

export type PrinterServiceEvent =
  | { type: "status"; status: PrinterStatus }
  | { type: "error"; message: string }
  | { type: "print-done" }
  | { type: "printer-info"; info: PrinterInfo };

type Listener = (event: PrinterServiceEvent) => void;

// ── Storage keys ─────────────────────────────────────────────
const KEY_VENDOR = "usb_printer.vendorId";
const KEY_PRODUCT = "usb_printer.productId";

// ── USB printer class codes ──────────────────────────────────
// Most thermal printers use class 0x07 (Printer) or vendor-specific (0xFF).
// We probe both configurations automatically.
const PRINTER_CLASS = 0x07;

function saveDefaultPrinter(vendorId: number, productId: number) {
  try {
    localStorage.setItem(KEY_VENDOR, String(vendorId));
    localStorage.setItem(KEY_PRODUCT, String(productId));
  } catch {}
}

function loadDefaultPrinter(): { vendorId: number; productId: number } | null {
  try {
    const v = localStorage.getItem(KEY_VENDOR);
    const p = localStorage.getItem(KEY_PRODUCT);
    if (v && p) return { vendorId: Number(v), productId: Number(p) };
  } catch {}
  return null;
}

function clearDefaultPrinter() {
  try {
    localStorage.removeItem(KEY_VENDOR);
    localStorage.removeItem(KEY_PRODUCT);
  } catch {}
}

// ── USBPrinterService ────────────────────────────────────────

class USBPrinterService {
  private device: USBDevice | null = null;
  private endpointNumber = 1;
  private status: PrinterStatus = "disconnected";
  private listeners: Set<Listener> = new Set();

  // ── Event system ──────────────────────────────────────────

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: PrinterServiceEvent) {
    for (const l of this.listeners) {
      try { l(event); } catch {}
    }
  }

  private setStatus(status: PrinterStatus) {
    this.status = status;
    this.emit({ type: "status", status });
  }

  getStatus(): PrinterStatus {
    return this.status;
  }

  getDeviceInfo(): PrinterInfo | null {
    if (!this.device) return null;
    return {
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      manufacturerName: this.device.manufacturerName,
      productName: this.device.productName,
      serialNumber: this.device.serialNumber,
    };
  }

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "usb" in navigator;
  }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "printing";
  }

  // ── Device selection ──────────────────────────────────────

  /**
   * Show the browser/Electron USB device picker.
   * Filters to devices that are likely thermal printers.
   */
  async requestDevice(): Promise<boolean> {
    if (!this.isSupported()) {
      this.emit({ type: "error", message: "WebUSB tidak didukung. Gunakan Electron atau Chrome/Edge desktop." });
      return false;
    }
    this.setStatus("connecting");
    try {
      const device = await navigator.usb.requestDevice({
        filters: [
          { classCode: PRINTER_CLASS },
          { classCode: 0xff },
        ],
      });
      return this._connect(device);
    } catch (err: any) {
      if (err?.name === "NotFoundError") {
        this.setStatus("disconnected");
        return false;
      }
      this.setStatus("error");
      this.emit({ type: "error", message: err?.message ?? String(err) });
      return false;
    }
  }

  /**
   * Attempt to reconnect to the previously saved (default) printer.
   * Called automatically on app startup.
   */
  async autoReconnect(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const saved = loadDefaultPrinter();
    if (!saved) return false;
    try {
      const devices = await navigator.usb.getDevices();
      const device = devices.find(
        (d) => d.vendorId === saved.vendorId && d.productId === saved.productId,
      );
      if (!device) return false;
      return this._connect(device);
    } catch {
      return false;
    }
  }

  // ── Connect / disconnect ──────────────────────────────────

  private async _connect(device: USBDevice): Promise<boolean> {
    this.setStatus("connecting");
    try {
      await device.open();

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      const iface = this._findPrinterInterface(device);
      if (iface === null) {
        await device.close();
        throw new Error("Tidak ditemukan interface printer pada perangkat USB ini.");
      }

      await device.claimInterface(iface.interfaceNumber);
      this.endpointNumber = this._findBulkOutEndpoint(iface);
      this.device = device;

      saveDefaultPrinter(device.vendorId, device.productId);
      this.setStatus("connected");
      this.emit({
        type: "printer-info",
        info: {
          vendorId: device.vendorId,
          productId: device.productId,
          manufacturerName: device.manufacturerName,
          productName: device.productName,
          serialNumber: device.serialNumber,
        },
      });

      device.addEventListener("disconnect", () => this._onDisconnect());
      return true;
    } catch (err: any) {
      this.device = null;
      this.setStatus("error");
      this.emit({ type: "error", message: err?.message ?? String(err) });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;
    try {
      await this.device.close();
    } catch {}
    this.device = null;
    clearDefaultPrinter();
    this.setStatus("disconnected");
  }

  private _onDisconnect() {
    this.device = null;
    this.setStatus("disconnected");
    this.emit({ type: "error", message: "Printer terputus secara tidak terduga." });
  }

  // ── USB interface probing ─────────────────────────────────

  private _findPrinterInterface(device: USBDevice): USBInterface | null {
    const config = device.configuration;
    if (!config) return null;
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === PRINTER_CLASS || alt.interfaceClass === 0xff) {
          return iface;
        }
      }
    }
    return config.interfaces[0] ?? null;
  }

  private _findBulkOutEndpoint(iface: USBInterface): number {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === "out" && ep.type === "bulk") {
          return ep.endpointNumber;
        }
      }
    }
    return 1;
  }

  // ── Data transfer ─────────────────────────────────────────

  /**
   * Send raw ESC/POS bytes to the printer.
   * Handles chunking for large payloads.
   */
  async send(data: Uint8Array): Promise<void> {
    if (!this.device || !this.isConnected()) {
      throw new Error("Printer tidak terhubung.");
    }
    this.setStatus("printing");
    try {
      const CHUNK_SIZE = 4096;
      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE);
        const result = await this.device.transferOut(this.endpointNumber, chunk);
        if (result.status !== "ok") {
          throw new Error(`Transfer USB gagal: status = ${result.status}`);
        }
      }
      this.setStatus("connected");
      this.emit({ type: "print-done" });
    } catch (err: any) {
      this.setStatus("error");
      this.emit({ type: "error", message: err?.message ?? String(err) });
      throw err;
    }
  }

  /**
   * High-level print: send bytes, with auto-reconnect on first failure.
   */
  async print(data: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      const reconnected = await this.autoReconnect();
      if (!reconnected) {
        throw new Error("Printer tidak terhubung. Hubungkan printer terlebih dahulu.");
      }
    }
    await this.send(data);
  }
}

export const printerService = new USBPrinterService();
