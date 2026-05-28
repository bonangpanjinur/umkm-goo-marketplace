// ============================================================
// Bluetooth Printer Service — Web Bluetooth (navigator.bluetooth)
// Works in Electron renderer and Chrome desktop.
// Supports: RPP, MTP, and generic BT thermal printers.
// ============================================================

import type { IPrinterDriver, PrinterConfig, DiscoveredDevice } from "../types";

// Standard service/characteristic UUIDs for BT thermal printers
const BT_SERVICES = [
  0x18f0, // most common BT POS printers (RPP/MTP/Rongta)
  "000018f0-0000-1000-8000-00805f9b34fb",
];
const BT_CHARS = [
  0x2af1,
  "00002af1-0000-1000-8000-00805f9b34fb",
];
const CHUNK_SIZE = 100; // BT printers have small MTU

export class BluetoothPrinterService implements IPrinterDriver {
  readonly type = "bluetooth" as const;

  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  isConnected(): boolean {
    return this.characteristic !== null && (this.device?.gatt?.connected ?? false);
  }

  async connect(config: PrinterConfig): Promise<void> {
    if (!this.isSupported()) throw new Error("Web Bluetooth tidak didukung di browser ini.");

    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        ...(config.btDeviceName ? [{ name: config.btDeviceName }] : []),
        { services: [BT_SERVICES[0]] },
      ],
      optionalServices: BT_SERVICES,
    });

    const server = await device.gatt!.connect();
    let service: BluetoothRemoteGATTService | null = null;
    for (const svcId of BT_SERVICES) {
      try { service = await server.getPrimaryService(svcId); break; } catch {}
    }
    if (!service) throw new Error("GATT service printer tidak ditemukan.");

    let char: BluetoothRemoteGATTCharacteristic | null = null;
    for (const charId of BT_CHARS) {
      try { char = await service.getCharacteristic(charId); break; } catch {}
    }
    if (!char) throw new Error("GATT characteristic printer tidak ditemukan.");

    this.device = device;
    this.characteristic = char;

    device.addEventListener("gattserverdisconnected", () => {
      this.characteristic = null;
    });
  }

  async disconnect(): Promise<void> {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.characteristic = null;
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error("Bluetooth printer tidak terhubung.");
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      await this.characteristic.writeValue(data.slice(i, i + CHUNK_SIZE));
      // Small delay for printer buffer
      await new Promise(r => setTimeout(r, 10));
    }
  }

  async discover(): Promise<DiscoveredDevice[]> {
    // Web Bluetooth requires user gesture to scan; just return empty for discovery
    return [];
  }

  getDeviceInfo(): { id: string; name: string } | null {
    if (!this.device) return null;
    return { id: this.device.id, name: this.device.name ?? "BT Printer" };
  }
}
