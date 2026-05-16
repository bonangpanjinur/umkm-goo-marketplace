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
 * Print a node using window.print(). Returns "blocked" when nothing
 * triggered (e.g. print dialog suppressed). Callers can show a fallback UI.
 */
export function printReceiptNode(
  node: HTMLElement | null,
  paperSize?: ReceiptPaper,
  scopeKey?: string,
): PrintResult {
  if (!node) return "no-node";
  applyReceiptPaper(paperSize, scopeKey);
  node.classList.add("print-area");
  let ok: PrintResult = "ok";
  try {
    // Best-effort detection: some browsers / extensions block window.print()
    // silently. We can't detect "user cancelled" vs "blocked", but we can
    // detect when print() throws or isn't available.
    if (typeof window === "undefined" || typeof window.print !== "function") {
      ok = "blocked";
    } else {
      window.print();
    }
  } catch {
    ok = "blocked";
  } finally {
    node.classList.remove("print-area");
  }
  return ok;
}

/**
 * Fallback: open the receipt HTML in a new tab the user can manually print.
 * Returns false when the popup was blocked.
 */
export function openReceiptInNewWindow(node: HTMLElement | null, paperSize?: ReceiptPaper, scopeKey?: string): boolean {
  if (!node || typeof window === "undefined") return false;
  applyReceiptPaper(paperSize, scopeKey);
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return false;
  // Inline current stylesheet links so the receipt renders identically.
  const styleLinks = Array.from(document.querySelectorAll("link[rel=stylesheet], style"))
    .map((el) => el.outerHTML)
    .join("\n");
  const paper = paperSize ?? getReceiptPaper(scopeKey);
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Struk</title>${styleLinks}</head><body data-receipt-paper="${paper}">${node.outerHTML}<script>setTimeout(()=>window.print(),250);</script></body></html>`);
  w.document.close();
  return true;
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
