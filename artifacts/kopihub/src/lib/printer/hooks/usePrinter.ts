// ============================================================
// usePrinter — convenience React hook
// Wraps usePrinterStore with ergonomic selectors.
// ============================================================

import { useMemo } from "react";
import { usePrinterStore } from "../store/printerStore";
import type { PrinterConfig, PrinterDevice, PrintJob } from "../types";
import { printerManager } from "../manager/printerManager";

export function usePrinter() {
  const store = usePrinterStore();

  const defaultDevice = useMemo<PrinterDevice | undefined>(
    () => store.devices.find(d => d.id === store.defaultId),
    [store.devices, store.defaultId],
  );

  const defaultConfig = useMemo<PrinterConfig | undefined>(
    () => store.configs.find(c => c.id === store.defaultId),
    [store.configs, store.defaultId],
  );

  const pendingJobs = useMemo<PrintJob[]>(
    () => store.jobs.filter(j => j.status === "pending" || j.status === "printing"),
    [store.jobs],
  );

  const isDefaultConnected = defaultDevice?.status === "connected" || defaultDevice?.status === "printing";
  const isPrinting = store.jobs.some(j => j.status === "printing");

  return {
    // State
    configs: store.configs,
    devices: store.devices,
    jobs: store.jobs,
    pendingJobs,
    discovered: store.discovered,
    isScanning: store.isScanning,
    defaultId: store.defaultId,
    defaultConfig,
    defaultDevice,
    isDefaultConnected,
    isPrinting,

    // Supported transports
    supported: {
      usb: printerManager.isTypeSupported("usb"),
      bluetooth: printerManager.isTypeSupported("bluetooth"),
      serial: printerManager.isTypeSupported("serial"),
      network: true,
    },

    // Actions (passthrough)
    addPrinter: store.addPrinter,
    removePrinter: store.removePrinter,
    updatePrinter: store.updatePrinter,
    setDefault: store.setDefault,
    connect: store.connect,
    disconnect: store.disconnect,
    scan: store.scan,
    print: store.print,
    printReceipt: store.printReceipt,
    printToDefault: store.printToDefault,
    clearCompleted: store.clearCompleted,
    refresh: store.refresh,
  };
}

// Re-export types for consumers
export type { PrinterConfig, PrinterDevice, PrintJob };
