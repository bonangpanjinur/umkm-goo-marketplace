// ============================================================
// ESC/POS Builder — complete command set
// Supports: text, bold, align, size, divider, row layout,
// barcode (Code128), QR code, image bitmap, cash drawer, cut.
// No DOM dependency — pure Uint8Array construction.
// ============================================================

import type { PaperWidth } from "../types";

export type { PaperWidth };

export const PAPER_CHARS: Record<PaperWidth, number> = {
  "58": 32,
  "80": 48,
};

// ── Raw bytes ─────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const NUL = 0x00;

// ── ESC/POS commands ──────────────────────────────────────────
export const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  FONT_A: new Uint8Array([ESC, 0x4d, 0x00]),
  FONT_B: new Uint8Array([ESC, 0x4d, 0x01]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2d, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2d, 0x00]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  SIZE_NORMAL: new Uint8Array([GS, 0x21, 0x00]),
  SIZE_DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x01]),
  SIZE_DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x10]),
  SIZE_DOUBLE: new Uint8Array([GS, 0x21, 0x11]),
  CUT_FULL: new Uint8Array([GS, 0x56, 0x42, 0x00]),
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x42, 0x01]),
  CASH_DRAWER_1: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]), // pin 2
  CASH_DRAWER_2: new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xfa]), // pin 5
  LINE_FEED: new Uint8Array([LF]),
  HW_INIT: new Uint8Array([ESC, 0x40]),
} as const;

// ── Helpers ───────────────────────────────────────────────────

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

const TRANSLIT: Record<string, string> = {
  à:"a",á:"a",â:"a",ã:"a",ä:"a",å:"a",
  è:"e",é:"e",ê:"e",ë:"e",
  ì:"i",í:"i",î:"i",ï:"i",
  ò:"o",ó:"o",ô:"o",õ:"o",ö:"o",
  ù:"u",ú:"u",û:"u",ü:"u",
  ç:"c",ñ:"n",
  À:"A",Á:"A",Â:"A",Ã:"A",Ä:"A",Å:"A",
  È:"E",É:"E",Ê:"E",Ë:"E",
  Ì:"I",Í:"I",Î:"I",Ï:"I",
  Ò:"O",Ó:"O",Ô:"O",Õ:"O",Ö:"O",
  Ù:"U",Ú:"U",Û:"U",Ü:"U",
  Ç:"C",Ñ:"N",
};

function encodeText(text: string): Uint8Array {
  const s = text.split("").map(c => TRANSLIT[c] ?? c).join("");
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c < 256 ? c : 0x3f;
  }
  return out;
}

function textLine(text: string): Uint8Array {
  return concatBytes(encodeText(text), CMD.LINE_FEED);
}

function wrapWords(text: string, width: number): string[] {
  text = text.trim();
  if (text.length <= width) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (trial.length <= width) { cur = trial; }
    else { if (cur) lines.push(cur); cur = w.slice(0, width); }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [""];
}

// ── Formatting helpers (exported) ─────────────────────────────

export function formatCurrency(amount: number, prefix = "Rp"): string {
  return `${prefix} ${amount.toLocaleString("id-ID")}`;
}

export function makeDivider(width: number, char = "-"): string {
  return char.repeat(width);
}

export function padBetween(left: string, right: string, width: number): string {
  left = left.trim(); right = right.trim();
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

export function padCenter(text: string, width: number): string {
  text = text.trim();
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}

// ── QR Code ESC/POS ──────────────────────────────────────────

function buildQrBytes(content: string, size = 6): Uint8Array {
  const data = new TextEncoder().encode(content);
  const len = data.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;
  const parts: Uint8Array[] = [
    // Model
    new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, NUL]),
    // Size (module size 1–8)
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.max(1, Math.min(8, size))]),
    // Error correction level M
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),
    // Store data
    new Uint8Array([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    data,
    // Print
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
  ];
  return concatBytes(...parts);
}

// ── Barcode (Code128) ─────────────────────────────────────────

