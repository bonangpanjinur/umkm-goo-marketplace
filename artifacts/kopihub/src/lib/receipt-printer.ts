// Per-device receipt printer preset (paper size for thermal printer)
// + per-outlet/user printer selection.

import { supabase } from "@/integrations/supabase/client";

export type ReceiptPaper = "58" | "80";

const PAPER_KEY_BASE = "umkmgo.receiptPaper";
const PRINTER_KEY_BASE = "umkmgo.activePrinter";

function scoped(base: string, scopeKey?: string) {
  return scopeKey ? `${base}:${scopeKey}` : base;
}

/** Build a stable scope key from outlet + user. */
export function buildScopeKey(outletId?: string | null, userId?: string | null) {
  if (!outletId && !userId) return "";
  return `${outletId ?? "any"}:${userId ?? "any"}`;
}

export function getReceiptPaper(scopeKey?: string): ReceiptPaper {
  if (typeof window === "undefined") return "58";
  // Prefer scoped, fall back to global so existing devices stay consistent.
  const v =
    window.localStorage.getItem(scoped(PAPER_KEY_BASE, scopeKey)) ??
    window.localStorage.getItem(PAPER_KEY_BASE);
  return v === "80" ? "80" : "58";
}

export function setReceiptPaper(paper: ReceiptPaper, scopeKey?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scoped(PAPER_KEY_BASE, scopeKey), paper);
  // Keep global mirror so receipts opened on other pages match the most recent pick.
  window.localStorage.setItem(PAPER_KEY_BASE, paper);
  document.body.dataset.receiptPaper = paper;
}

/** Apply current preset to <body> so CSS rules take effect for both
 * the on-screen preview and the @media print output. */
export function applyReceiptPaper(paper?: ReceiptPaper, scopeKey?: string) {
  if (typeof document === "undefined") return;
  document.body.dataset.receiptPaper = paper ?? getReceiptPaper(scopeKey);
}

export function getActivePrinterId(scopeKey?: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(scoped(PRINTER_KEY_BASE, scopeKey));
}

export function setActivePrinterId(id: string | null, scopeKey?: string) {
  if (typeof window === "undefined") return;
  const k = scoped(PRINTER_KEY_BASE, scopeKey);
  if (id) window.localStorage.setItem(k, id);
  else window.localStorage.removeItem(k);
}

export type PrintResult = "ok" | "blocked" | "no-node";

/**
 * Inline CSS yang ditulis ke dalam popup print thermal. TIDAK menyalin
 * stylesheet dashboard supaya tidak terbawa warna/shadow Tailwind.
 */
function buildThermalCss(paper: ReceiptPaper): string {
  const widthMm = paper === "80" ? "80mm" : "58mm";
  const innerWidthMm = paper === "80" ? "72mm" : "50mm";
  const innerPad = paper === "80" ? "4mm" : "3mm";
  return `
    @page { size: ${widthMm} auto; margin: 0; }
    @media print {
      html, body {
        width: ${widthMm};
        margin: 0 !important;
        padding: 0 !important;
        background: #fff;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    html, body {
      width: ${widthMm};
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: ui-monospace, "Courier New", monospace;
      font-size: 11px;
      line-height: 1.35;
    }
    .receipt-container {
      width: ${innerWidthMm};
      padding: ${innerPad};
      box-sizing: border-box;
      margin: 0;
    }
    .receipt-container * {
      color: #000 !important;
      background: transparent !important;
      box-shadow: none !important;
      border-color: #000 !important;
      max-width: 100% !important;
    }
    .receipt-container img {
      max-width: 100%;
      filter: grayscale(1) contrast(1.2);
    }
    .no-print { display: none !important; }
  `;
}

export type PrintThermalOptions = {
  node: HTMLElement | null;
  paper?: ReceiptPaper;
  scopeKey?: string;
  /** default true */
  autoPrint?: boolean;
  /** default true */
  autoClose?: boolean;
  /** judul window popup */
  title?: string;
};

/**
 * Cetak struk via popup window khusus.
 * - TIDAK pernah memanggil window.print() di halaman dashboard.
 * - Inline CSS thermal kaku (58/80 mm), auto-print, auto-close.
 * - Mengembalikan "blocked" bila popup blocked → caller bisa fallback ke preview modal.
 */
