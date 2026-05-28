// ============================================================
// PrinterManager — central orchestrator
// Strategy pattern: routes each job to the correct driver.
// Handles: connect, reconnect, multi-printer, discovery.
// ============================================================

import type {
  PrinterConfig,
  PrinterDevice,
  PrinterEvent,
  PrinterEventListener,
  PrinterStatus,
  DiscoveredDevice,
  IPrinterDriver,
  PrinterConnectionType,
} from "../types";
import { UsbPrinterService } from "../services/usb";
import { BluetoothPrinterService } from "../services/bluetooth";
import { SerialPrinterService } from "../services/serial";
import { NetworkPrinterService } from "../services/network";

const STORAGE_KEY = "printer.configs";
const DEFAULT_KEY = "printer.default";

// ── Config persistence ────────────────────────────────────────

function loadConfigs(): PrinterConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConfigs(configs: PrinterConfig[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(configs)); } catch {}
}

function loadDefaultId(): string | null {
  try { return localStorage.getItem(DEFAULT_KEY); } catch { return null; }
}

function saveDefaultId(id: string | null) {
  try {
    if (id) localStorage.setItem(DEFAULT_KEY, id);
    else localStorage.removeItem(DEFAULT_KEY);
  } catch {}
}

// ── Driver factory ────────────────────────────────────────────

function makeDriver(type: PrinterConnectionType): IPrinterDriver {
  switch (type) {
    case "usb": return new UsbPrinterService();
    case "bluetooth": return new BluetoothPrinterService();
    case "serial": return new SerialPrinterService();
    case "network": return new NetworkPrinterService();
  }
}

// ── PrinterManager ────────────────────────────────────────────

class PrinterManager {
  private configs: Map<string, PrinterConfig> = new Map();
  private devices: Map<string, PrinterDevice> = new Map();
  private drivers: Map<string, IPrinterDriver> = new Map();
  private listeners: Set<PrinterEventListener> = new Set();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private defaultId: string | null = null;

  constructor() {
    this._load();
  }

  // ── Event system ────────────────────────────────────────

  on(listener: PrinterEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: PrinterEvent) {
    for (const l of this.listeners) { try { l(event); } catch {} }
  }

  // ── Persistence ──────────────────────────────────────────

  private _load() {
    const stored = loadConfigs();
    for (const cfg of stored) this.configs.set(cfg.id, cfg);
    this.defaultId = loadDefaultId();
  }

  private _save() {
    saveConfigs(Array.from(this.configs.values()));
    saveDefaultId(this.defaultId);
  }

  // ── Config management ────────────────────────────────────

  getConfigs(): PrinterConfig[] {
    return Array.from(this.configs.values());
  }

  getConfig(id: string): PrinterConfig | null {
    return this.configs.get(id) ?? null;
  }

  addConfig(config: PrinterConfig): void {
    this.configs.set(config.id, config);
    if (config.isDefault || this.configs.size === 1) {
      this.setDefault(config.id);
    }
    this._save();
  }

  updateConfig(id: string, patch: Partial<PrinterConfig>): void {
    const cfg = this.configs.get(id);
    if (!cfg) return;
    this.configs.set(id, { ...cfg, ...patch });
    this._save();
  }

  removeConfig(id: string): void {
    this.configs.delete(id);
    this.devices.delete(id);
    const driver = this.drivers.get(id);
    if (driver) { driver.disconnect().catch(() => {}); this.drivers.delete(id); }
    if (this.defaultId === id) {
      this.defaultId = this.configs.keys().next().value ?? null;
      saveDefaultId(this.defaultId);
    }
    this._save();
  }

  setDefault(id: string): void {
    this.defaultId = id;
    for (const [cid, cfg] of this.configs) {
      this.configs.set(cid, { ...cfg, isDefault: cid === id });
    }
    saveDefaultId(id);
    this._save();
  }

  getDefaultId(): string | null { return this.defaultId; }

  getDefaultConfig(): PrinterConfig | null {
    return this.defaultId ? (this.configs.get(this.defaultId) ?? null) : null;
  }

  // ── Device status ────────────────────────────────────────

  getDevices(): PrinterDevice[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): PrinterDevice | null {
    return this.devices.get(id) ?? null;
  }

