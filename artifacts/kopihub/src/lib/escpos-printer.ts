// ============================================================
// ESC/POS thermal printing via Web Serial & Web Bluetooth.
// Tujuan: setelah user "Pilih Printer" sekali, klik "Cetak"
// langsung kirim ke printer thermal — TANPA dialog browser.
// ============================================================

import type { ReceiptPaper } from "@/lib/receipt-printer";

const BT_SERVICE = 0x18f0; // standar service untuk banyak BT thermal printer (RPP/MTP/dll)
const BT_CHAR = 0x2af1;

const PORT_BAUD_KEY = "umkmgo.escposBaud";
const MODE_KEY = "umkmgo.escposMode"; // "serial" | "bluetooth" | "none"

export type EscPosMode = "serial" | "bluetooth" | "none";

export function getPreferredMode(): EscPosMode {
  if (typeof window === "undefined") return "none";
  const v = window.localStorage.getItem(MODE_KEY);
  if (v === "serial" || v === "bluetooth") return v;
  return "none";
}
export function setPreferredMode(m: EscPosMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_KEY, m);
}

export function getBaudRate(): number {
  if (typeof window === "undefined") return 9600;
  const v = Number(window.localStorage.getItem(PORT_BAUD_KEY) ?? 9600);
  return Number.isFinite(v) && v > 0 ? v : 9600;
}
export function setBaudRate(b: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORT_BAUD_KEY, String(b));
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

// ============================================================
// ESC/POS encoder
// ============================================================

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function widthChars(paper: ReceiptPaper) {
  return paper === "80" ? 48 : 32;
}

function ascii(s: string): Uint8Array {
  // Convert string to bytes (CP437-friendly). Non-ASCII → '?'.
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c < 128 ? c : "?".charCodeAt(0);
  }
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function wrapWords(s: string, w: number): string[] {
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return [""];
  const out: string[] = [];
  const words = s.split(" ");
  let line = "";
  for (const word of words) {
    if (word.length > w) {
      // hard split very long token
      if (line) { out.push(line); line = ""; }
      let rest = word;
      while (rest.length > w) {
        out.push(rest.slice(0, w));
        rest = rest.slice(w);
      }
      line = rest;
      continue;
    }
    const tentative = line ? line + " " + word : word;
    if (tentative.length > w) {
      out.push(line);
      line = word;
    } else {
      line = tentative;
    }
  }
  if (line) out.push(line);
  return out;
}

function padBetween(left: string, right: string, w: number): string {
  left = left.replace(/\s+/g, " ").trim();
  right = right.replace(/\s+/g, " ").trim();
  // Reserve right column; wrap left into remaining width.
  const rightW = Math.min(right.length, w);
  const leftW = Math.max(1, w - rightW - 1);
  if (left.length <= leftW) {
    const space = w - left.length - right.length;
    return left + " ".repeat(Math.max(1, space)) + right;
  }
  const lines = wrapWords(left, leftW);
  const last = lines.pop() as string;
  const space = w - last.length - right.length;
  const lastLine = last + " ".repeat(Math.max(1, space)) + right;
  return [...lines, lastLine].join("\n");
}

function centerLine(s: string, w: number): string {
  s = s.replace(/\s+/g, " ").trim();
  const lines = wrapWords(s, w);
  return lines
    .map((ln) => {
      if (ln.length >= w) return ln;
      const pad = Math.floor((w - ln.length) / 2);
      return " ".repeat(pad) + ln;
    })
    .join("\n");
}

function leftLines(s: string, w: number, indent = 0): string {
  const ind = " ".repeat(indent);
  const eff = Math.max(1, w - indent);
  return wrapWords(s, eff).map((ln) => ind + ln).join("\n");
}

