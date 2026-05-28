// ============================================================
// USB Printer Service — WebUSB (navigator.usb)
// Works in Electron renderer and Chrome/Edge desktop.
// ============================================================

import type { IPrinterDriver, PrinterConfig, DiscoveredDevice } from "../types";

const PRINTER_CLASS = 0x07;

export class UsbPrinterService implements IPrinterDriver {
  readonly type = "usb" as const;

  private device: USBDevice | null = null;
  private endpointNumber = 1;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "usb" in navigator;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  async connect(config: PrinterConfig): Promise<void> {
    if (!this.isSupported()) throw new Error("WebUSB tidak didukung di browser ini.");

    let device: USBDevice | null = null;

    if (config.usbVendorId && config.usbProductId) {
      const devices = await navigator.usb.getDevices();
      device = devices.find(
        d => d.vendorId === config.usbVendorId && d.productId === config.usbProductId
      ) ?? null;
    }

    if (!device) {
      device = await navigator.usb.requestDevice({
        filters: [
          { classCode: PRINTER_CLASS },
          { classCode: 0xff },
        ],
      });
    }

    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);

    const iface = this._findInterface(device);
    if (!iface) { await device.close(); throw new Error("Interface printer tidak ditemukan."); }

    await device.claimInterface(iface.interfaceNumber);
    this.endpointNumber = this._findBulkOut(iface);
    this.device = device;

    device.addEventListener("disconnect", () => { this.device = null; });
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;
    try { await this.device.close(); } catch {}
    this.device = null;
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.device) throw new Error("USB printer tidak terhubung.");
    const CHUNK = 4096;
    for (let off = 0; off < data.length; off += CHUNK) {
      const chunk = data.slice(off, off + CHUNK);
      const r = await this.device.transferOut(this.endpointNumber, chunk);
      if (r.status !== "ok") throw new Error(`USB transfer gagal: ${r.status}`);
    }
  }

  async discover(): Promise<DiscoveredDevice[]> {
    if (!this.isSupported()) return [];
    const devices = await navigator.usb.getDevices();
    return devices.map(d => ({
      id: `usb-${d.vendorId}-${d.productId}`,
      name: d.productName ?? `USB Printer (${d.vendorId}:${d.productId})`,
      connectionType: "usb" as const,
      suggestedConfig: {
        usbVendorId: d.vendorId,
        usbProductId: d.productId,
        name: d.productName ?? "USB Printer",
      },
    }));
  }

  /** Return vendorId/productId of currently connected device */
  getDeviceIds(): { vendorId: number; productId: number } | null {
    if (!this.device) return null;
    return { vendorId: this.device.vendorId, productId: this.device.productId };
  }

  private _findInterface(device: USBDevice): USBInterface | null {
    const config = device.configuration;
    if (!config) return null;
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === PRINTER_CLASS || alt.interfaceClass === 0xff) return iface;
      }
    }
    return config.interfaces[0] ?? null;
  }

  private _findBulkOut(iface: USBInterface): number {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === "out" && ep.type === "bulk") return ep.endpointNumber;
      }
    }
    return 1;
  }
}