  private _setStatus(id: string, status: PrinterStatus, error?: string) {
    const cfg = this.configs.get(id);
    if (!cfg) return;
    const existing = this.devices.get(id);
    const device: PrinterDevice = {
      ...existing,
      id,
      name: cfg.name,
      connectionType: cfg.connectionType,
      status,
      config: cfg,
      lastError: error,
    };
    this.devices.set(id, device);
    this.emit({ type: "status-changed", printerId: id, status });
    if (error) this.emit({ type: "error", printerId: id, message: error });
  }

  // ── Connect / Disconnect ─────────────────────────────────

  async connect(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config) throw new Error(`Printer config "${id}" tidak ditemukan.`);

    this._setStatus(id, "connecting");
    this._cancelReconnect(id);

    let driver = this.drivers.get(id);
    if (!driver) {
      driver = makeDriver(config.connectionType);
      this.drivers.set(id, driver);
    }

    try {
      await driver.connect(config);
      // Save any device IDs discovered during connect (USB)
      if (config.connectionType === "usb") {
        const ids = (driver as UsbPrinterService).getDeviceIds();
        if (ids) this.updateConfig(id, { usbVendorId: ids.vendorId, usbProductId: ids.productId });
      }
      this._setStatus(id, "connected");
    } catch (err: any) {
      this._setStatus(id, "error", err?.message ?? String(err));
      throw err;
    }
  }

  async disconnect(id: string): Promise<void> {
    this._cancelReconnect(id);
    const driver = this.drivers.get(id);
    if (driver) {
      try { await driver.disconnect(); } catch {}
    }
    this._setStatus(id, "disconnected");
  }

  isConnected(id: string): boolean {
    return this.drivers.get(id)?.isConnected() ?? false;
  }

  // ── Send / Print ─────────────────────────────────────────

  async send(id: string, data: Uint8Array): Promise<void> {
    const driver = this.drivers.get(id);
    if (!driver) throw new Error("Driver printer tidak ditemukan.");
    if (!driver.isConnected()) {
      // Try auto-reconnect once
      await this.connect(id);
    }
    this._setStatus(id, "printing");
    try {
      await driver.send(data);
      this._setStatus(id, "connected");
      const dev = this.devices.get(id);
      if (dev) this.devices.set(id, { ...dev, lastPrintAt: Date.now() });
    } catch (err: any) {
      this._setStatus(id, "error", err?.message ?? String(err));
      throw err;
    }
  }

  async sendToDefault(data: Uint8Array): Promise<void> {
    const id = this.defaultId;
    if (!id) throw new Error("Tidak ada printer default. Tambahkan printer terlebih dahulu.");
    await this.send(id, data);
  }

  // ── Auto-reconnect ───────────────────────────────────────

  scheduleReconnect(id: string, delayMs = 5000): void {
    this._cancelReconnect(id);
    const t = setTimeout(async () => {
      if (this.isConnected(id)) return;
      try { await this.connect(id); }
      catch { this.scheduleReconnect(id, Math.min(delayMs * 2, 60_000)); }
    }, delayMs);
    this.reconnectTimers.set(id, t);
  }

  private _cancelReconnect(id: string) {
    const t = this.reconnectTimers.get(id);
    if (t) { clearTimeout(t); this.reconnectTimers.delete(id); }
  }

  /** Auto-connect to all configured printers that support silent reconnect (USB/Network) */
  async autoConnectAll(): Promise<void> {
    for (const [id, cfg] of this.configs) {
      if (cfg.connectionType === "usb" || cfg.connectionType === "network") {
        try { await this.connect(id); }
        catch { /* silent — will show as disconnected in UI */ }
      }
    }
  }

  // ── Discovery ────────────────────────────────────────────

  async discover(): Promise<DiscoveredDevice[]> {
    const results: DiscoveredDevice[] = [];
    const types: PrinterConnectionType[] = ["usb", "serial"];
    for (const type of types) {
      const driver = makeDriver(type);
      if (driver.isSupported() && driver.discover) {
        try {
          const found = await driver.discover();
          results.push(...found);
        } catch {}
      }
    }
    this.emit({ type: "discovered", devices: results });
    return results;
  }

  // ── Capability checks ────────────────────────────────────

  isTypeSupported(type: PrinterConnectionType): boolean {
    return makeDriver(type).isSupported();
  }
}

export const printerManager = new PrinterManager();