export function printThermal(opts: PrintThermalOptions): PrintResult {
  const { node, paper: paperOpt, scopeKey, autoPrint = true, autoClose = true, title = "Cetak Struk" } = opts;
  if (!node) return "no-node";
  if (typeof window === "undefined" || typeof document === "undefined") return "blocked";

  const paper = paperOpt ?? getReceiptPaper(scopeKey);
  const css = buildThermalCss(paper);
  const innerHtml = node.outerHTML;

  // ====== PRIMARY: hidden iframe (tidak diblokir popup blocker) ======
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      throw new Error("no-iframe-doc");
    }

    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>${title}</title><style>${css}</style></head>
<body data-receipt-paper="${paper}"><div class="receipt-container">${innerHtml}</div></body></html>`;
    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      if (!autoClose) return;
      setTimeout(() => { try { iframe.remove(); } catch {} }, 500);
    };
    const doPrint = () => {
      try {
        win.focus();
        win.print();
        win.addEventListener("afterprint", cleanup, { once: true });
        setTimeout(cleanup, 10000);
      } catch {
        try { iframe.remove(); } catch {}
      }
    };

    if (autoPrint) {
      if (doc.readyState === "complete") {
        requestAnimationFrame(() => setTimeout(doPrint, 100));
      } else {
        win.addEventListener("load", () =>
          requestAnimationFrame(() => setTimeout(doPrint, 100)),
        );
        setTimeout(doPrint, 600);
      }
    }
    return "ok";
  } catch {
    // ====== FALLBACK: popup window ======
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) return "blocked";
    const closeScript = autoClose
      ? `window.addEventListener('afterprint',function(){try{window.close();}catch(e){}});setTimeout(function(){try{window.close();}catch(e){}},8000);`
      : "";
    const printScript = autoPrint
      ? `window.addEventListener('load',function(){requestAnimationFrame(function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},100);});});`
      : "";
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>${title}</title><style>${css}</style></head>
<body data-receipt-paper="${paper}"><div class="receipt-container">${innerHtml}</div>
<script>${printScript}${closeScript}<\/script></body></html>`;
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch {
      return "blocked";
    }
    return "ok";
  }
}

/**
 * Back-compat: dulu memakai trik `body * { visibility:hidden }` + window.print()
 * dari halaman dashboard (menyebabkan layout A4 & banyak whitespace).
 * Sekarang delegasi ke printThermal() yang membuka popup khusus.
 */
export function printReceiptNode(
  node: HTMLElement | null,
  paperSize?: ReceiptPaper,
  scopeKey?: string,
): PrintResult {
  return printThermal({ node, paper: paperSize, scopeKey });
}

/**
 * Back-compat: buka struk di tab baru, tanpa auto-print (untuk fallback / preview).
 */
export function openReceiptInNewWindow(
  node: HTMLElement | null,
  paperSize?: ReceiptPaper,
  scopeKey?: string,
): boolean {
  const res = printThermal({ node, paper: paperSize, scopeKey, autoPrint: false, autoClose: false });
  return res === "ok";
}

/**
 * Multi-Printer Support
 */
export type Printer = {
  id: string;
  name: string;
  type: string;
  connection_type: "browser" | "network" | "bluetooth" | "usb" | "wifi";
  address?: string;
  paper_size: ReceiptPaper;
};

export async function getOutletPrinters(outletId: string): Promise<Printer[]> {
  const { data, error } = await (supabase as any)
    .from("printers")
    .select("*")
    .eq("outlet_id", outletId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return [];
  return data as Printer[];
}

/**
 * Routes items to their respective printers based on category settings.
 */
export function routeItemsToPrinters(items: any[], printers: Printer[], categories: any[]) {
  const routing: Record<string, any[]> = {};

  items.forEach(item => {
    const category = categories.find(c => c.id === item.category_id);
    const printerId = category?.printer_id;
    const targetPrinter = printers.find(p => p.id === printerId) || printers.find(p => p.name.toLowerCase().includes("kasir")) || printers[0];

    if (targetPrinter) {
      if (!routing[targetPrinter.id]) routing[targetPrinter.id] = [];
      routing[targetPrinter.id].push(item);
    }
  });

  return routing;
}
