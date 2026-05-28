// ============================================================
// ESC/POS command builder — pure byte utilities
// No DOM, no browser APIs — just raw Uint8Array construction.
// Compatible: 58mm (32 chars) and 80mm (48 chars) thermal printers
// ============================================================

export type PaperWidth = "58" | "80";

export const PAPER_CHARS: Record<PaperWidth, number> = {
  "58": 32,
  "80": 48,
};

// ── Control bytes ────────────────────────────────────────────
export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;
export const CR = 0x0d;
export const HT = 0x09;

// ── ESC/POS command constants ────────────────────────────────
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
  LINE_FEED: new Uint8Array([LF]),
  FEED_3: new Uint8Array([LF, LF, LF]),
  FEED_4: new Uint8Array([LF, LF, LF, LF]),
} as const;

// ── Helpers ──────────────────────────────────────────────────

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Encode string to CP437-compatible bytes.
 * Non-ASCII characters are transliterated to closest ASCII or replaced with '?'.
 */
function encodeText(text: string): Uint8Array {
  const translitMap: Record<string, string> = {
    à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a",
    è: "e", é: "e", ê: "e", ë: "e",
    ì: "i", í: "i", î: "i", ï: "i",
    ò: "o", ó: "o", ô: "o", õ: "o", ö: "o",
    ù: "u", ú: "u", û: "u", ü: "u",
    ç: "c", ñ: "n",
    À: "A", Á: "A", Â: "A", Ã: "A", Ä: "A", Å: "A",
    È: "E", É: "E", Ê: "E", Ë: "E",
    Ì: "I", Í: "I", Î: "I", Ï: "I",
    Ò: "O", Ó: "O", Ô: "O", Õ: "O", Ö: "O",
    Ù: "U", Ú: "U", Û: "U", Ü: "U",
    Ç: "C", Ñ: "N",
  };
  const normalized = text
    .split("")
    .map((c) => translitMap[c] ?? c)
    .join("");
  const out = new Uint8Array(normalized.length);
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    out[i] = code < 256 ? code : 0x3f;
  }
  return out;
}

function line(text: string): Uint8Array {
  return concat(encodeText(text), CMD.LINE_FEED);
}

// ── Formatting helpers ───────────────────────────────────────

export function formatCurrency(amount: number, prefix = "Rp"): string {
  return `${prefix} ${amount.toLocaleString("id-ID")}`;
}

export function makeDivider(width: number, char = "-"): string {
  return char.repeat(width);
}

export function padBetween(left: string, right: string, width: number): string {
  left = left.trim();
  right = right.trim();
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

export function padCenter(text: string, width: number): string {
  text = text.trim();
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}

export function padRight(text: string, width: number): string {
  text = text.trim();
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}

function wrapText(text: string, width: number): string[] {
  text = text.trim();
  if (text.length <= width) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      if (word.length > width) {
        lines.push(current);
        current = word.slice(width);
      }
    } else if ((current + " " + word).length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

// ── EscPosBuilder — fluent API ───────────────────────────────

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];
  private width: number;

  constructor(paper: PaperWidth = "58") {
    this.width = PAPER_CHARS[paper];
    this.push(CMD.INIT, CMD.FONT_A, CMD.SIZE_NORMAL);
  }

  private push(...parts: Uint8Array[]): this {
    for (const p of parts) this.chunks.push(p);
    return this;
  }

  // ── Text styles ──────────────────────────────────────────

  bold(on = true): this {
    return this.push(on ? CMD.BOLD_ON : CMD.BOLD_OFF);
  }

  underline(on = true): this {
    return this.push(on ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF);
  }

  size(mode: "normal" | "double" | "doubleWidth" | "doubleHeight" = "normal"): this {
    const map = {
      normal: CMD.SIZE_NORMAL,
      double: CMD.SIZE_DOUBLE,
      doubleWidth: CMD.SIZE_DOUBLE_WIDTH,
      doubleHeight: CMD.SIZE_DOUBLE_HEIGHT,
    };
    return this.push(map[mode]);
  }

  // ── Alignment ────────────────────────────────────────────

  alignLeft(): this { return this.push(CMD.ALIGN_LEFT); }
  alignCenter(): this { return this.push(CMD.ALIGN_CENTER); }
  alignRight(): this { return this.push(CMD.ALIGN_RIGHT); }

  // ── Text output ──────────────────────────────────────────

  /** Print raw text followed by LF */
  text(text: string): this {
    return this.push(line(text));
  }

  /** Print text wrapped to paper width */
  textWrapped(text: string): this {
    const lines = wrapText(text, this.width);
    for (const l of lines) this.push(line(l));
    return this;
  }

  /** Print centered text */
  center(text: string): this {
    return this.alignCenter().text(padCenter(text, this.width)).alignLeft();
  }

  /** Print bold centered text (useful for shop name) */
  boldCenter(text: string): this {
    return this.bold(true).alignCenter().text(padCenter(text, this.width)).alignLeft().bold(false);
  }

  /** Print a full-width divider line */
  divider(char = "-"): this {
    return this.text(makeDivider(this.width, char));
  }

  /** Print two-column row: left text + right value */
  row(left: string, right: string): this {
    return this.text(padBetween(left, right, this.width));
  }

  /** Print a two-column row with bold formatting */
  boldRow(left: string, right: string): this {
    return this.bold(true).text(padBetween(left, right, this.width)).bold(false);
  }

  /** Print a blank line */
  feed(n = 1): this {
    for (let i = 0; i < n; i++) this.push(CMD.LINE_FEED);
    return this;
  }

  // ── Cut ──────────────────────────────────────────────────

  /** Feed + full cut (printers without cutter will ignore the cut command) */
  cut(feed = 4): this {
    this.feed(feed);
    return this.push(CMD.CUT_FULL);
  }

  /** Feed + partial cut */
  partialCut(feed = 4): this {
    this.feed(feed);
    return this.push(CMD.CUT_PARTIAL);
  }

  // ── Build ────────────────────────────────────────────────

  build(): Uint8Array {
    return concat(...this.chunks);
  }
}
