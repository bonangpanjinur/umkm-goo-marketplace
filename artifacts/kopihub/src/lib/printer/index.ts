// ============================================================
// Printer system — barrel export
// ============================================================

// Types
export type {
  PrinterConfig,
  PrinterDevice,
  PrinterConnectionType,
  PrinterStatus,
  PaperWidth,
  PrintJob,
  PrintJobStatus,
  PrintResult,
  DiscoveredDevice,
  IPrinterDriver,
} from "./types";

// ESC/POS builder
export {
  EscPosBuilder,
  buildReceiptBytes,
  formatCurrency,
  makeDivider,
  padBetween,
  padCenter,
  concatBytes,
  CMD,
  PAPER_CHARS,
} from "./escpos/builder";
export type { ReceiptData, ReceiptItem } from "./escpos/builder";

// Services (individual drivers)
export { UsbPrinterService } from "./services/usb";
export { BluetoothPrinterService } from "./services/bluetooth";
export { SerialPrinterService } from "./services/serial";
export { NetworkPrinterService } from "./services/network";

// Manager (singleton)
export { printerManager } from "./manager/printerManager";

// Queue (singleton)
export { printQueue } from "./queue/printQueue";

// Zustand store
export { usePrinterStore } from "./store/printerStore";

// Hook
export { usePrinter } from "./hooks/usePrinter";