function buildBarcodeCode128(content: string, height = 60): Uint8Array {
  const data = encodeText(content);
  const parts: Uint8Array[] = [
    new Uint8Array([GS, 0x68, height]),            // barcode height
    new Uint8Array([GS, 0x77, 0x02]),              // barcode width (1–6)
    new Uint8Array([GS, 0x48, 0x02]),              // HRI position: below
    new Uint8Array([GS, 0x6b, 0x49, data.length]), // CODE128 type
    data,
    new Uint8Array([NUL]),
  ];
  return concatBytes(...parts);
}

// ── 1-bit image printing (bitmap) ────────────────────────────
// canvas → ImageData → ESC/POS raster

export type PrintableImage = {
  width: number;   // pixels
  height: number;
  data: Uint8ClampedArray; // RGBA
};

function buildImageBytes(img: PrintableImage): Uint8Array {
  const { width, height, data } = img;
  const byteWidth = Math.ceil(width / 8);
  const parts: Uint8Array[] = [];

  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(byteWidth);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 128) row[Math.floor(x / 8)] |= (0x80 >> (x % 8));
    }
    // ESC * m nL nH + data (mode 0 = 8-dot single density)
    parts.push(new Uint8Array([
      ESC, 0x2a, 0x00,
      byteWidth & 0xff, (byteWidth >> 8) & 0xff,
      ...row,
      LF,
    ]));
  }
  return concatBytes(...parts);
}

// ── EscPosBuilder — fluent API ────────────────────────────────

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];
  readonly width: number;
  readonly paper: PaperWidth;

  constructor(paper: PaperWidth = "58") {
    this.paper = paper;
    this.width = PAPER_CHARS[paper];
    this.push(CMD.INIT, CMD.FONT_A, CMD.SIZE_NORMAL, CMD.ALIGN_LEFT);
  }

  private push(...parts: Uint8Array[]): this {
    for (const p of parts) this.chunks.push(p);
    return this;
  }

  // ── Styles ────────────────────────────────────────────────

  bold(on = true): this { return this.push(on ? CMD.BOLD_ON : CMD.BOLD_OFF); }
  underline(on = true): this { return this.push(on ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF); }

  size(mode: "normal" | "double" | "doubleWidth" | "doubleHeight" = "normal"): this {
    const map = {
      normal: CMD.SIZE_NORMAL,
      double: CMD.SIZE_DOUBLE,
      doubleWidth: CMD.SIZE_DOUBLE_WIDTH,
      doubleHeight: CMD.SIZE_DOUBLE_HEIGHT,
    };
    return this.push(map[mode]);
  }

  // ── Alignment ─────────────────────────────────────────────

  alignLeft(): this { return this.push(CMD.ALIGN_LEFT); }
  alignCenter(): this { return this.push(CMD.ALIGN_CENTER); }
  alignRight(): this { return this.push(CMD.ALIGN_RIGHT); }

  // ── Text ──────────────────────────────────────────────────

  text(t: string): this { return this.push(textLine(t)); }

  textWrapped(t: string): this {
    for (const l of wrapWords(t, this.width)) this.push(textLine(l));
    return this;
  }

  center(t: string): this {
    return this.alignCenter().text(padCenter(t, this.width)).alignLeft();
  }

  boldCenter(t: string): this {
    return this.bold().alignCenter().size("double").text(padCenter(t, Math.floor(this.width / 2))).size().alignLeft().bold(false);
  }

  /** Two-column row: left label + right value */
  row(left: string, right: string): this {
    return this.text(padBetween(left, right, this.width));
  }

  boldRow(left: string, right: string): this {
    return this.bold().text(padBetween(left, right, this.width)).bold(false);
  }

  divider(char = "-"): this { return this.text(makeDivider(this.width, char)); }

  feed(n = 1): this {
    for (let i = 0; i < n; i++) this.push(CMD.LINE_FEED);
    return this;
  }

  // ── Barcode & QR ──────────────────────────────────────────

  /** Print a Code128 barcode */
  barcode(content: string, height = 60): this {
    return this.alignCenter().push(buildBarcodeCode128(content, height)).alignLeft();
  }

  /** Print a QR code (ESC/POS native) */
  qrCode(content: string, size = 5): this {
    return this.alignCenter().push(buildQrBytes(content, size)).alignLeft().feed(1);
  }

  // ── Image ─────────────────────────────────────────────────

  /** Print a pre-processed 1-bit image */
  image(img: PrintableImage): this {
    return this.alignCenter().push(buildImageBytes(img)).alignLeft();
  }

  // ── Hardware ──────────────────────────────────────────────

  /** Open cash drawer on pin 2 */
  openCashDrawer(pin: 1 | 2 = 1): this {
    return this.push(pin === 1 ? CMD.CASH_DRAWER_1 : CMD.CASH_DRAWER_2);
  }

  // ── Cut ───────────────────────────────────────────────────

  cut(feedLines = 4): this {
    return this.feed(feedLines).push(CMD.CUT_FULL);
  }

  partialCut(feedLines = 4): this {
    return this.feed(feedLines).push(CMD.CUT_PARTIAL);
  }

  // ── Build ─────────────────────────────────────────────────

  build(): Uint8Array {
    return concatBytes(...this.chunks);
  }
}

