// ============================================================
// useUsbPrinter — React hook for WebUSB thermal printer
// Wraps printerService with React state + lifecycle.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { printerService, type PrinterInfo, type PrinterStatus } from "@/lib/printer/printerService";

export type UsbPrinterState = {
  status: PrinterStatus;
  deviceInfo: PrinterInfo | null;
  lastError: string | null;
  isSupported: boolean;
  isConnected: boolean;
  isPrinting: boolean;
};

export type UsbPrinterActions = {
  requestDevice: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  autoReconnect: () => Promise<boolean>;
  send: (bytes: Uint8Array) => Promise<void>;
  clearError: () => void;
};

export function useUsbPrinter(): UsbPrinterState & UsbPrinterActions {
  const [status, setStatus] = useState<PrinterStatus>(printerService.getStatus());
  const [deviceInfo, setDeviceInfo] = useState<PrinterInfo | null>(printerService.getDeviceInfo());
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectedRef = useRef(false);

  useEffect(() => {
    const unsub = printerService.on((event) => {
      switch (event.type) {
        case "status":
          setStatus(event.status);
          break;
        case "error":
          setLastError(event.message);
          setStatus(printerService.getStatus());
          break;
        case "printer-info":
          setDeviceInfo(event.info);
          break;
        case "print-done":
          break;
      }
    });

    if (!reconnectedRef.current) {
      reconnectedRef.current = true;
      printerService.autoReconnect().then((ok) => {
        if (ok) setDeviceInfo(printerService.getDeviceInfo());
      });
    }

    return unsub;
  }, []);

  const requestDevice = useCallback(async (): Promise<boolean> => {
    setLastError(null);
    const ok = await printerService.requestDevice();
    if (ok) setDeviceInfo(printerService.getDeviceInfo());
    return ok;
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    await printerService.disconnect();
    setDeviceInfo(null);
  }, []);

  const autoReconnect = useCallback(async (): Promise<boolean> => {
    setLastError(null);
    const ok = await printerService.autoReconnect();
    if (ok) setDeviceInfo(printerService.getDeviceInfo());
    return ok;
  }, []);

  const send = useCallback(async (bytes: Uint8Array): Promise<void> => {
    setLastError(null);
    await printerService.print(bytes);
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    status,
    deviceInfo,
    lastError,
    isSupported: printerService.isSupported(),
    isConnected: printerService.isConnected(),
    isPrinting: status === "printing",
    requestDevice,
    disconnect,
    autoReconnect,
    send,
    clearError,
  };
}
