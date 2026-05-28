// ============================================================
// Printer Zustand Store
// Single source of truth for all printer state in the React app.
// ============================================================

import { create } from "zustand";
import type {
  PrinterConfig,
  PrinterDevice,
  PrintJob,
  PrinterConnectionType,
  DiscoveredDevice,
  PaperWidth,
} from "../types";
import { printerManager } from "../manager/printerManager";
import { printQueue } from "../queue/printQueue";
import { buildReceiptBytes, type ReceiptData } from "../escpos/builder";
import { nanoid } from "../utils/nanoid";

// ── State shape ───────────────────────────────────────────────

export interface PrinterStoreState {
  configs: PrinterConfig[];
  devices: PrinterDevice[];
  jobs: PrintJob[];
  discovered: DiscoveredDevice[];
  isScanning: boolean;
  defaultId: string | null;

  // Actions
  addPrinter: (config: Omit<PrinterConfig, "id" | "createdAt">) => string;
  removePrinter: (id: string) => void;
  updatePrinter: (id: string, patch: Partial<PrinterConfig>) => void;
  setDefault: (id: string) => void;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  scan: () => Promise<void>;
  print: (printerId: string, data: Uint8Array, label?: string) => string;
  printReceipt: (receipt: ReceiptData, printerId?: string) => string;
  printToDefault: (data: Uint8Array, label?: string) => string;
  clearCompleted: () => void;
  refresh: () => void;
}

// ── Store ─────────────────────────────────────────────────────

export const usePrinterStore = create<PrinterStoreState>((set, get) => {
  // Subscribe to printerManager events
  printerManager.on((event) => {
    switch (event.type) {
      case "status-changed":
      case "error":
        set({ devices: printerManager.getDevices() });
        break;
      case "discovered":
        set({ discovered: event.devices, isScanning: false });
        break;
    }
  });

  // Subscribe to queue changes
  printQueue.subscribe((jobs) => set({ jobs }));

  return {
    configs: printerManager.getConfigs(),
    devices: printerManager.getDevices(),
    jobs: [],
    discovered: [],
    isScanning: false,
    defaultId: printerManager.getDefaultId(),

    addPrinter(config) {
      const id = nanoid();
      const full: PrinterConfig = {
        ...config,
        id,
        createdAt: Date.now(),
        isDefault: config.isDefault ?? get().configs.length === 0,
      };
      printerManager.addConfig(full);
      set({ configs: printerManager.getConfigs(), defaultId: printerManager.getDefaultId() });
      return id;
    },

    removePrinter(id) {
      printerManager.removeConfig(id);
      set({ configs: printerManager.getConfigs(), devices: printerManager.getDevices(), defaultId: printerManager.getDefaultId() });
    },

    updatePrinter(id, patch) {
      printerManager.updateConfig(id, patch);
      set({ configs: printerManager.getConfigs() });
    },

    setDefault(id) {
      printerManager.setDefault(id);
      set({ configs: printerManager.getConfigs(), defaultId: id });
    },

    async connect(id) {
      await printerManager.connect(id);
      set({ devices: printerManager.getDevices() });
    },

    async disconnect(id) {
      await printerManager.disconnect(id);
      set({ devices: printerManager.getDevices() });
    },

    async scan() {
      set({ isScanning: true });
      try {
        const found = await printerManager.discover();
        set({ discovered: found });
      } finally {
        set({ isScanning: false });
      }
    },

    print(printerId, data, label) {
      return printQueue.enqueue(printerId, data, { label });
    },

    printReceipt(receipt, printerId) {
      const id = printerId ?? get().defaultId;
      if (!id) throw new Error("Tidak ada printer default.");
      const cfg = printerManager.getConfig(id);
      const paper: PaperWidth = cfg?.paper ?? "58";
      const bytes = buildReceiptBytes({ ...receipt, paper });
      return printQueue.enqueue(id, bytes, { label: `Struk #${receipt.orderId ?? "–"}` });
    },

    printToDefault(data, label) {
      const id = get().defaultId;
      if (!id) throw new Error("Tidak ada printer default.");
      return printQueue.enqueue(id, data, { label });
    },

    clearCompleted() {
      printQueue.clearCompleted();
    },

    refresh() {
      set({
        configs: printerManager.getConfigs(),
        devices: printerManager.getDevices(),
        defaultId: printerManager.getDefaultId(),
      });
    },
  };
});