// ── Receipt builder ──────────────────────────────────────────

export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  note?: string;
};

export type ReceiptData = {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  cashierName?: string;
  orderId?: string;
  tableNo?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  cash: number;
  change: number;
  note?: string;
  footer?: string;
  paper?: PaperWidth;
  showQr?: string;       // show QR code with this content (e.g. order URL)
  showBarcode?: string;  // show barcode (order ID)
};

export function buildReceiptBytes(receipt: ReceiptData): Uint8Array {
  const paper = receipt.paper ?? "58";
  const b = new EscPosBuilder(paper);

  const ts = new Date();
  const dateStr = ts.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = ts.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // Header
  b.feed(1).boldCenter(receipt.shopName);
  if (receipt.shopAddress) b.center(receipt.shopAddress);
  if (receipt.shopPhone) b.center(receipt.shopPhone);
  b.feed(1).divider();

  // Meta
  b.row("Tanggal", `${dateStr} ${timeStr}`);
  if (receipt.orderId) b.row("No. Order", `#${receipt.orderId}`);
  if (receipt.tableNo) b.row("Meja", receipt.tableNo);
  if (receipt.cashierName) b.row("Kasir", receipt.cashierName);
  b.divider();

  // Items
  for (const item of receipt.items) {
    const total = item.qty * item.price;
    if (item.name.length <= 18) {
      b.row(`${item.qty}x ${item.name}`, formatCurrency(total, ""));
    } else {
      b.text(item.name);
      b.row(`  ${item.qty}x ${formatCurrency(item.price, "")}`, formatCurrency(total, ""));
    }
    if (item.note) b.text(`  * ${item.note}`);
  }
  b.divider();

  // Totals
  if (receipt.discount && receipt.discount > 0) {
    b.row("Subtotal", formatCurrency(receipt.subtotal, ""));
    b.row("Diskon", `-${formatCurrency(receipt.discount, "")}`);
  }
  if (receipt.tax && receipt.tax > 0) {
    b.row("Pajak", formatCurrency(receipt.tax, ""));
  }
  b.boldRow("TOTAL", formatCurrency(receipt.total, ""));
  b.row("TUNAI", formatCurrency(receipt.cash, ""));
  b.boldRow("KEMBALI", formatCurrency(receipt.change, ""));
  b.divider();

  // QR / Barcode
  if (receipt.showQr) b.qrCode(receipt.showQr, 4).feed(1);
  if (receipt.showBarcode) b.barcode(receipt.showBarcode).feed(1);

  // Note & footer
  if (receipt.note) b.center(receipt.note);
  b.center(receipt.footer ?? "Terima kasih atas kunjungan Anda!");
  b.cut();

  return b.build();
}