// Walk a rendered Receipt DOM (uses r-row, r-center, r-bold, r-divider, r-item, r-small)
// and produce ESC/POS byte stream.
export function buildEscPosFromReceiptDom(root: HTMLElement, paper: ReceiptPaper): Uint8Array {
  const w = widthChars(paper);
  const chunks: Uint8Array[] = [];

  // init + select font A
  chunks.push(new Uint8Array([ESC, 0x40]));
  chunks.push(new Uint8Array([ESC, 0x21, 0x00]));

  const setBold = (on: boolean) => chunks.push(new Uint8Array([ESC, 0x45, on ? 1 : 0]));
  const setAlign = (n: 0 | 1 | 2) => chunks.push(new Uint8Array([ESC, 0x61, n]));
  const setSize = (doubleHeight: boolean) =>
    chunks.push(new Uint8Array([GS, 0x21, doubleHeight ? 0x01 : 0x00]));

  const writeLine = (text: string) => {
    for (const part of text.split("\n")) {
      chunks.push(ascii(part));
      chunks.push(new Uint8Array([LF]));
    }
  };

  const txt = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

  const walk = (el: Element) => {
    const cls = el.classList;
    if (cls.contains("r-divider")) {
      writeLine("-".repeat(w));
      return;
    }
    if (cls.contains("r-row")) {
      const kids = Array.from(el.children).filter((c) => c.tagName === "SPAN" || c.tagName === "DIV");
      const isBold = cls.contains("r-bold");
      if (isBold) setBold(true);
      if (kids.length >= 2) {
        const left = txt(kids[0]);
        const right = txt(kids[kids.length - 1]);
        writeLine(padBetween(left, right, w));
      } else {
        writeLine(txt(el));
      }
      if (isBold) setBold(false);
      return;
    }
    if (cls.contains("r-center")) {
      const isBold = cls.contains("r-bold");
      if (isBold) {
        setBold(true);
        setSize(true);
      }
      setAlign(1);
      writeLine(centerLine(txt(el), isBold ? Math.floor(w / 2) : w));
      setAlign(0);
      if (isBold) {
        setSize(false);
        setBold(false);
      }
      return;
    }
    if (cls.contains("r-item")) {
      // recurse children
      for (const child of Array.from(el.children)) walk(child);
      return;
    }
    if (cls.contains("r-small")) {
      // print as left-aligned plain
      writeLine(txt(el));
      return;
    }
    // Generic container: if it has element children, recurse; else print text.
    const elChildren = Array.from(el.children);
    if (elChildren.length > 0) {
      for (const child of elChildren) walk(child);
    } else {
      const t = txt(el);
      if (t) writeLine(t);
    }
  };

  // root might itself be the receipt container — walk its children
  const children = Array.from(root.children);
  if (children.length === 0) {
    writeLine(txt(root));
  } else {
    for (const c of children) walk(c);
  }

  // feed + cut
  chunks.push(new Uint8Array([LF, LF, LF, LF]));
  chunks.push(new Uint8Array([GS, 0x56, 0x42, 0x00])); // full cut (printer w/o cutter will ignore)

  return concat(chunks);
}

// ============================================================
// Web Serial transport
// ============================================================

async function getSavedSerialPort(): Promise<any | null> {
  if (!isWebSerialSupported()) return null;
  try {
    const ports = await (navigator as any).serial.getPorts();
    return ports?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function pickSerialPort(): Promise<boolean> {
  if (!isWebSerialSupported()) throw new Error("Browser tidak mendukung Web Serial. Pakai Chrome/Edge desktop.");
  const port = await (navigator as any).serial.requestPort();
  if (!port) return false;
  // try opening once to validate baud
  try {
    await port.open({ baudRate: getBaudRate() });
    await port.close();
  } catch {
    /* ignore; will retry on print */
  }
  setPreferredMode("serial");
  return true;
}

async function writeToSerial(bytes: Uint8Array): Promise<void> {
  const port = await getSavedSerialPort();
  if (!port) throw new Error("Belum ada printer Serial yang dipilih.");
  await port.open({ baudRate: getBaudRate() });
  try {
    const writer = port.writable.getWriter();
    try {
      await writer.write(bytes);
    } finally {
      await writer.close();
    }
  } finally {
    try {
      await port.close();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// Web Bluetooth transport
// ============================================================

let cachedBtChar: any | null = null;

export async function pickBluetoothPrinter(): Promise<boolean> {
  if (!isWebBluetoothSupported()) throw new Error("Browser tidak mendukung Web Bluetooth.");
  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [{ services: [BT_SERVICE] }],
    optionalServices: [BT_SERVICE],
  });
  if (!device) return false;
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(BT_SERVICE);
  const ch = await svc.getCharacteristic(BT_CHAR);
  cachedBtChar = ch;
  setPreferredMode("bluetooth");
  return true;
}

async function writeToBluetooth(bytes: Uint8Array): Promise<void> {
  if (!cachedBtChar) {
    // attempt re-pick prompt
    throw new Error("Printer Bluetooth belum terhubung. Klik 'Pilih Printer' lagi.");
  }
  // Write in 100-byte chunks (banyak BT printer punya MTU kecil)
  const CHUNK = 100;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    await cachedBtChar.writeValue(slice);
  }
}

// ============================================================
// Public API
// ============================================================

export type EscPosPrintResult = "ok" | "no-device" | "unsupported" | { error: string };

export async function printReceiptEscPos(
  node: HTMLElement | null,
  paper: ReceiptPaper,
): Promise<EscPosPrintResult> {
  if (!node) return { error: "Tidak ada konten struk" };
  const mode = getPreferredMode();
  if (mode === "none") return "no-device";
  const bytes = buildEscPosFromReceiptDom(node, paper);
  try {
    if (mode === "serial") {
      if (!isWebSerialSupported()) return "unsupported";
      const port = await getSavedSerialPort();
      if (!port) return "no-device";
      await writeToSerial(bytes);
      return "ok";
    }
    if (mode === "bluetooth") {
      if (!isWebBluetoothSupported()) return "unsupported";
      await writeToBluetooth(bytes);
      return "ok";
    }
    return "no-device";
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export async function hasReadyPrinter(): Promise<boolean> {
  const mode = getPreferredMode();
  if (mode === "serial") return !!(await getSavedSerialPort());
  if (mode === "bluetooth") return !!cachedBtChar;
  return false;
}

export function forgetPrinter() {
  cachedBtChar = null;
  setPreferredMode("none");
}
