// ============================================================
// Printer System — Shared Types & Interfaces
// ============================================================

// ── Connection types ─────────────────────────────────────────
export type PrinterConnectionType = "usb" | "bluetooth" | "serial" | "network";

// ── Printer status ────────────────────────────────────────────
export type PrinterStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error"
  | "offline";

// ── Paper sizes ───────────────────────────────────────────────
export type PaperWidth = "58" | "80";

// ── Saved printer configuration ───────────────────────────────
export interface PrinterConfig {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  paper: PaperWidth;
  isDefault: boolean;
  createdAt: number;
  // USB
  usbVendorId?: number;
  usbProductId?: number;
  // Serial / Bluetooth COM
  serialPort?: string;    // e.g. "COM3" or device path
  baudRate?: number;      // default 9600
  // Network
  networkHost?: string;   // IP address
  networkPort?: number;   // default 9100
  // Bluetooth
  btDeviceId?: string;
  btDeviceName?: string;
}

// ── Live device info ──────────────────────────────────────────
export interface PrinterDevice {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  status: PrinterStatus;
  config: PrinterConfig;
  lastError?: string;
  lastPrintAt?: number;
}

// ── Print job ─────────────────────────────────────────────────
export type PrintJobStatus = "pending" | "printing" | "done" | "failed" | "cancelled";

export interface PrintJob {
  id: string;
  printerId: string;
  data: Uint8Array;
  label?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  status: PrintJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

// ── Print result ──────────────────────────────────────────────
export type PrintResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string; retryable: boolean };

// ── Driver interface (Strategy pattern) ──────────────────────
export interface IPrinterDriver {
  readonly type: PrinterConnectionType;
  isSupported(): boolean;
  isConnected(): boolean;
  connect(config: PrinterConfig): Promise<void>;
  disconnect(): Promise<void>;
  send(data: Uint8Array): Promise<void>;
  /** Optional: return list of available devices for this transport */
  discover?(): Promise<DiscoveredDevice[]>;
}

// ── Device discovery ──────────────────────────────────────────
export interface DiscoveredDevice {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  /** Pre-filled config fields for this discovered device */
  suggestedConfig: Partial<PrinterConfig>;
}

// ── Events emitted by PrinterManager ─────────────────────────
export type PrinterEvent =
  | { type: "status-changed"; printerId: string; status: PrinterStatus }
  | { type: "job-queued"; job: PrintJob }
  | { type: "job-started"; job: PrintJob }
  | { type: "job-done"; job: PrintJob }
  | { type: "job-failed"; job: PrintJob; error: string }
  | { type: "error"; printerId: string; message: string }
  | { type: "discovered"; devices: DiscoveredDevice[] };

export type PrinterEventListener = (event: PrinterEvent) => void;
